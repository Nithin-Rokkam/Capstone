import json
from typing import List, Dict, Optional
import os
from datetime import datetime

try:
    from openai import OpenAI  # pyright: ignore[reportMissingImports]
except ImportError:
    OpenAI = None

class LLMCategorizer:
    def __init__(self, model: str = "gpt-4o-mini", api_key: Optional[str] = None):
        """
        Initialize LLM Categorizer with GPT-4o mini
        Later can be upgraded to BERT for production
        """
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        
        if self.api_key and OpenAI:
            self.client = OpenAI(api_key=self.api_key)
            self.use_llm = True
            print(f"🤖 Initialized LLM Categorizer with {model}")
        else:
            self.client = None
            self.use_llm = False
            print("⚠️  No OpenAI API key found, using fallback keyword categorization")

    def _normalize_category(self, value: str, allowed_categories: List[str]) -> str:
        default_category = "top" if "top" in allowed_categories else ("general" if "general" in allowed_categories else allowed_categories[-1] if allowed_categories else "general")

        if not value:
            return default_category

        normalized = value.strip().lower()
        if normalized in allowed_categories:
            return normalized

        return default_category

    def _build_category_prompt(self, text: str, allowed_categories: List[str], context: str = "") -> str:
        categories_text = ", ".join(allowed_categories)
        context_text = f"\nCONTEXT: {context}" if context else ""

        return f"""
Classify the news text into exactly one of these categories: {categories_text}.{context_text}

TEXT:
{text}

Return JSON only in this shape:
{{
  "category": "one_of_the_allowed_categories",
  "confidence": 0.0,
  "reasoning": "short explanation"
}}
"""

    def classify_category(self, text: str, allowed_categories: List[str], context: str = "") -> Dict:
        """Classify text into one of the allowed categories."""
        normalized_categories = [category.lower() for category in allowed_categories if category]
        if not normalized_categories:
            normalized_categories = ["general"]

        if not self.use_llm or not self.client:
            return self._fallback_category_classification(text, normalized_categories)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You classify news queries into a single category."},
                    {"role": "user", "content": self._build_category_prompt(text, normalized_categories, context)},
                ],
                temperature=0.0,
                max_tokens=120,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or "{}"
            result = json.loads(content)
            category = self._normalize_category(str(result.get("category", "")), normalized_categories)
            confidence = max(0.0, min(1.0, float(result.get("confidence", 0.5))))

            return {
                "category": category,
                "confidence": confidence,
                "reasoning": result.get("reasoning", "LLM classification"),
                "llm_model": self.model,
                "method": "llm",
            }
        except Exception as e:
            print(f"⚠️  Category classification failed: {e}")
            return self._fallback_category_classification(text, normalized_categories)

    def _fallback_category_classification(self, text: str, allowed_categories: List[str]) -> Dict:
        keywords = {
            "politics": ["election", "government", "policy", "minister", "parliament", "congress", "senate"],
            "business": ["economy", "market", "stock", "finance", "company", "investment", "revenue"],
            "technology": ["tech", "software", "ai", "internet", "digital", "computer", "data"],
            "sports": ["game", "match", "team", "player", "league", "football", "cricket", "tennis"],
            "health": ["health", "medical", "hospital", "doctor", "vaccine", "medicine"],
            "science": ["research", "study", "science", "space", "climate", "experiment"],
            "entertainment": ["movie", "music", "celebrity", "film", "actor", "concert"],
            "environment": ["climate", "environment", "pollution", "sustainability", "wildlife"],
            "food": ["food", "recipe", "restaurant", "cooking", "meal"],
            "world": ["world", "global", "international", "diplomacy", "foreign"],
            "top": ["top", "breaking", "latest"],
        }

        best_category = "top" if "top" in allowed_categories else ("general" if "general" in allowed_categories else allowed_categories[-1])
        best_score = -1
        normalized_text = text.lower()

        for category in allowed_categories:
            score = sum(1 for keyword in keywords.get(category, []) if keyword in normalized_text)
            if score > best_score:
                best_category = category
                best_score = score

        return {
            "category": best_category,
            "confidence": 0.4 if best_score <= 0 else 0.65,
            "reasoning": "keyword fallback",
            "llm_model": None,
            "method": "keyword_fallback",
        }
    
    def categorize_article_with_llm(self, title: str, description: str, query: str) -> Dict:
        """
        Categorize article using GPT-4o mini
        Returns structured categorization data
        """
        if not self.use_llm:
            return self._fallback_categorization(title, description, query)
        
        try:
            # Prepare the prompt for GPT-4o mini
            prompt = self._create_categorization_prompt(title, description, query)
            
            # Call GPT-4o mini
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a news categorization expert. Analyze articles and categorize them accurately."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            # Parse response
            categorization_text = response.choices[0].message.content.strip()
            
            # Try to parse as JSON first
            try:
                result = json.loads(categorization_text)
                return self._validate_and_normalize_result(result, title, description, query)
            except json.JSONDecodeError:
                # Fallback: parse text response
                return self._parse_text_response(categorization_text, title, description, query)
                
        except Exception as e:
            print(f"⚠️  LLM categorization failed: {e}")
            return self._fallback_categorization(title, description, query)
    
    def _create_categorization_prompt(self, title: str, description: str, query: str) -> str:
        """Create optimized prompt for GPT-4o mini"""
        return f"""
Analyze this news article and categorize it:

TITLE: {title}
DESCRIPTION: {description}
USER QUERY: {query}

Please categorize this article into ONE of these categories:
- politics (government, elections, policy, diplomacy)
- business (economy, markets, companies, finance) 
- technology (AI, software, gadgets, internet)
- sports (games, athletes, competitions)
- health (medicine, healthcare, wellness)
- science (research, discoveries, environment)
- entertainment (movies, music, celebrities)
- general (everything else)

Also provide:
1. confidence score (0.0-1.0)
2. relevance to query (0.0-1.0)
3. key topics (max 3)

Respond in JSON format:
{{
    "category": "category_name",
    "confidence": 0.85,
    "relevance": 0.90,
    "key_topics": ["topic1", "topic2", "topic3"],
    "reasoning": "Brief explanation"
}}
"""
    
    def _validate_and_normalize_result(self, result: Dict, title: str, description: str, query: str) -> Dict:
        """Validate and normalize LLM result"""
        valid_categories = ["politics", "business", "technology", "sports", "health", "science", "entertainment", "general"]
        
        # Ensure valid category
        if result.get("category") not in valid_categories:
            result["category"] = "general"
        
        # Ensure valid confidence and relevance scores
        result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.5))))
        result["relevance"] = max(0.0, min(1.0, float(result.get("relevance", 0.5))))
        
        # Ensure key_topics is a list
        if not isinstance(result.get("key_topics"), list):
            result["key_topics"] = []
        
        # Limit key topics to 3
        result["key_topics"] = result["key_topics"][:3]
        
        # Add metadata
        result["llm_model"] = self.model
        result["categorized_at"] = datetime.now().isoformat()
        result["method"] = "llm"
        
        return result
    
    def _parse_text_response(self, response_text: str, title: str, description: str, query: str) -> Dict:
        """Parse non-JSON response from LLM"""
        # Extract category from text
        valid_categories = ["politics", "business", "technology", "sports", "health", "science", "entertainment", "general"]
        
        category = "general"
        for cat in valid_categories:
            if cat.lower() in response_text.lower():
                category = cat
                break
        
        return {
            "category": category,
            "confidence": 0.7,  # Default confidence for text parsing
            "relevance": 0.7,
            "key_topics": [],
            "reasoning": "Parsed from text response",
            "llm_model": self.model,
            "categorized_at": datetime.now().isoformat(),
            "method": "llm_text_parse"
        }
    
    def _fallback_categorization(self, title: str, description: str, query: str) -> Dict:
        """
        Fallback keyword-based categorization
        Used when LLM is not available
        """
        text = f"{title} {description}".lower()
        query_lower = query.lower()
        
        categories = {
            'politics': ['election', 'government', 'president', 'policy', 'political', 'congress', 'senate', 'vote', 'democracy', 'minister', 'parliament'],
            'business': ['economy', 'market', 'stock', 'finance', 'economic', 'company', 'corporation', 'investment', 'profit', 'revenue', 'business'],
            'technology': ['tech', 'software', 'app', 'digital', 'computer', 'internet', 'ai', 'artificial intelligence', 'machine learning', 'data', 'cyber'],
            'sports': ['game', 'match', 'team', 'player', 'sport', 'championship', 'league', 'football', 'basketball', 'soccer', 'tennis', 'cricket'],
            'health': ['health', 'medical', 'disease', 'hospital', 'doctor', 'medicine', 'treatment', 'patient', 'vaccine', 'covid', 'fitness'],
            'science': ['research', 'study', 'scientist', 'discovery', 'experiment', 'space', 'climate', 'environment', 'biology', 'physics', 'chemistry'],
            'entertainment': ['movie', 'music', 'celebrity', 'film', 'actor', 'singer', 'show', 'entertainment', 'hollywood', 'concert', 'theater']
        }
        
        # Score each category
        category_scores = {}
        for category, keywords in categories.items():
            score = sum(1 for keyword in keywords if keyword in text)
            category_scores[category] = score
        
        # Select best category
        best_category = max(category_scores, key=category_scores.get)
        
        # If no keywords found, check query relevance
        if category_scores[best_category] < 2:
            for category, keywords in categories.items():
                if any(keyword in query_lower for keyword in keywords):
                    best_category = category
                    break
            else:
                best_category = "general"
        
        # Extract key topics (simple keyword extraction)
        key_topics = []
        for keyword in categories.get(best_category, [])[:3]:
            if keyword in text and keyword not in key_topics:
                key_topics.append(keyword)
            if len(key_topics) >= 3:
                break
        
        return {
            "category": best_category,
            "confidence": 0.6,  # Lower confidence for fallback
            "relevance": 0.6,
            "key_topics": key_topics,
            "reasoning": "Keyword-based fallback categorization",
            "llm_model": None,
            "categorized_at": datetime.now().isoformat(),
            "method": "keyword_fallback"
        }
    
    def batch_categorize(self, articles: List[Dict], query: str) -> List[Dict]:
        """
        Categorize multiple articles efficiently
        """
        categorized_articles = []
        
        for article in articles:
            title = article.get("title", "")
            description = article.get("description", "")
            
            categorization = self.categorize_article_with_llm(title, description, query)
            
            # Add categorization to article
            article.update(categorization)
            categorized_articles.append(article)
        
        return categorized_articles
    
    def get_category_stats(self, articles: List[Dict]) -> Dict:
        """Get statistics about categorization performance"""
        if not articles:
            return {}
        
        # Count categories
        category_counts = {}
        confidence_scores = []
        relevance_scores = []
        methods = {"llm": 0, "keyword_fallback": 0, "llm_text_parse": 0}
        
        for article in articles:
            category = article.get("category", "general")
            category_counts[category] = category_counts.get(category, 0) + 1
            
            if "confidence" in article:
                confidence_scores.append(article["confidence"])
            
            if "relevance" in article:
                relevance_scores.append(article["relevance"])
            
            method = article.get("method", "unknown")
            methods[method] = methods.get(method, 0) + 1
        
        stats = {
            "total_articles": len(articles),
            "category_distribution": category_counts,
            "methods_used": methods,
        }
        
        if confidence_scores:
            stats["average_confidence"] = sum(confidence_scores) / len(confidence_scores)
        
        if relevance_scores:
            stats["average_relevance"] = sum(relevance_scores) / len(relevance_scores)
        
        return stats

# Production-ready BERT categorizer (for future upgrade)
class BERTCategorizer:
    def __init__(self):
        """BERT-based categorizer for production use"""
        print("🤖 BERT Categorizer (Production) - Not implemented yet")
        self.model_name = "bert-base-uncased"
        # TODO: Implement BERT categorization for production
    
    def categorize_article(self, title: str, description: str, query: str) -> Dict:
        """TODO: Implement BERT categorization"""
        return {
            "category": "general",
            "confidence": 0.8,
            "relevance": 0.8,
            "key_topics": [],
            "reasoning": "BERT categorization - TODO",
            "llm_model": self.model_name,
            "categorized_at": datetime.now().isoformat(),
            "method": "bert_production"
        }
