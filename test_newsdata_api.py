#!/usr/bin/env python3
"""
Test the new NewsData.io API with LLM categorization
"""

import os
from src.newsdata_client import NewsDataClient

def test_newsdata_api():
    print("🚀 Testing NewsData.io API with LLM Categorization")
    print("=" * 60)
    
    # Initialize client
    api_key = os.getenv("NEWSDATA_API_KEY", "")
    if not api_key:
        print("❌ NEWSDATA_API_KEY is not set")
        return
    client = NewsDataClient(api_key)
    
    # Test 1: Technology search
    print("\n🔍 Test 1: Search for 'artificial intelligence'")
    print("-" * 50)
    
    result = client.search_news(
        query="artificial intelligence",
        category="technology",
        page_size=5
    )
    
    if result["status"] == "success":
        print(f"✅ Found {result['total']} articles")
        
        for i, article in enumerate(result["articles"]):
            title = article["title"][:60]
            category = article["category"]
            score = article["final_score"]
            similarity = article["similarity_score"]
            
            print(f"\n{i+1}. {title}...")
            print(f"   LLM Category: {category}")
            print(f"   Relevance Score: {score:.3f}")
            print(f"   Similarity: {similarity:.3f}")
            
            if score > 0.7:
                print("   ✅ High relevance")
            elif score > 0.5:
                print("   ⚠️  Medium relevance")
            else:
                print("   ❌ Low relevance")
        
        print(f"\n📊 Category Distribution:")
        for cat, count in result.get("category_distribution", {}).items():
            print(f"   {cat}: {count} articles")
    else:
        print(f"❌ Error: {result['message']}")
    
    # Test 2: Politics search
    print("\n\n🔍 Test 2: Search for 'election results'")
    print("-" * 50)
    
    result = client.search_news(
        query="election results",
        page_size=5
    )
    
    if result["status"] == "success":
        print(f"✅ Found {result['total']} articles")
        
        for i, article in enumerate(result["articles"]):
            title = article["title"][:60]
            category = article["category"]
            score = article["final_score"]
            
            print(f"\n{i+1}. {title}...")
            print(f"   LLM Category: {category}")
            print(f"   Relevance Score: {score:.3f}")
    
    # Test 3: Top headlines
    print("\n\n📰 Test 3: Get top headlines")
    print("-" * 50)
    
    result = client.get_top_headlines(page_size=5)
    
    if result["status"] == "success":
        print(f"✅ Found {result['total']} headlines")
        
        for i, article in enumerate(result["articles"]):
            title = article["title"][:60]
            category = article["category"]
            recency = article["recency_score"]
            
            print(f"\n{i+1}. {title}...")
            print(f"   LLM Category: {category}")
            print(f"   Recency Score: {recency:.3f}")
    
    # Test 4: Irrelevant search (should return low scores)
    print("\n\n🔍 Test 4: Search for 'quantum physics' in sports category")
    print("-" * 50)
    
    result = client.search_news(
        query="quantum physics",
        category="sports",
        page_size=3
    )
    
    if result["status"] == "success":
        print(f"✅ Found {result['total']} articles")
        
        for i, article in enumerate(result["articles"]):
            title = article["title"][:60]
            category = article["category"]
            score = article["final_score"]
            
            print(f"\n{i+1}. {title}...")
            print(f"   LLM Category: {category}")
            print(f"   Relevance Score: {score:.3f}")
            
            if score < 0.4:
                print("   ✅ Correctly identified as irrelevant")

if __name__ == "__main__":
    test_newsdata_api()
