import pandas as pd
from tqdm import tqdm
import os

def preprocess_news(news_path, output_path):
    # Load news.tsv
    news_df = pd.read_csv(news_path, sep='\t', header=None, names=[
        'news_id', 'category', 'subcategory', 'title', 'abstract', 'url', 'title_entities', 'abstract_entities'
    ])
    # Combine title and abstract, fill NaN with empty string
    news_df['combined_text'] = (news_df['title'].fillna('') + '. ' + news_df['abstract'].fillna('')).str.strip()
    # Keep only news_id and combined_text
    processed_df = news_df[['news_id', 'combined_text']]
    # Save to CSV
    processed_df.to_csv(output_path, index=False)
    print(f"Processed news saved to {output_path}")

if __name__ == "__main__":
    input_path = os.path.join('data', 'MINDlarge_train', 'news.tsv')
    output_path = os.path.join('data', 'processed_news.csv')
    preprocess_news(input_path, output_path) 