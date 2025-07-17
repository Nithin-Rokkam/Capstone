import pandas as pd
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import os
import time

def embed_articles_optimized(processed_csv, output_npz, model_name='all-MiniLM-L6-v2', batch_size=32):
    """
    Optimized embedding generation with batch processing
    """
    print(f"Loading model: {model_name}")
    model = SentenceTransformer(model_name)
    
    print("Loading processed articles...")
    df = pd.read_csv(processed_csv)
    texts = df['combined_text'].tolist()
    news_ids = df['news_id'].tolist()
    
    total_articles = len(texts)
    print(f"Total articles to embed: {total_articles:,}")
    print(f"Batch size: {batch_size}")
    
    # Process in batches
    embeddings = []
    start_time = time.time()
    
    for i in tqdm(range(0, total_articles, batch_size), desc="Embedding batches"):
        batch_texts = texts[i:i + batch_size]
        batch_embeddings = model.encode(batch_texts, show_progress_bar=False)
        embeddings.append(batch_embeddings)
        
        # Show progress every 10 batches
        if (i // batch_size) % 10 == 0:
            elapsed = time.time() - start_time
            processed = i + batch_size
            if processed > 0:
                rate = processed / elapsed
                remaining = (total_articles - processed) / rate
                print(f"\nProgress: {processed:,}/{total_articles:,} ({processed/total_articles*100:.1f}%)")
                print(f"Rate: {rate:.1f} articles/sec, ETA: {remaining/60:.1f} minutes")
    
    # Combine all embeddings
    print("Combining embeddings...")
    embeddings = np.vstack(embeddings)
    
    # Save to file
    print(f"Saving embeddings to {output_npz}...")
    np.savez_compressed(output_npz, news_ids=news_ids, embeddings=embeddings)
    
    total_time = time.time() - start_time
    print(f"✅ Embedding completed in {total_time/60:.1f} minutes")
    print(f"✅ Saved {len(news_ids):,} embeddings to {output_npz}")

if __name__ == "__main__":
    input_csv = os.path.join('data', 'processed_news.csv')
    output_npz = os.path.join('data', 'news_embeddings.npz')
    
    # Use larger batch size for faster processing
    embed_articles_optimized(input_csv, output_npz, batch_size=64) 