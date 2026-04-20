import requests
import json
import re
from typing import List, Dict, Optional
from datetime import datetime, timezone
import hashlib
import time
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from .llm_categorizer import LLMCategorizer
import os

class NewsDataClient:
    def __init__(self, api_key: str, use_llm: bool = True, openai_api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://newsdata.io/api/1/news"
        self.max_page_size = int(os.getenv("NEWSDATA_MAX_PAGE_SIZE", "10"))
        self.categories = [
            "business", "entertainment", "environment", "food", 
            "health", "politics", "science", "sports", "technology", 
            "top", "world"
        ]
        self.category_aliases = {
            "technology": "technology",
            "tech": "technology",
            "business": "business",
            "finance": "business",
            "sports": "sports",
            "entertainment": "entertainment",
            "health": "health",
            "science": "science",
            "politics": "politics",
            "world": "world",
            "world news": "world",
            "news": "top",
            "top": "top",
            "food": "food",
            "environment": "environment",
            "lifestyle": "general",
            "travel": "general",
            "general": "top",
        }
        
        # Initialize SBERT for similarity scoring
        print("Loading SBERT model for similarity scoring...")
        self.sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize LLM Categorizer
        self.llm_categorizer = LLMCategorizer(
            model="gpt-4o-mini",
            api_key=openai_api_key
        ) if use_llm else None
        
        # Cache for deduplication
        self.seen_urls = set()
        self.seen_titles = set()
        self.seen_content_hashes = set()
        self.search_sessions = {}

    def _normalize_text(self, value: str) -> str:
        cleaned = (value or "").lower().strip()
        cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned

    def _article_signature(self, title: str, description: str) -> str:
        title_key = self._normalize_text(title)
        desc_key = self._normalize_text(description)[:160]
        return f"{title_key}|{desc_key}"

    def _normalize_category(self, category: Optional[str]) -> Optional[str]:
        if not category:
            return None

        normalized = category.strip().lower()
        return self.category_aliases.get(normalized, normalized)

    def _is_newsdata_category(self, category: Optional[str]) -> bool:
        return bool(category) and category in self.categories and category not in {"top", "general"}

    def _resolve_category_from_interests(self, query: str, interests: Optional[List[str]]) -> Optional[str]:
        if self.llm_categorizer:
            if interests:
                allowed_categories = [
                    cat for cat in {
                        self._normalize_category(interest) for interest in interests
                    } if cat in self.categories
                ]
                if not allowed_categories:
                    allowed_categories = self.categories

                classification = self.llm_categorizer.classify_category(
                    query,
                    allowed_categories,
                    context=", ".join(interests),
                )
            else:
                classification = self.llm_categorizer.classify_category(query, self.categories)

            category = classification.get("category")
            if category in self.categories:
                return category

        if interests:
            for interest in interests:
                mapped = self._normalize_category(interest)
                if mapped in self.categories:
                    return mapped

        return None

    def _build_search_key(self, query: str, language: str, category: Optional[str], interests: Optional[List[str]]) -> str:
        normalized_interests = sorted([i.lower().strip() for i in (interests or []) if i])
        return json.dumps({
            "query": query.strip().lower(),
            "language": language.strip().lower(),
            "category": (category or "").strip().lower(),
            "interests": normalized_interests,
        }, sort_keys=True)

    def _normalize_country(self, country: Optional[str]) -> str:
        value = (country or "").strip().lower()
        if len(value) == 2 and value.isalpha():
            return value
        return ""
    
    def _calculate_similarity_score(self, query: str, title: str, description: str) -> float:
        """Calculate similarity score using SBERT with enhanced matching"""
        try:
            title = title or ""
            description = description or ""

            # Combine title and description for better matching
            article_text = f"{title} {description}"
            
            # Generate embeddings
            query_embedding = self.sbert_model.encode([query])
            article_embedding = self.sbert_model.encode([article_text])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(query_embedding, article_embedding)[0][0]
            
            # Apply sigmoid-like transformation to amplify differences
            amplified_similarity = 1 / (1 + np.exp(-10 * (similarity - 0.3)))
            
            # Boost score if query terms appear in title (strong signal)
            query_lower = query.lower()
            title_lower = title.lower()
            desc_lower = description.lower()
            
            # Extract key terms from query
            query_terms = query_lower.split()
            title_boost = 0
            desc_boost = 0
            
            for term in query_terms:
                if term in title_lower:
                    title_boost += 0.2
                if term in desc_lower:
                    desc_boost += 0.1
            
            # Additional boost for exact phrase matches
            if query_lower in title_lower:
                title_boost += 0.3
            if query_lower in desc_lower:
                desc_boost += 0.2
            
            # Cap boosts
            title_boost = min(title_boost, 0.5)
            desc_boost = min(desc_boost, 0.3)
            
            # Combine scores
            final_similarity = amplified_similarity + title_boost + desc_boost
            
            return max(0.0, min(1.0, float(final_similarity)))
            
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.1
    
    def _calculate_recency_score(self, published_at: str) -> float:
        """Calculate recency score from ISO date string"""
        try:
            if not published_at:
                return 0.3
            
            # Parse ISO date string - handle different formats
            try:
                pub_date = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
            except ValueError:
                pub_date = datetime.fromisoformat(published_at)

            if pub_date.tzinfo is None:
                pub_date = pub_date.replace(tzinfo=timezone.utc)
            
            now = datetime.now(timezone.utc)
            
            # Calculate hours old
            hours_old = (now - pub_date).total_seconds() / 3600
            
            # Recency score with 48-hour half-life
            recency_score = np.exp(-hours_old / 48)
            return max(0.0, min(1.0, recency_score))
            
        except Exception as e:
            print(f"Error parsing date '{published_at}': {e}")
            return 0.3
    
    def _calculate_final_score(self, similarity_score: float, recency_score: float) -> float:
        """Calculate final score with 80% similarity, 20% recency"""
        return similarity_score * 0.8 + recency_score * 0.2
    
    def _generate_content_hash(self, title: str, description: str) -> str:
        """Generate content hash for deduplication"""
        content = f"{title} {description}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _is_duplicate(self, article: Dict) -> bool:
        """Check if article is duplicate"""
        url = article.get('url', '')
        title = article.get('title', '')
        content_hash = self._generate_content_hash(title, article.get('description', ''))
        
        return (url in self.seen_urls or 
                title.lower() in self.seen_titles or 
                content_hash in self.seen_content_hashes)
    
    def _add_to_seen(self, article: Dict):
        """Add article to seen sets"""
        url = article.get('url', '')
        title = article.get('title', '')
        content_hash = self._generate_content_hash(title, article.get('description', ''))
        
        self.seen_urls.add(url)
        self.seen_titles.add(title.lower())
        self.seen_content_hashes.add(content_hash)
    
    def _categorize_article_with_llm(self, title: str, description: str, query: str) -> str:
        """
        Categorize article using simple keyword-based LLM-like logic
        Returns one of: 'politics', 'business', 'technology', 'sports', 'health', 'science', 'entertainment', 'general'
        """
        text = f"{title} {description}".lower()
        query_lower = query.lower()
        
        # Priority-based categorization
        categories = {
            'politics': ['election', 'government', 'president', 'policy', 'political', 'congress', 'senate', 'vote', 'democracy', 'minister', 'parliament'],
            'business': ['economy', 'market', 'stock', 'finance', 'economic', 'company', 'corporation', 'investment', 'profit', 'revenue', 'business'],
            'technology': ['tech', 'software', 'app', 'digital', 'computer', 'internet', 'ai', 'artificial intelligence', 'machine learning', 'data', 'cyber'],
            'sports': ['game', 'match', 'team', 'player', 'sport', 'championship', 'league', 'football', 'basketball', 'soccer', 'tennis', 'cricket'],
            'health': ['health', 'medical', 'disease', 'hospital', 'doctor', 'medicine', 'treatment', 'patient', 'vaccine', 'covid', 'fitness'],
            'science': ['research', 'study', 'scientist', 'discovery', 'experiment', 'space', 'climate', 'environment', 'biology', 'physics', 'chemistry'],
            'entertainment': ['movie', 'music', 'celebrity', 'film', 'actor', 'singer', 'show', 'entertainment', 'hollywood', 'concert', 'theater']
        }
        
        # Check each category
        for category, keywords in categories.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score >= 2:  # Require at least 2 keywords for a category
                return category
        
        # Check query relevance
        for category, keywords in categories.items():
            if any(keyword in query_lower for keyword in keywords):
                return category
        
        return 'general'
    
    def search_news(self, query: str, category: Optional[str] = None, country: Optional[str] = None, language: str = "en", 
                   page_size: int = 20, page: int = 1, interests: Optional[List[str]] = None,
                   per_page: int = 12) -> Dict:
        """
        Search news using NewsData.io API with LLM categorization and relevance scoring
        """
        # Build API request
        resolved_category = self._normalize_category(category)
        if not resolved_category:
            resolved_category = self._resolve_category_from_interests(query, interests)

        per_page = max(1, int(per_page))
        page = max(1, int(page))
        request_size = max(1, min(int(page_size), self.max_page_size))
        resolved_country = self._normalize_country(country)
        search_key = self._build_search_key(query, language, resolved_category, interests) + f"|country:{resolved_country}"

        if page == 1 or search_key not in self.search_sessions:
            self.search_sessions[search_key] = {
                "articles": [],
                "seen_urls": set(),
                "seen_signatures": set(),
                "next_page": None,
                "exhausted": False,
            }

        session = self.search_sessions[search_key]
        
        print(f"[search] Searching NewsData.io for: '{query}'")
        if resolved_category:
            print(f"[search] Category: {resolved_category}")
        
        try:
            target_count = page * per_page

            while len(session["articles"]) < target_count and not session["exhausted"]:
                params = {
                    "apikey": self.api_key,
                    "q": query,
                    "language": language,
                    "size": request_size,
                }

                if resolved_country:
                    params["country"] = resolved_country

                if session["next_page"]:
                    params["page"] = session["next_page"]

                response = requests.get(self.base_url, params=params, timeout=30)
                if response.status_code == 422:
                    fallback_params = params.copy()
                    fallback_params["size"] = self.max_page_size
                    response = requests.get(self.base_url, params=fallback_params, timeout=30)
                response.raise_for_status()

                data = response.json()

                if data.get("status") != "success":
                    raise Exception(f"API Error: {data.get('results', {}).get('message', 'Unknown error')}")

                articles = data.get("results", [])
                print(f"[search] Found {len(articles)} raw articles from API")

                if not articles:
                    session["exhausted"] = True
                    break

                for article in articles:
                    title = article.get("title", "")
                    description = article.get("description") or ""
                    url = article.get("link", "")
                    published_at = article.get("pubDate", "")
                    source = article.get("source_id", "")
                    signature = self._article_signature(title, description)

                    if not title or not url:
                        continue

                    if url in session["seen_urls"] or signature in session["seen_signatures"]:
                        continue
                    session["seen_urls"].add(url)
                    session["seen_signatures"].add(signature)

                    llm_category = resolved_category or self._categorize_article_with_llm(title, description, query)
                    if isinstance(llm_category, dict):
                        llm_category = llm_category.get("category", "general")

                    similarity_score = self._calculate_similarity_score(query, title, description)
                    recency_score = self._calculate_recency_score(published_at)
                    final_score = self._calculate_final_score(similarity_score, recency_score)

                    processed_article = {
                        "title": title,
                        "description": description,
                        "url": url,
                        "publishedAt": published_at,
                        "source": source,
                        "category": llm_category,
                        "similarity_score": similarity_score,
                        "recency_score": recency_score,
                        "final_score": final_score,
                        "api_category": article.get("category", ""),
                        "keywords": article.get("keywords", []),
                        "creator": article.get("creator", []),
                        "image_url": article.get("image_url", "")
                    }

                    session["articles"].append(processed_article)

                session["next_page"] = data.get("nextPage")
                if not session["next_page"]:
                    session["exhausted"] = True

            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paged_articles = session["articles"][start_idx:end_idx]

            category_counts = {}
            for article in session["articles"]:
                cat = article["category"]
                category_counts[cat] = category_counts.get(cat, 0) + 1

            has_more = len(session["articles"]) > end_idx or not session["exhausted"]

            print(f"[search] Processed {len(session['articles'])} cumulative relevant articles")

            return {
                "status": "success",
                "total": len(session["articles"]),
                "articles": paged_articles,
                "query": query,
                "resolved_category": resolved_category,
                "country": resolved_country,
                "category_distribution": category_counts,
                "page": page,
                "per_page": per_page,
                "has_more": has_more,
            }
            
        except requests.exceptions.RequestException as e:
            print(f"[error] API request failed: {e}")
            return {
                "status": "error",
                "message": f"API request failed: {str(e)}",
                "articles": []
            }
        except Exception as e:
            print(f"[error] Error processing news: {e}")
            return {
                "status": "error", 
                "message": f"Processing error: {str(e)}",
                "articles": []
            }
    
    def get_top_headlines(self, category: Optional[str] = None, country: Optional[str] = None, language: str = "en", 
                         page_size: int = 20, page: int = 1) -> Dict:
        """Get top headlines from NewsData.io"""
        # Clear cache for fresh headlines
        self.clear_cache()
        
        request_size = max(1, min(int(page_size), self.max_page_size))

        # Build API request for latest news
        params = {
            "apikey": self.api_key,
            "language": language,
            "size": request_size
        }
        resolved_country = self._normalize_country(country)
        if resolved_country:
            params["country"] = resolved_country
        
        print(f"[headlines] Getting top headlines")
        
        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            if response.status_code == 422:
                fallback_params = params.copy()
                fallback_params["size"] = self.max_page_size
                response = requests.get(self.base_url, params=fallback_params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("status") != "success":
                raise Exception(f"API Error: {data.get('results', {}).get('message', 'Unknown error')}")
            
            articles = data.get("results", [])
            print(f"[headlines] Found {len(articles)} headlines")
            
            # Process headlines with recency scoring only
            processed_articles = []
            for article in articles:
                if not self._is_duplicate(article):
                    title = article.get("title", "")
                    description = article.get("description") or ""
                    url = article.get("link", "")
                    published_at = article.get("pubDate", "")
                    source = article.get("source_id", "")
                    
                    if not title or not url:
                        continue
                    
                    # LLM categorization
                    llm_category = self._categorize_article_with_llm(title, description, "")
                    if isinstance(llm_category, dict):
                        llm_category = llm_category.get("category", "general")
                    
                    # Only recency scoring for headlines
                    recency_score = self._calculate_recency_score(published_at)
                    
                    processed_article = {
                        "title": title,
                        "description": description,
                        "url": url,
                        "publishedAt": published_at,
                        "source": source,
                        "category": llm_category,
                        "similarity_score": 0.0,
                        "recency_score": recency_score,
                        "final_score": recency_score,
                        "api_category": article.get("category", ""),
                        "keywords": article.get("keywords", []),
                        "creator": article.get("creator", []),
                        "image_url": article.get("image_url", "")
                    }
                    
                    processed_articles.append(processed_article)
                    self._add_to_seen(processed_article)
            
            # Sort by recency (descending)
            processed_articles.sort(key=lambda x: x["final_score"], reverse=True)
            
            return {
                "status": "success",
                "total": len(processed_articles),
                "articles": processed_articles
            }
            
        except Exception as e:
            print(f"[error] Error getting headlines: {e}")
            return {
                "status": "error",
                "message": f"Error: {str(e)}",
                "articles": []
            }
    
    def get_categories(self) -> List[str]:
        """Get available categories"""
        return self.categories.copy()
    
    def clear_cache(self):
        """Clear deduplication cache"""
        self.seen_urls.clear()
        self.seen_titles.clear()
        self.seen_content_hashes.clear()
