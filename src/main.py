import os
from datetime import datetime, timedelta, timezone
import hashlib

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import bcrypt
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError
from typing import List, Optional, Union
import json
import asyncio
from .newsdata_client import NewsDataClient
from .database import get_db, init_db
from .models import SavedArticle, SearchHistory, User, UserInterest, UserLocation

# Initialize FastAPI app
app = FastAPI(
    title="News Recommender API",
    description="A news recommendation system using NewsData.io API with LLM categorization",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize NewsData client with LLM categorization
NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
news_client = NewsDataClient(
    api_key=NEWSDATA_API_KEY,
    use_llm=bool(OPENAI_API_KEY),
    openai_api_key=OPENAI_API_KEY
)

FEED_CACHE: dict = {}
FEED_CACHE_MAX_ITEMS = int(os.getenv("FEED_CACHE_MAX_ITEMS", "50"))
FEED_CACHE_TTL_SECONDS = int(os.getenv("FEED_CACHE_TTL_SECONDS", "1800"))
FEED_UPSTREAM_ATTEMPTS = int(os.getenv("FEED_UPSTREAM_ATTEMPTS", "4"))
FEED_UPSTREAM_RETRY_DELAY_SECONDS = float(os.getenv("FEED_UPSTREAM_RETRY_DELAY_SECONDS", "2.0"))
FEED_UPSTREAM_BACKOFF_MULTIPLIER = float(os.getenv("FEED_UPSTREAM_BACKOFF_MULTIPLIER", "2.0"))

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/signin")

# Request models
class SearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    interests: Optional[List[str]] = None
    user_email: Optional[str] = None
    country: Optional[str] = None
    language: str = "en"
    top_k: int = 10
    page: int = 1
    per_page: int = 12

class HeadlinesRequest(BaseModel):
    category: Optional[str] = None
    country: Optional[str] = None
    language: str = "en"
    top_k: int = 10


class UserLocationPayload(BaseModel):
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[Union[str, float]] = None
    longitude: Optional[Union[str, float]] = None
    timezone: Optional[str] = None


class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    location: Optional[UserLocationPayload] = None


class SignInRequest(BaseModel):
    email: str
    password: str
    location: Optional[UserLocationPayload] = None


class AuthResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user: dict


class UpdateInterestsRequest(BaseModel):
    interests: List[str]


class AddHistoryRequest(BaseModel):
    query: str
    results_count: int = 0


class UpdateProfileRequest(BaseModel):
    name: str


class UpdateLocationRequest(BaseModel):
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[Union[str, float]] = None
    longitude: Optional[Union[str, float]] = None
    timezone: Optional[str] = None


class SaveBookmarkRequest(BaseModel):
    title: str
    description: str = ""
    url: str
    source: str = "Unknown"
    image_url: str = ""

def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_country_code(country: Optional[str]) -> str:
    value = (country or "").strip().lower()
    if len(value) != 2 or not value.isalpha():
        return ""
    return value


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _normalize_stored_password(password_hash: Optional[str]) -> str:
    value = (password_hash or "").strip()

    # Handle accidentally persisted bytes repr strings like b'...'
    if (value.startswith("b'") and value.endswith("'")) or (value.startswith('b"') and value.endswith('"')):
        value = value[2:-1]

    return value


def _is_bcrypt_hash(password_hash: str) -> bool:
    return password_hash.startswith("$2a$") or password_hash.startswith("$2b$") or password_hash.startswith("$2y$")


def _is_sha256_hex(password_hash: str) -> bool:
    value = password_hash.strip().lower()
    if len(value) != 64:
        return False
    return all(ch in "0123456789abcdef" for ch in value)


def _verify_password(plain_password: str, password_hash: str) -> bool:
    stored = _normalize_stored_password(password_hash)
    if not stored:
        return False

    if _is_bcrypt_hash(stored):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), stored.encode("utf-8"))
        except ValueError:
            return False

    if _is_sha256_hex(stored):
        return hashlib.sha256(plain_password.encode("utf-8")).hexdigest() == stored.lower()

    # Legacy fallback for old plaintext rows; upgraded to bcrypt on successful login.
    return plain_password == stored


def _needs_password_upgrade(password_hash: str) -> bool:
    stored = _normalize_stored_password(password_hash)
    return bool(stored) and not _is_bcrypt_hash(stored)


def _create_access_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": email,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _get_user_by_email(db: Session, email: str) -> Optional[User]:
    normalized_email = _normalize_email(email)
    return db.query(User).filter(User.email == normalized_email).first()


def _to_location_text(value: Optional[Union[str, float]]) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text[:120]


def _has_location_values(payload: UserLocationPayload) -> bool:
    country_code = _normalize_country_code(payload.country_code)
    if country_code:
        return True

    fields = [
        payload.country_name,
        payload.region,
        payload.city,
        payload.latitude,
        payload.longitude,
        payload.timezone,
    ]
    return any(_to_location_text(value) for value in fields)


def _upsert_user_location(db: Session, user_id: int, payload: Optional[UserLocationPayload]) -> None:
    if payload is None:
        return
    if not _has_location_values(payload):
        return

    country_code = _normalize_country_code(payload.country_code)
    try:
        location = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()
    except ProgrammingError:
        db.rollback()
        init_db()
        location = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()

    if not location:
        location = UserLocation(user_id=user_id)
        db.add(location)

    if country_code:
        location.country_code = country_code
    location.country_name = _to_location_text(payload.country_name)
    location.region = _to_location_text(payload.region)
    location.city = _to_location_text(payload.city)
    location.latitude = _to_location_text(payload.latitude)
    location.longitude = _to_location_text(payload.longitude)
    location.timezone = _to_location_text(payload.timezone)[:64]


def _get_user_country_by_email(db: Session, email: Optional[str]) -> str:
    if not email:
        return ""

    try:
        user = _get_user_by_email(db, email)
        if not user or not user.location:
            return ""
        return _normalize_country_code(user.location.country_code)
    except ProgrammingError:
        db.rollback()
        return ""


def _get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = _get_user_by_email(db, email)
    if not user:
        raise credentials_exception
    return user


def _enforce_user_scope(path_email: str, current_user: User) -> None:
    if _normalize_email(path_email) != _normalize_email(current_user.email):
        raise HTTPException(status_code=403, detail="Forbidden")


def _extract_history_terms(db: Session, email: Optional[str], limit: int = 8) -> List[str]:
    if not email:
        return []

    user = _get_user_by_email(db, email)
    if not user:
        return []

    entries = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user.id)
        .order_by(SearchHistory.searched_at.desc())
        .limit(limit)
        .all()
    )

    terms = []
    seen = set()
    for item in entries:
        for token in item.query.lower().split():
            token = token.strip()
            if len(token) < 3:
                continue
            if token in seen:
                continue
            seen.add(token)
            terms.append(token)
            if len(terms) >= limit:
                return terms
    return terms


def _article_dedupe_key(article: dict) -> str:
    title = (article.get("title") or "").strip().lower()
    description = (article.get("description") or "").strip().lower()[:160]
    url = (article.get("url") or "").strip().lower()
    return f"{title}|{description}|{url}"


def _dedupe_articles(articles: List[dict]) -> List[dict]:
    deduped = []
    seen = set()
    for article in articles:
        key = _article_dedupe_key(article)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(article)
    return deduped


def _source_key(article: dict) -> str:
    source = article.get("source")
    if isinstance(source, dict):
        source = source.get("name")
    return (source or "unknown").strip().lower()


def _select_with_source_cap(
    articles: List[dict],
    max_items: int,
    max_per_source: int,
    existing_source_counts: Optional[dict] = None,
    relax_if_needed: bool = True,
) -> List[dict]:
    if max_items <= 0:
        return []

    selected: List[dict] = []
    skipped: List[dict] = []
    source_counts = dict(existing_source_counts or {})

    for article in articles:
        if len(selected) >= max_items:
            break

        source = _source_key(article)
        count = source_counts.get(source, 0)
        if count >= max_per_source:
            skipped.append(article)
            continue

        selected.append(article)
        source_counts[source] = count + 1

    if relax_if_needed and len(selected) < max_items:
        for article in skipped:
            if len(selected) >= max_items:
                break
            selected.append(article)

    return selected


def _build_feed_cache_key(request: SearchRequest, db: Session) -> str:
    interests = request.interests or []
    history_terms = _extract_history_terms(db, request.user_email)
    resolved_country = _normalize_country_code(request.country) or _get_user_country_by_email(db, request.user_email)
    cache_payload = {
        "query": (request.query or "news").strip().lower(),
        "category": (request.category or "").strip().lower(),
        "interests": sorted([item.strip().lower() for item in interests if item]),
        "history_terms": sorted([item.strip().lower() for item in history_terms if item]),
        "country": resolved_country,
        "language": (request.language or "en").strip().lower(),
    }
    return json.dumps(cache_payload, sort_keys=True)


def _build_cached_feed_page(cached_response: dict, page: int, per_page: int, upstream_errors: Optional[List[str]] = None) -> dict:
    all_articles = cached_response.get("all_articles") or cached_response.get("articles") or []
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    page_articles = all_articles[start_idx:end_idx]

    response = dict(cached_response)
    response["articles"] = page_articles
    response["live_recommendations"] = page_articles
    response["count"] = len(all_articles)
    response["page"] = page
    response["per_page"] = per_page
    response["has_more"] = len(all_articles) > end_idx
    response["cached_feed"] = True
    if upstream_errors is not None:
        response["upstream_errors"] = upstream_errors
    return response


def _get_cached_feed(cache_key: str) -> Optional[dict]:
    cached = FEED_CACHE.get(cache_key)
    if not cached:
        return None

    stored_at = cached.get("stored_at")
    if not stored_at:
        return None

    age_seconds = (datetime.now(timezone.utc) - stored_at).total_seconds()
    if age_seconds > FEED_CACHE_TTL_SECONDS:
        FEED_CACHE.pop(cache_key, None)
        return None

    return cached.get("response")


def _store_cached_feed(cache_key: str, response_data: dict) -> None:
    if len(FEED_CACHE) >= FEED_CACHE_MAX_ITEMS:
        oldest_key = min(FEED_CACHE.items(), key=lambda item: item[1].get("stored_at", datetime.now(timezone.utc)))[0]
        FEED_CACHE.pop(oldest_key, None)

    FEED_CACHE[cache_key] = {
        "stored_at": datetime.now(timezone.utc),
        "response": response_data,
    }


@app.post("/api/feed")
async def get_personalized_feed(request: SearchRequest, db: Session = Depends(get_db)):
    try:
        interests = request.interests or []
        history_terms = _extract_history_terms(db, request.user_email)
        resolved_country = _normalize_country_code(request.country) or _get_user_country_by_email(db, request.user_email)
        cache_key = _build_feed_cache_key(request, db)

        focus_tokens = []
        seen_tokens = set()
        for token in interests + history_terms:
            normalized = token.strip().lower()
            if not normalized or normalized in seen_tokens:
                continue
            seen_tokens.add(normalized)
            focus_tokens.append(token)
            if len(focus_tokens) >= 10:
                break

        focus_query = " ".join(focus_tokens) if focus_tokens else (request.query or "news")
        required_total = request.page * request.per_page
        personalized_fetch_size = max(20, required_total + 12)
        general_fetch_size = max(30, required_total + 25)

        async def _search_news_with_buffer(**kwargs) -> dict:
            attempts = max(1, FEED_UPSTREAM_ATTEMPTS)
            fallback_result = {
                "status": "error",
                "message": "No upstream response",
                "articles": [],
            }
            retry_delay = max(0.0, FEED_UPSTREAM_RETRY_DELAY_SECONDS)

            for attempt_index in range(attempts):
                result = news_client.search_news(**kwargs)
                if result.get("status") != "error" and result.get("articles"):
                    return result

                fallback_result = result
                if attempt_index < attempts - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay = retry_delay * max(1.0, FEED_UPSTREAM_BACKOFF_MULTIPLIER)

            return fallback_result

        personalized_result = await _search_news_with_buffer(
            query=focus_query,
            interests=interests,
            country=resolved_country,
            language=request.language,
            page_size=personalized_fetch_size,
            page=1,
            per_page=personalized_fetch_size,
        )
        personalized_error = personalized_result.get("status") == "error"

        general_result = {"status": "success", "articles": []}
        general_error = False

        # If upstream is throttling, avoid a second request that will likely fail too.
        if not personalized_error:
            general_result = await _search_news_with_buffer(
                query="latest news",
                interests=None,
                country=resolved_country,
                language=request.language,
                page_size=general_fetch_size,
                page=1,
                per_page=general_fetch_size,
            )
            general_error = general_result.get("status") == "error"
        else:
            personalized_message = (personalized_result.get("message") or "").lower()
            if "429" not in personalized_message and "too many requests" not in personalized_message:
                general_result = await _search_news_with_buffer(
                    query="latest news",
                    interests=None,
                    country=resolved_country,
                    language=request.language,
                    page_size=general_fetch_size,
                    page=1,
                    per_page=general_fetch_size,
                )
                general_error = general_result.get("status") == "error"

        personalized_articles = sorted(
            _dedupe_articles(personalized_result.get("articles", [])),
            key=lambda item: item.get("final_score", 0),
            reverse=True,
        )
        general_articles = _dedupe_articles(general_result.get("articles", []))

        personalized_lead = min(8, request.per_page)
        if request.per_page >= 6:
            personalized_lead = min(8, max(6, personalized_lead))

        lead_personalized = _select_with_source_cap(
            personalized_articles,
            max_items=personalized_lead,
            max_per_source=2,
            relax_if_needed=True,
        )
        lead_keys = {_article_dedupe_key(article) for article in lead_personalized}

        lead_source_counts = {}
        for article in lead_personalized:
            source = _source_key(article)
            lead_source_counts[source] = lead_source_counts.get(source, 0) + 1

        filtered_general = [
            article for article in general_articles
            if _article_dedupe_key(article) not in lead_keys
        ]

        balanced_general = _select_with_source_cap(
            filtered_general,
            max_items=len(filtered_general),
            max_per_source=2,
            existing_source_counts=lead_source_counts,
            relax_if_needed=True,
        )

        combined = _dedupe_articles(lead_personalized + balanced_general)
        start_idx = (request.page - 1) * request.per_page
        end_idx = start_idx + request.per_page
        page_articles = combined[start_idx:end_idx]

        has_more = len(combined) > end_idx

        errors = []
        if personalized_error:
            errors.append(personalized_result.get("message", "Personalized feed failed"))
        if general_error:
            errors.append(general_result.get("message", "General feed failed"))

        live_response = {
            "query": focus_query,
            "count": len(combined),
            "articles": page_articles,
            "live_recommendations": page_articles,
            "page": request.page,
            "per_page": request.per_page,
            "has_more": has_more,
            "personalized_lead": min(personalized_lead, len(lead_personalized)),
            "source_diversity_enabled": True,
            "history_terms_used": history_terms,
            "country": resolved_country,
            "api_source": "newsdata.io",
            "llm_categorized": True,
            "upstream_errors": errors,
        }

        cache_payload = {
            "query": focus_query,
            "count": len(combined),
            "all_articles": combined,
            "articles": combined,
            "live_recommendations": combined,
            "page": 1,
            "per_page": request.per_page,
            "has_more": len(combined) > request.per_page,
            "personalized_lead": min(personalized_lead, len(lead_personalized)),
            "source_diversity_enabled": True,
            "history_terms_used": history_terms,
            "country": resolved_country,
            "api_source": "newsdata.io",
            "llm_categorized": True,
            "upstream_errors": errors,
        }

        if combined:
            _store_cached_feed(cache_key, cache_payload)

        if page_articles:
            return live_response

        cached_response = _get_cached_feed(cache_key)
        if cached_response:
            cached_errors = errors or ["Using cached feed due to upstream rate limit"]
            return _build_cached_feed_page(cached_response, request.page, request.per_page, cached_errors)

        return live_response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def _provision_user_if_missing(db: Session, email: str, name: Optional[str] = None) -> User:
    user = _get_user_by_email(db, email)
    if user:
        return user

    normalized_email = _normalize_email(email)
    fallback_name = name.strip() if name and name.strip() else normalized_email.split("@")[0] or "User"
    placeholder_hash = _hash_password(f"{normalized_email}:autoprovision")

    user = User(
        name=fallback_name,
        email=normalized_email,
        password_hash=placeholder_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.post("/api/auth/signup")
async def sign_up(request: SignUpRequest, db: Session = Depends(get_db)):
    existing_user = _get_user_by_email(db, request.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=request.name.strip() or "User",
        email=_normalize_email(request.email),
        password_hash=_hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _upsert_user_location(db, user.id, request.location)
    db.commit()

    token = _create_access_token(user.email)

    return {
        "message": "Account created successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "country": user.location.country_code if user.location else "",
        },
    }


@app.post("/api/auth/signin")
async def sign_in(request: SignInRequest, db: Session = Depends(get_db)):
    user = _get_user_by_email(db, request.email)
    if not user or not _verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if _needs_password_upgrade(user.password_hash):
        user.password_hash = _hash_password(request.password)

    _upsert_user_location(db, user.id, request.location)
    db.commit()
    db.refresh(user)

    token = _create_access_token(user.email)

    return {
        "message": "Sign in successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "country": user.location.country_code if user.location else "",
        },
    }


@app.post("/auth/signup")
async def sign_up_alias(request: SignUpRequest, db: Session = Depends(get_db)):
    return await sign_up(request, db)


@app.post("/auth/signin")
async def sign_in_alias(request: SignInRequest, db: Session = Depends(get_db)):
    return await sign_in(request, db)


@app.put("/api/users/{email}/profile")
async def update_profile(
    email: str,
    request: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email, request.name)

    user.name = request.name.strip() or user.name
    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.get("/api/users/{email}/location")
async def get_user_location(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    location = user.location
    return {
        "email": user.email,
        "location": {
            "country_code": location.country_code if location else "",
            "country_name": location.country_name if location else "",
            "region": location.region if location else "",
            "city": location.city if location else "",
            "latitude": location.latitude if location else "",
            "longitude": location.longitude if location else "",
            "timezone": location.timezone if location else "",
        },
    }


@app.put("/api/users/{email}/location")
async def update_user_location(
    email: str,
    request: UpdateLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    location_payload = UserLocationPayload(
        country_code=request.country_code,
        country_name=request.country_name,
        region=request.region,
        city=request.city,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone=request.timezone,
    )
    _upsert_user_location(db, user.id, location_payload)
    db.commit()
    db.refresh(user)

    location = user.location
    return {
        "message": "Location updated",
        "location": {
            "country_code": location.country_code if location else "",
            "country_name": location.country_name if location else "",
            "region": location.region if location else "",
            "city": location.city if location else "",
            "latitude": location.latitude if location else "",
            "longitude": location.longitude if location else "",
            "timezone": location.timezone if location else "",
        },
    }


@app.get("/api/users/{email}/interests")
async def get_user_interests(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    interests = [entry.interest for entry in user.interests]
    return {
        "email": user.email,
        "interests": interests,
    }


@app.put("/api/users/{email}/interests")
async def update_user_interests(
    email: str,
    request: UpdateInterestsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    normalized_interests = []
    seen = set()
    for interest in request.interests:
        cleaned = interest.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            normalized_interests.append(cleaned)

    db.query(UserInterest).filter(UserInterest.user_id == user.id).delete()
    for interest in normalized_interests:
        db.add(UserInterest(user_id=user.id, interest=interest))
    db.commit()

    return {
        "message": "Interests updated",
        "interests": normalized_interests,
    }


@app.get("/api/users/{email}/history")
async def get_user_history(
    email: str,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    entries = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user.id)
        .order_by(SearchHistory.searched_at.desc())
        .limit(limit)
        .all()
    )
    history = [
        {
            "id": item.id,
            "query": item.query,
            "timestamp": item.searched_at.isoformat(),
            "resultsCount": item.results_count,
        }
        for item in entries
    ]

    return {
        "email": user.email,
        "history": history,
    }


@app.post("/api/users/{email}/history")
async def add_user_history(
    email: str,
    request: AddHistoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    history = SearchHistory(
        user_id=user.id,
        query=request.query.strip(),
        results_count=max(0, request.results_count),
    )
    db.add(history)
    db.commit()
    db.refresh(history)

    return {
        "message": "History saved",
        "history": {
            "id": history.id,
            "query": history.query,
            "timestamp": history.searched_at.isoformat(),
            "resultsCount": history.results_count,
        },
    }


@app.delete("/api/users/{email}/history")
async def clear_user_history(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    db.query(SearchHistory).filter(SearchHistory.user_id == user.id).delete()
    db.commit()
    return {"message": "History cleared"}


@app.get("/api/users/{email}/bookmarks")
async def get_user_bookmarks(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    bookmarks = (
        db.query(SavedArticle)
        .filter(SavedArticle.user_id == user.id)
        .order_by(SavedArticle.saved_at.desc())
        .all()
    )
    return {
        "email": user.email,
        "bookmarks": [
            {
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "url": item.url,
                "source": item.source,
                "image_url": item.image_url,
                "saved_at": item.saved_at.isoformat(),
            }
            for item in bookmarks
        ],
    }


@app.post("/api/users/{email}/bookmarks")
async def save_user_bookmark(
    email: str,
    request: SaveBookmarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    existing = (
        db.query(SavedArticle)
        .filter(SavedArticle.user_id == user.id, SavedArticle.url_hash == _url_hash(request.url))
        .first()
    )
    if existing:
        return {"message": "Bookmark already exists", "bookmark_id": existing.id}

    bookmark = SavedArticle(
        user_id=user.id,
        title=request.title.strip() or "Untitled",
        description=request.description or "",
        url=request.url,
        url_hash=_url_hash(request.url),
        source=request.source or "Unknown",
        image_url=request.image_url or "",
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return {"message": "Bookmark saved", "bookmark_id": bookmark.id}


@app.delete("/api/users/{email}/bookmarks")
async def remove_user_bookmark(
    email: str,
    url: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    _enforce_user_scope(email, current_user)
    user = _provision_user_if_missing(db, email)

    bookmark = (
        db.query(SavedArticle)
        .filter(SavedArticle.user_id == user.id, SavedArticle.url_hash == _url_hash(url))
        .first()
    )
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bookmark)
    db.commit()
    return {"message": "Bookmark removed"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "News Recommender API v2.0",
        "description": "News recommendation system using NewsData.io API with LLM categorization",
        "features": [
            "Real-time news search with relevance scoring",
            "LLM-powered categorization",
            "Smart deduplication",
            "Streaming search results",
            "Multiple language support"
        ],
        "endpoints": {
            "search": "/api/search",
            "headlines": "/api/headlines", 
            "categories": "/api/categories",
            "health": "/api/health"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "api_version": "2.0.0",
        "newsdata_api": "connected",
        "features": {
            "llm_categorization": bool(OPENAI_API_KEY),
            "relevance_scoring": True,
            "streaming": True,
            "deduplication": True
        }
    }

@app.post("/api/search")
async def search_articles(request: SearchRequest):
    """
    Search for articles using NewsData.io API with LLM categorization and relevance scoring
    """
    try:
        result = news_client.search_news(
            query=request.query,
            category=request.category,
            country=request.country,
            language=request.language,
            page_size=request.top_k,
            interests=request.interests,
            page=request.page,
            per_page=request.per_page
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return {
            "query": request.query,
            "category": request.category,
            "country": _normalize_country_code(request.country),
            "count": result["total"],
            "articles": result["articles"],
            "live_recommendations": result["articles"],
            "category_distribution": result.get("category_distribution", {}),
            "page": result.get("page", request.page),
            "per_page": result.get("per_page", request.per_page),
            "has_more": result.get("has_more", False),
            "api_source": "newsdata.io",
            "llm_categorized": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search/stream")
async def search_articles_stream(request: SearchRequest):
    """
    Search for articles using NewsData.io API with streaming - returns articles as they're found
    """
    try:
        async def generate_articles():
            # Send initial response
            yield f"data: {json.dumps({'type': 'start', 'message': 'Starting search...'})}\n\n"
            
            # Get all articles at once (NewsData.io doesn't support streaming)
            result = news_client.search_news(
                query=request.query,
                category=request.category,
                country=request.country,
                language=request.language,
                page_size=request.top_k
            )
            
            if result["status"] == "error":
                yield f"data: {json.dumps({'type': 'error', 'message': result['message']})}\n\n"
                return
            
            # Stream articles one by one
            article_count = 0
            for article in result["articles"]:
                article_count += 1
                
                # Send article as soon as it's found
                article_data = {
                    'type': 'article',
                    'article': article,
                    'count': article_count
                }
                yield f"data: {json.dumps(article_data)}\n\n"
                
                # Small delay to simulate streaming effect
                await asyncio.sleep(0.3)
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete', 'total_articles': article_count})}\n\n"
        
        return StreamingResponse(
            generate_articles(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/headlines")
async def get_top_headlines(request: HeadlinesRequest):
    """
    Get top headlines from NewsData.io API
    """
    try:
        result = news_client.get_top_headlines(
            category=request.category,
            country=request.country,
            language=request.language,
            page_size=request.top_k
        )
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return {
            "category": request.category,
            "country": _normalize_country_code(request.country),
            "count": result["total"],
            "articles": result["articles"],
            "api_source": "newsdata.io",
            "llm_categorized": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories")
async def get_categories():
    """Get available news categories"""
    return {
        "categories": news_client.get_categories(),
        "llm_categories": [
            "politics", "business", "technology", "sports", 
            "health", "science", "entertainment", "general"
        ]
    }

@app.post("/api/cache/clear")
async def clear_cache():
    """Clear article deduplication cache"""
    news_client.clear_cache()
    return {"message": "Cache cleared successfully"}

# Legacy endpoints for compatibility
@app.post("/api/recommend")
async def get_recommendations(request: SearchRequest):
    """
    Get recommendations (alias for search with enhanced scoring)
    """
    return await search_articles(request)

@app.get("/api/trending")
async def get_trending(category: Optional[str] = None, top_k: int = 10):
    """
    Get trending news (alias for headlines)
    """
    headlines_request = HeadlinesRequest(category=category, top_k=top_k)
    return await get_top_headlines(headlines_request)

@app.get("/api/top-headlines")
async def get_top_headlines_get(category: Optional[str] = None, language: str = "en", top_k: int = 20):
    """
    Get top headlines (GET method for compatibility)
    """
    headlines_request = HeadlinesRequest(
        category=category,
        language=language,
        top_k=top_k
    )
    return await get_top_headlines(headlines_request)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    print("🚀 Starting News Recommender API v2.0")
    print("📡 Using NewsData.io API with LLM categorization")
    print(f"🌐 Server will be available at: http://localhost:{port}")
    print(f"📖 API docs: http://localhost:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
