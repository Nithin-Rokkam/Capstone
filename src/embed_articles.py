import pandas as pd
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import os

def embed_articles(processed_csv, output_npz, model_name='all-MiniLM-L6-v2'):
    df = pd.read_csv(processed_csv)
    texts = df['combined_text'].tolist()
    news_ids = df['news_id'].tolist()
    model = SentenceTransformer(model_name)
    embeddings = []
    for text in tqdm(texts, desc='Embedding articles'):
        emb = model.encode(text)
        embeddings.append(emb)
    embeddings = np.vstack(embeddings)
    np.savez_compressed(output_npz, news_ids=news_ids, embeddings=embeddings)
    print(f"Embeddings saved to {output_npz}")

if __name__ == "__main__":
    input_csv = os.path.join('data', 'processed_news.csv')
    output_npz = os.path.join('data', 'news_embeddings.npz')
    embed_articles(input_csv, output_npz) 