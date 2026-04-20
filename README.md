# News Recommender Enhanced API

FastAPI + React news recommender with user auth, profile/location, interests/history/bookmarks, and personalized feed ranking using live NewsData results.

## Current Status

- Live news source: NewsData API
- Backend: FastAPI on default port 8001
- Frontend: Vite React app
- Auth: JWT-based sign-in/sign-up
- Persistence: MySQL via SQLAlchemy
- Feed behavior: personalized lead + general mix, dedupe, source balancing, pagination

## Core Features

- User authentication with JWT access tokens
- Profile updates and location management
- Per-user interests, search history, and bookmarks
- Personalized feed endpoint with:
  - deduplication across title/description/url
  - source diversity capping
  - page/per_page pagination
  - in-memory cache fallback (API-sourced only)
  - upstream retry/backoff buffering for rate-limit resilience
- Explore search and trending headlines endpoints

## Tech Stack

- Python 3.11+
- FastAPI, Pydantic, SQLAlchemy, bcrypt, python-jose
- sentence-transformers (SBERT scoring support)
- MySQL (PyMySQL driver)
- React + Vite + Axios

## Quick Start

### 1. Install Backend Dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a local `.env` in project root (this file is ignored by git):

```env
# Required
NEWSDATA_API_KEY=your-newsdata-api-key
JWT_SECRET_KEY=replace-with-a-strong-secret

# Optional (LLM categorization)
OPENAI_API_KEY=

# Database (defaults shown)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=news_recommender_db
MYSQL_USER=root
MYSQL_PASSWORD=
```

### 3. Start Backend

```powershell
python .\start_backend.py
```

Backend URL: http://localhost:8001

### 4. Start Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend usually runs on: http://localhost:5173

## API Docs

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
- Health: http://localhost:8001/api/health

## Important Endpoints

### Auth

- POST `/api/auth/signup`
- POST `/api/auth/signin`

### Personalized Feed and Discovery

- POST `/api/feed`
- POST `/api/recommend`
- POST `/api/search`
- GET `/api/trending`
- POST `/api/headlines`

### User Data

- GET/PUT `/api/users/{email}/profile`
- GET/PUT `/api/users/{email}/location`
- GET/PUT `/api/users/{email}/interests`
- GET/POST/DELETE `/api/users/{email}/history`
- GET/POST/DELETE `/api/users/{email}/bookmarks`

## Security and Push Safety

- Do not hardcode API keys or DB passwords in code.
- Use `.env` for secrets.
- `.gitignore` already excludes:
  - `.env`, `.env.*`, `frontend/.env`
  - local DB artifacts (`*.db`, `*.sqlite*`, `db_dumps/`)
  - virtual envs and build/cache outputs
  - cert/key files (`*.pem`, `*.key`, `*.crt`, `*.p12`)

If any key was ever committed previously, rotate it before production use.

## Troubleshooting

- Backend starts but feed is empty:
  - Check NewsData quota/rate-limit responses (429).
  - Verify `NEWSDATA_API_KEY` is valid in `.env`.
- Auth failures:
  - Confirm `JWT_SECRET_KEY` exists.
  - Ensure frontend sends `Authorization: Bearer <token>`.
- Database errors:
  - Confirm MySQL is reachable and env values are correct.

## Project Structure (High Level)

```text
News-Recommender-Enhanced-API/
  src/
    main.py               # FastAPI app and endpoints
    newsdata_client.py    # NewsData integration and scoring
    llm_categorizer.py    # Optional LLM-based categorization
    database.py           # SQLAlchemy engine/session setup
    models.py             # ORM models
  frontend/
    src/pages/            # Auth and dashboard pages
  start_backend.py        # Local backend launcher (port 8001)
```

## License

For educational and research use.
