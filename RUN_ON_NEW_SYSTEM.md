# Run On Another System Guide

This guide explains how to run this project on a new machine with:

- a different NewsData API key
- a different database

## 1. Clone and install

From project root:

1. Create and activate virtual environment
   - Windows PowerShell:
     python -m venv .venv
     .\.venv\Scripts\activate

2. Install backend dependencies
   pip install -r requirements.txt

3. Install frontend dependencies
   cd frontend
   npm install
   cd ..

## 2. Configure environment variables

Create a root .env file in the project folder.

Use this template:

NEWSDATA_API_KEY=your_new_newsdata_api_key
JWT_SECRET_KEY=replace_with_a_strong_secret
OPENAI_API_KEY=

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=new_database_name
MYSQL_USER=new_db_user
MYSQL_PASSWORD=new_db_password

Notes:

- NEWSDATA_API_KEY is required for feed/search/headlines.
- If NEWSDATA_API_KEY is empty or invalid, live articles will not load.
- OPENAI_API_KEY is optional.

## 3. Prepare database

This app uses SQLAlchemy and auto-creates tables at startup.

Before starting backend:

1. Ensure MySQL server is running.
2. Create the database you set in MYSQL_DB.
3. Ensure MYSQL_USER has privileges on that database.

Example SQL:

CREATE DATABASE new_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON new_database_name.\* TO 'new_db_user'@'%';
FLUSH PRIVILEGES;

## 4. Start backend

From project root:

python .\start_backend.py

Backend default URL:

- http://localhost:8001

Health check:

- http://localhost:8001/api/health

## 5. Start frontend

In another terminal:

cd frontend
npm run dev

Frontend default URL:

- http://localhost:5173

## 6. Quick verification checklist

1. Sign in or sign up works.
2. /api/health returns status healthy.
3. Feed endpoint returns articles when NEWSDATA_API_KEY is valid.
4. User actions (interests/history/bookmarks/location) persist in your new DB.

## 7. Moving to another API key later

To switch to a different NewsData key:

1. Update NEWSDATA_API_KEY in .env.
2. Restart backend.

No code changes are required.

## 8. Moving to another database later

To switch DB:

1. Update MYSQL_HOST, MYSQL_PORT, MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD in .env.
2. Ensure DB exists and credentials are valid.
3. Restart backend.

No code changes are required.

## 9. Common issues

Issue: 401 Unauthorized from NewsData

- Cause: missing/invalid NEWSDATA_API_KEY
- Fix: set a valid key in .env and restart backend

Issue: Feed empty with 429 errors

- Cause: NewsData rate limit
- Fix: wait/reset quota or use another key

Issue: DB connection error

- Cause: invalid MYSQL\_\* values or DB not reachable
- Fix: validate .env values and MySQL access

Issue: Frontend cannot call backend

- Cause: backend not running on expected port
- Fix: start backend and confirm http://localhost:8001/api/health
