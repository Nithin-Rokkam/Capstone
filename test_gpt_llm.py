#!/usr/bin/env python3
"""
Test GPT-4o mini LLM categorization with NewsData.io API
"""

import os
from src.newsdata_client import NewsDataClient

def test_gpt_llm_categorization():
    print("🤖 Testing GPT-4o Mini LLM Categorization")
    print("=" * 60)
    
    # Check for OpenAI API key
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("⚠️  OPENAI_API_KEY environment variable not set")
        print("💡 Set it with: export OPENAI_API_KEY='your-key-here'")
        print("🔄 Testing with fallback keyword categorization...")
        use_llm = False
    else:
        print("✅ OpenAI API key found")
        print("🤖 Using GPT-4o mini for LLM categorization")
        use_llm = True
    
    # Initialize client
    api_key = os.getenv("NEWSDATA_API_KEY", "")
    if not api_key:
        print("❌ NEWSDATA_API_KEY environment variable not set")
        return
    client = NewsDataClient(
        api_key=api_key,
        use_llm=use_llm,
        openai_api_key=openai_key
    )
    
    # Test 1: Technology search
    print("\n🔍 Test 1: 'artificial intelligence' in technology")
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
            confidence = article.get("llm_confidence", 0)
            relevance = article.get("llm_relevance", 0)
            method = article.get("categorization_method", "unknown")
            reasoning = article.get("categorization_reasoning", "")
            
            print(f"\n{i+1}. {title}...")
            print(f"   Category: {category}")
            print(f"   Method: {method}")
            print(f"   Confidence: {confidence:.2f}")
            print(f"   Relevance: {relevance:.2f}")
            print(f"   Reasoning: {reasoning}")
            
            if confidence > 0.8:
                print("   ✅ High confidence LLM categorization")
            elif confidence > 0.6:
                print("   ⚠️  Medium confidence")
            else:
                print("   ❌ Low confidence")
    else:
        print(f"❌ Error: {result['message']}")
    
    # Test 2: Politics search (should categorize correctly)
    print("\n\n🏛️ Test 2: 'election results' (no category)")
    print("-" * 50)
    
    result = client.search_news(
        query="election results",
        page_size=5
    )
    
    if result["status"] == "success":
        print(f"✅ Found {result['total']} articles")
        
        politics_count = 0
        for article in result["articles"]:
            if article["category"] == "politics":
                politics_count += 1
        
        print(f"   Politics articles: {politics_count}/{result['total']}")
        
        if politics_count >= 3:
            print("   ✅ Excellent LLM categorization")
        elif politics_count >= 2:
            print("   ⚠️  Good LLM categorization")
        else:
            print("   ❌ Poor LLM categorization")
    
    # Test 3: Mixed query
    print("\n\n🎯 Test 3: 'climate change technology' (mixed topics)")
    print("-" * 50)
    
    result = client.search_news(
        query="climate change technology",
        page_size=5
    )
    
    if result["status"] == "success":
        print(f"✅ Found {result['total']} articles")
        
        category_dist = {}
        for article in result["articles"]:
            cat = article["category"]
            category_dist[cat] = category_dist.get(cat, 0) + 1
        
        print("   Category distribution:")
        for cat, count in category_dist.items():
            print(f"     {cat}: {count}")
    
    # Test 4: Irrelevant search
    print("\n\n🔬 Test 4: 'quantum physics' in sports category")
    print("-" * 50)
    
    result = client.search_news(
        query="quantum physics",
        category="sports",
        page_size=3
    )
    
    if result["status"] == "success":
        print(f"✅ Found {result['total']} articles")
        
        for article in result["articles"]:
            title = article["title"][:50]
            category = article["category"]
            relevance = article.get("llm_relevance", 0)
            
            print(f"   {title}... -> {category} (relevance: {relevance:.2f})")
            
            if relevance < 0.5:
                print("     ✅ Correctly identified as irrelevant")
            else:
                print("     ⚠️  May be incorrectly categorized")
    
    # Test 5: Batch categorization stats
    print("\n\n📊 Test 5: LLM Performance Statistics")
    print("-" * 50)
    
    # Get some articles for stats
    result = client.search_news(
        query="technology",
        page_size=10
    )
    
    if result["status"] == "success":
        stats = client.llm_categorizer.get_category_stats(result["articles"]) if client.llm_categorizer else {}
        
        print("   LLM Categorization Performance:")
        print(f"   Total Articles: {stats.get('total_articles', 0)}")
        print(f"   Average Confidence: {stats.get('average_confidence', 0):.2f}")
        print(f"   Average Relevance: {stats.get('average_relevance', 0):.2f}")
        
        methods = stats.get('methods_used', {})
        print("   Methods Used:")
        for method, count in methods.items():
            print(f"     {method}: {count}")
    
    print("\n" + "=" * 60)
    print("🎉 GPT-4o Mini LLM Categorization Test Complete!")
    
    if use_llm:
        print("\n💡 Benefits of GPT-4o Mini:")
        print("   ✅ Advanced semantic understanding")
        print("   ✅ High accuracy categorization")
        print("   ✅ Confidence scoring")
        print("   ✅ Key topic extraction")
        print("   ✅ Reasoning explanations")
        print("\n🚀 For Production:")
        print("   📈 Upgrade to BERT categorizer for:")
        print("      - Faster processing")
        print("      - Lower cost")
        print("      - Better scalability")
        print("      - No external API dependencies")
    else:
        print("\n⚠️  Using keyword fallback (no OpenAI API key)")
        print("💡 Add OPENAI_API_KEY to enable GPT-4o mini categorization")

if __name__ == "__main__":
    test_gpt_llm_categorization()
