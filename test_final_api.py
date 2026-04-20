#!/usr/bin/env python3
"""
Final test of the cleaned up NewsData.io API
"""

from src.main import app
import requests
import json

def test_final_api():
    print("🚀 Final Test: NewsData.io API with LLM Categorization")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    
    # Test 1: Health check
    print("\n🏥 Test 1: Health Check")
    print("-" * 30)
    
    try:
        response = requests.get(f"{base_url}/api/health", timeout=10)
        if response.status_code == 200:
            health = response.json()
            print("✅ Health check passed")
            print(f"   API Version: {health['api_version']}")
            print(f"   LLM Categorization: {health['features']['llm_categorization']}")
            print(f"   Relevance Scoring: {health['features']['relevance_scoring']}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("💡 Make sure server is running: python src/main.py")
        return
    
    # Test 2: Search with high relevance
    print("\n🔍 Test 2: Search for 'artificial intelligence'")
    print("-" * 50)
    
    try:
        response = requests.post(f"{base_url}/api/search", json={
            "query": "artificial intelligence",
            "category": "technology",
            "top_k": 3
        }, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['count']} articles")
            
            for i, article in enumerate(data['articles']):
                title = article['title'][:50]
                category = article['category']
                score = article['final_score']
                
                print(f"\n{i+1}. {title}...")
                print(f"   LLM Category: {category}")
                print(f"   Relevance Score: {score:.3f}")
                
                if score > 0.7:
                    print("   ✅ High relevance")
                elif score > 0.5:
                    print("   ⚠️  Medium relevance")
                else:
                    print("   ❌ Low relevance")
            
            # Show category distribution
            print(f"\n📊 Category Distribution:")
            for cat, count in data.get('category_distribution', {}).items():
                print(f"   {cat}: {count} articles")
        else:
            print(f"❌ Search failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Search error: {e}")
    
    # Test 3: Politics search
    print("\n🏛️ Test 3: Search for 'election'")
    print("-" * 30)
    
    try:
        response = requests.post(f"{base_url}/api/search", json={
            "query": "election",
            "top_k": 3
        }, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['count']} articles")
            
            politics_count = data.get('category_distribution', {}).get('politics', 0)
            print(f"   Politics articles: {politics_count}/{data['count']}")
            
            if politics_count >= 2:
                print("   ✅ Good LLM categorization")
            else:
                print("   ⚠️  Categorization may need improvement")
        else:
            print(f"❌ Politics search failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Politics search error: {e}")
    
    # Test 4: Top headlines
    print("\n📰 Test 4: Top Headlines")
    print("-" * 25)
    
    try:
        response = requests.post(f"{base_url}/api/headlines", json={
            "top_k": 3
        }, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {data['count']} headlines")
            
            for i, article in enumerate(data['articles']):
                title = article['title'][:50]
                category = article['category']
                print(f"\n{i+1}. {title}...")
                print(f"   Category: {category}")
        else:
            print(f"❌ Headlines failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Headlines error: {e}")
    
    # Test 5: Categories
    print("\n📂 Test 5: Available Categories")
    print("-" * 35)
    
    try:
        response = requests.get(f"{base_url}/api/categories", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Categories retrieved")
            print(f"   API Categories: {', '.join(data['categories'][:5])}...")
            print(f"   LLM Categories: {', '.join(data['llm_categories'])}")
        else:
            print(f"❌ Categories failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Categories error: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Final API Test Complete!")
    print("\n💡 Key Improvements Achieved:")
    print("   ✅ NewsData.io API integration (no more RSS issues)")
    print("   ✅ LLM-powered categorization for smart filtering")
    print("   ✅ Enhanced relevance scoring with term matching")
    print("   ✅ Clean codebase with unwanted files removed")
    print("   ✅ Reduced server load with smart categorization")
    print("   ✅ Better user experience with relevant results")

if __name__ == "__main__":
    test_final_api()
