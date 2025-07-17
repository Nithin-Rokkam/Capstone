import sys
import os
sys.path.append('src')

from newsapi_client import NewsAPIClient
from recommender import NewsRecommender

def test_newsapi():
    """Test NewsAPI integration"""
    print("Testing NewsAPI integration...")
    client = NewsAPIClient()
    
    # Test search
    articles = client.search_articles("artificial intelligence", page_size=3)
    print(f"Found {len(articles)} articles for 'artificial intelligence'")
    if articles:
        print(f"Sample article: {articles[0]['title']}")
    
    # Test top headlines
    headlines = client.get_top_headlines(category="technology", page_size=3)
    print(f"Found {len(headlines)} technology headlines")
    if headlines:
        print(f"Sample headline: {headlines[0]['title']}")
    
    return len(articles) > 0 and len(headlines) > 0

def test_recommender():
    """Test recommendation system"""
    print("\nTesting recommendation system...")
    recommender = NewsRecommender()
    
    if len(recommender.news_ids) == 0:
        print("Warning: No embeddings loaded. Please run embed_articles.py first.")
        return False
    
    # Test similarity search
    query = "artificial intelligence in healthcare"
    similar_articles = recommender.find_similar_articles(query, top_k=3)
    print(f"Found {len(similar_articles)} similar articles for '{query}'")
    if similar_articles:
        print(f"Top similar article ID: {similar_articles[0][0]} (score: {similar_articles[0][1]:.3f})")
    
    return len(similar_articles) > 0

def test_live_recommendations():
    """Test live article recommendations"""
    print("\nTesting live article recommendations...")
    client = NewsAPIClient()
    recommender = NewsRecommender()
    
    # Get some live articles
    live_articles = client.search_articles("technology", page_size=5)
    if not live_articles:
        print("No live articles found")
        return False
    
    # Test recommendations
    query = "artificial intelligence"
    recommendations = recommender.recommend_from_live_articles(query, live_articles, top_k=3)
    print(f"Found {len(recommendations)} recommended live articles for '{query}'")
    if recommendations:
        print(f"Top recommendation: {recommendations[0]['title']} (score: {recommendations[0]['similarity_score']:.3f})")
    
    return len(recommendations) > 0

if __name__ == "__main__":
    print("Running API tests...")
    
    # Test NewsAPI
    newsapi_ok = test_newsapi()
    
    # Test recommender
    recommender_ok = test_recommender()
    
    # Test live recommendations
    live_ok = test_live_recommendations()
    
    print(f"\nTest Results:")
    print(f"NewsAPI: {'✓' if newsapi_ok else '✗'}")
    print(f"Recommender: {'✓' if recommender_ok else '✗'}")
    print(f"Live Recommendations: {'✓' if live_ok else '✗'}")
    
    if newsapi_ok and recommender_ok and live_ok:
        print("\nAll tests passed! Ready to start the API server.")
    else:
        print("\nSome tests failed. Please check the issues above.") 