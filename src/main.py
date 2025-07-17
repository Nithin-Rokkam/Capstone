from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import pandas as pd
import random

from .newsapi_client import NewsAPIClient
from .recommender import NewsRecommender

# Initialize FastAPI app
app = FastAPI(
    title="News Recommender API",
    description="A news recommendation system using SBERT embeddings and NewsAPI",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # React dev server
        # "https://*.vercel.app",   # Vercel deployments
        # "https://*.onrender.com", # Render deployments
        "*"  # Allow all for now - you can restrict this later
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
news_client = NewsAPIClient()
recommender = NewsRecommender()

# Load processed news at startup
news_df = pd.read_csv('data/processed_news.csv')
news_dict = {row['news_id']: row for _, row in news_df.iterrows()}

# Pydantic models for request/response
class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10
    language: Optional[str] = "en"

class RecommendationRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10
    include_live: Optional[bool] = True
    include_mind: Optional[bool] = True

class ArticleResponse(BaseModel):
    title: str
    description: str
    url: str
    source: str
    publishedAt: str
    similarity_score: Optional[float] = None

@app.get("/")
async def root():
    return {"message": "News Recommender API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "embeddings_loaded": len(recommender.news_ids) > 0}

@app.post("/search")
async def search_articles(request: SearchRequest):
    """
    Search for articles using NewsAPI
    """
    try:
        articles = news_client.search_articles(
            query=request.query,
            language=request.language,
            page_size=request.top_k
        )
        return {
            "query": request.query,
            "articles": articles,
            "count": len(articles)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend")
async def get_recommendations(request: RecommendationRequest):
    """
    Get news recommendations based on query
    """
    try:
        if request.include_live:
            # Pick a random page number between 1 and 5
            page = random.randint(1, 5)
            # Fetch more articles to ensure we have enough for recommendations
            fetch_size = max(request.top_k * 10, 50)  # Fetch much more to ensure we get enough
            live_articles = news_client.search_articles(
                query=request.query,
                page_size=fetch_size,
                page=page
            )
        else:
            live_articles = []
        
        if request.include_mind and len(recommender.news_ids) > 0:
            # Get recommendations from MIND dataset
            mind_recommendations = recommender.find_similar_articles(
                request.query, 
                top_k=request.top_k
            )
        else:
            mind_recommendations = []
        
        if request.include_live and live_articles:
            # Get recommendations from live articles
            live_recommendations = recommender.recommend_from_live_articles(
                request.query,
                live_articles,
                top_k=request.top_k
            )
        else:
            live_recommendations = []
        
        # Convert numpy.float32 to Python float for JSON serialization
        mind_recommendations = [
            {
                "news_id": news_id,
                "score": float(score),
                "title": news_dict.get(news_id, {}).get('title', ''),
                "abstract": news_dict.get(news_id, {}).get('abstract', ''),
                "url": news_dict.get(news_id, {}).get('url', ''),
            }
            for news_id, score in mind_recommendations
        ]
        for rec in live_recommendations:
            if 'similarity_score' in rec:
                rec['similarity_score'] = float(rec['similarity_score'])
        
        return {
            "query": request.query,
            "mind_recommendations": mind_recommendations,
            "live_recommendations": live_recommendations,
            "total_recommendations": len(mind_recommendations) + len(live_recommendations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/top-headlines")
async def get_top_headlines(category: Optional[str] = None, country: str = "us"):
    """
    Get top headlines
    """
    try:
        articles = news_client.get_top_headlines(category=category, country=country)
        return {
            "category": category,
            "country": country,
            "articles": articles,
            "count": len(articles)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trending")
async def get_trending_news(country: str = "us", page_size: int = 10, category: str = None, page: int = 1, language: str = "en"):
    """
    Get trending news of the day using the /everything endpoint for real pagination and variety.
    """
    try:
        articles = news_client.get_trending_everything(category=category, language=language, page_size=page_size, page=page)
        return {
            "category": category,
            "page": page,
            "articles": articles,
            "count": len(articles)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 