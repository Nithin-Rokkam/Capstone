import requests
from typing import List, Dict, Optional
import json
import random

class NewsAPIClient:
    def __init__(self, api_key: str = "d4c96b43d3c04883a2790bd6c78d0117"):
        self.api_key = api_key
        self.base_url = "https://newsapi.org/v2"
    
    def search_articles(self, query: str, language: str = "en", sort_by: str = "relevancy", page_size: int = 20, page: int = 1) -> List[Dict]:
        """
        Search for articles based on query
        """
        url = f"{self.base_url}/everything"
        params = {
            'q': query,
            'apiKey': self.api_key,
            'language': language,
            'sortBy': sort_by,
            'pageSize': page_size,
            'page': page
        }
        
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            print(f"Searching for: '{query}' with params: {params}")
            response = requests.get(url, params=params, headers=headers)
            print(f"Search response status: {response.status_code}")
            
            # Handle specific status codes
            if response.status_code == 426:
                print(f"NewsAPI Free Tier Limitation: Upgrade required for query '{query}' with pageSize={page_size}, page={page}")
                # Return empty list for 426 errors (free tier limitations)
                return []
            elif response.status_code == 429:
                print(f"NewsAPI Rate Limit Exceeded for query '{query}'")
                return []
            
            response.raise_for_status()
            data = response.json()
            print(f"Search API Response status: {data.get('status')}, Total results: {data.get('totalResults', 0)}")
            
            if data['status'] == 'ok':
                articles = []
                for article in data['articles']:
                    # Combine title and description for embedding
                    title = article.get('title', '')
                    description = article.get('description', '')
                    content = article.get('content', '')
                    
                    # Create a combined text for embedding
                    combined_text = f"{title}. {description}"
                    if content and len(combined_text) < 200:  # Add content if description is short
                        combined_text += f" {content}"
                    
                    # Only add articles that have some content
                    if title.strip() and combined_text.strip():
                        articles.append({
                            'title': title,
                            'description': description,
                            'content': content,
                            'url': article.get('url', ''),
                            'publishedAt': article.get('publishedAt', ''),
                            'source': article.get('source', {}).get('name', ''),
                            'urlToImage': article.get('urlToImage', ''),
                            'combined_text': combined_text.strip()
                        })
                
                print(f"Search returning {len(articles)} valid articles")
                return articles
            else:
                print(f"API Error: {data.get('message', 'Unknown error')}")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return []
    
    def get_top_headlines(self, category: Optional[str] = None, country: str = "us", page_size: int = 20, page: int = 1) -> List[Dict]:
        """
        Get top headlines
        """
        url = f"{self.base_url}/top-headlines"
        params = {
            'apiKey': self.api_key,
            'country': country,
            'pageSize': page_size,
            'page': page
        }
        
        if category:
            params['category'] = category
        
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            if data['status'] == 'ok':
                articles = []
                for article in data['articles']:
                    title = article.get('title', '')
                    description = article.get('description', '')
                    content = article.get('content', '')
                    
                    combined_text = f"{title}. {description}"
                    if content and len(combined_text) < 200:
                        combined_text += f" {content}"
                    
                    articles.append({
                        'title': title,
                        'description': description,
                        'content': content,
                        'url': article.get('url', ''),
                        'publishedAt': article.get('publishedAt', ''),
                        'source': article.get('source', {}).get('name', ''),
                        'combined_text': combined_text.strip()
                    })
                return articles
            else:
                print(f"API Error: {data.get('message', 'Unknown error')}")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return [] 

    def get_trending_everything(self, category: Optional[str] = None, language: str = "en", page_size: int = 10, page: int = 1) -> List[Dict]:
        """
        Get trending news using the /everything endpoint with a generic query for deeper pagination.
        """
        url = f"{self.base_url}/everything"
        params = {
            'q': 'news',
            'apiKey': self.api_key,
            'language': language,
            'pageSize': page_size,
            'page': page,
            'sortBy': 'publishedAt',
        }
        if category and category != 'general':
            params['q'] += f' {category}'
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            print(f"Making request to: {url} with params: {params}")
            response = requests.get(url, params=params, headers=headers)
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 426:
                print(f"NewsAPI Free Tier Limitation: Upgrade required")
                return []
            elif response.status_code == 429:
                print(f"NewsAPI Rate Limit Exceeded")
                return []
            
            response.raise_for_status()
            data = response.json()
            print(f"API Response status: {data.get('status')}, Total results: {data.get('totalResults', 0)}")
            
            if data['status'] == 'ok':
                articles = []
                for article in data['articles']:
                    title = article.get('title', '')
                    description = article.get('description', '')
                    content = article.get('content', '')
                    combined_text = f"{title}. {description}"
                    if content and len(combined_text) < 200:
                        combined_text += f" {content}"
                    
                    # Only add articles with valid content
                    if title and title.strip() and description and description.strip():
                        articles.append({
                            'title': title,
                            'description': description,
                            'content': content,
                            'url': article.get('url', ''),
                            'publishedAt': article.get('publishedAt', ''),
                            'source': article.get('source', {}).get('name', ''),
                            'urlToImage': article.get('urlToImage', ''),
                            'combined_text': combined_text.strip()
                        })
                print(f"Returning {len(articles)} valid articles")
                return articles
            else:
                print(f"API Error: {data.get('message', 'Unknown error')}")
                return []
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return [] 