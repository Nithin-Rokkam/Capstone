import os
import pandas as pd
import numpy as np

def check_embedding_progress():
    """Check the progress of embedding generation"""
    
    # Check if embeddings file exists
    embeddings_path = "data/news_embeddings.npz"
    processed_csv_path = "data/processed_news.csv"
    
    print("=== Embedding Progress Check ===")
    
    # Check processed CSV
    if os.path.exists(processed_csv_path):
        df = pd.read_csv(processed_csv_path)
        total_articles = len(df)
        print(f"✓ Processed CSV found: {total_articles:,} articles")
    else:
        print("✗ Processed CSV not found")
        return
    
    # Check embeddings file
    if os.path.exists(embeddings_path):
        try:
            data = np.load(embeddings_path)
            embedded_articles = len(data['news_ids'])
            file_size = os.path.getsize(embeddings_path) / (1024 * 1024)  # MB
            print(f"✓ Embeddings file found: {embedded_articles:,} articles embedded")
            print(f"  File size: {file_size:.1f} MB")
            
            if embedded_articles == total_articles:
                print("🎉 All articles have been embedded!")
            else:
                print(f"⏳ Progress: {embedded_articles:,}/{total_articles:,} articles ({embedded_articles/total_articles*100:.1f}%)")
                
        except Exception as e:
            print(f"✗ Error reading embeddings file: {e}")
    else:
        print("⏳ Embeddings file not found yet - process is still running")
        print(f"  Waiting for {total_articles:,} articles to be embedded...")

if __name__ == "__main__":
    check_embedding_progress() 