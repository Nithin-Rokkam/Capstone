import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict, Tuple
import os

class NewsRecommender:
    def __init__(self, embeddings_path: str = "data/news_embeddings.npz", model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the recommender with pre-computed embeddings
        """
        self.model = SentenceTransformer(model_name)
        
        # Load pre-computed embeddings
        if os.path.exists(embeddings_path):
            data = np.load(embeddings_path)
            self.news_ids = data['news_ids']
            self.embeddings = data['embeddings']
            print(f"Loaded {len(self.news_ids)} pre-computed embeddings")
        else:
            print(f"Warning: Embeddings file {embeddings_path} not found. Please run embed_articles.py first.")
            self.news_ids = []
            self.embeddings = np.array([])
    
    def embed_text(self, text: str) -> np.ndarray:
        """
        Embed a single text using SBERT
        """
        return self.model.encode(text)
    
    def find_similar_articles(self, query_text: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Find similar articles from the MIND dataset
        Returns: List of (news_id, similarity_score) tuples
        """
        if len(self.embeddings) == 0:
            return []
        
        # Embed the query
        query_embedding = self.embed_text(query_text)
        
        # Calculate similarities
        similarities = cosine_similarity([query_embedding], self.embeddings)[0]
        
        # Get top-k similar articles
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            news_id = self.news_ids[idx]
            similarity = similarities[idx]
            results.append((news_id, similarity))
        
        return results
    
    def recommend_from_live_articles(self, query_text: str, live_articles: List[Dict], top_k: int = 5) -> List[Dict]:
        """
        Recommend from live articles fetched from NewsAPI
        """
        if not live_articles:
            return []
        
        # Embed the query
        query_embedding = self.embed_text(query_text)
        
        # Embed all live articles
        live_texts = [article['combined_text'] for article in live_articles]
        live_embeddings = self.model.encode(live_texts)
        
        # Calculate similarities
        similarities = cosine_similarity([query_embedding], live_embeddings)[0]
        
        # Get top-k similar articles
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            article = live_articles[idx].copy()
            article['similarity_score'] = float(similarities[idx])
            results.append(article)
        
        return results
    
    def hybrid_recommend(self, query_text: str, live_articles: List[Dict], top_k: int = 10) -> Dict:
        """
        Hybrid recommendation: combine MIND dataset and live articles
        """
        # Get recommendations from both sources
        mind_recommendations = self.find_similar_articles(query_text, top_k=top_k//2)
        live_recommendations = self.recommend_from_live_articles(query_text, live_articles, top_k=top_k//2)
        
        return {
            'mind_recommendations': mind_recommendations,
            'live_recommendations': live_recommendations,
            'query': query_text
        } 