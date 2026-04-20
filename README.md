# News Recommender Enhanced API

A sophisticated news recommendation system that combines SBERT embeddings with RSS feed integration to provide personalized news recommendations.

## Features

- **Content-Based Recommendations**: Uses SBERT embeddings to find semantically similar articles
- **Live News Integration**: Fetches real-time news from RSS feeds
- **Hybrid Approach**: Combines pre-trained embeddings with live article recommendations
- **FastAPI Backend**: RESTful API with automatic documentation
- **Semantic Search**: Advanced NLP-based similarity matching

## Architecture

1. **Data Processing**: MIND dataset preprocessing and embedding generation
2. **Recommendation Engine**: SBERT + Cosine Similarity for content-based recommendations
3. **RSS Feed Integration**: Real-time news fetching from multiple RSS sources
4. **FastAPI Server**: RESTful endpoints for recommendations

## Setup Instructions

### 1. Environment Setup

```powershell
# Create virtual environment
python -m venv newsrec-env

# Activate environment (Windows PowerShell)
.\newsrec-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Data Preparation

```powershell
# Preprocess MIND dataset
python src/data_preprocessing.py

# Generate embeddings (this may take a while)
python src/embed_articles.py
```

### 3. Test the System

```powershell
# Run tests to verify everything works
python test_api.py
```

### 4. Start the API Server

```powershell
# Start the FastAPI server
python src/main.py
```

The API will be available at: http://localhost:8000

## API Endpoints

### Health Check
- **GET** `/health` - Check system status and embeddings

### Search Articles
- **POST** `/search` - Search for articles using RSS feeds
- **GET** `/top-headlines` - Get top headlines by category

### RSS Feed Categories
- **GET** `/categories` - Get available news categories
- **GET** `/feeds/{category}` - Get RSS feed URLs for a category
- **POST** `/cache/clear` - Clear deduplication cache

### Recommendations
- **POST** `/recommend` - Get personalized news recommendations

## Usage Examples

### 1. Get Recommendations

```bash
curl -X POST "http://localhost:8000/recommend" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "artificial intelligence in healthcare",
       "top_k": 10,
       "include_live": true,
       "include_mind": true
     }'
```

### 2. Search Articles

```bash
curl -X POST "http://localhost:8000/search" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "climate change",
       "top_k": 5,
       "language": "en"
     }'
```

### 3. Get Top Headlines

```bash
curl "http://localhost:8000/top-headlines?category=technology&country=us"
```

## API Documentation

Once the server is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## Project Structure

```
News-Recommender-Enhanced-API/
├── data/                    # MIND datasets and processed data
│   ├── MINDlarge_train/     # Training dataset
│   ├── MINDlarge_dev/       # Validation dataset
│   ├── MINDlarge_test/      # Test dataset
│   ├── processed_news.csv   # Preprocessed articles
│   └── news_embeddings.npz  # Pre-computed embeddings
├── src/                     # Source code
│   ├── data_preprocessing.py # Data preprocessing script
│   ├── embed_articles.py    # Embedding generation script
│   ├── rss_client.py        # RSS feed integration
│   ├── newsapi_client.py    # Legacy NewsAPI integration (deprecated)
│   ├── recommender.py       # Recommendation engine
│   └── main.py             # FastAPI application
├── test_api.py             # Test script
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Technical Details

### Recommendation Algorithm
- **Embedding Model**: Sentence-BERT (all-MiniLM-L6-v2)
- **Similarity Metric**: Cosine Similarity
- **Data Sources**: MIND dataset + RSS feed articles
- **Scoring**: similarity_score * 0.6 + recency_score * 0.4

### Performance
- **Embedding Generation**: ~1-2 minutes for MIND dataset
- **Recommendation Speed**: <100ms per query
- **API Response Time**: ~5-10s including RSS feed parsing (optimized)
- **Deduplication**: Title, URL, and content similarity based
- **Feed Parsing**: 2 feeds per category for optimal speed

## RSS Feed Configuration

### Supported Categories
The system supports 12 news categories with 2 optimized RSS feeds each for faster parsing:
- **Technology**: TechCrunch, Wired
- **Business**: CNBC, Wall Street Journal
- **Sports**: ESPN, BBC Sport
- **Entertainment**: Variety, Hollywood Reporter
- **Health**: BBC Health, WHO
- **Science**: Science Daily, BBC Science
- **Politics**: BBC Politics, Politico
- **World**: BBC World, CNN World
- **Finance**: Moneycontrol, Investing
- **Lifestyle**: Vogue, GQ
- **Travel**: Lonely Planet, CN Traveler
- **Food**: Serious Eats, Epicurious

### Feed Features
- **Deduplication**: Automatic removal of duplicate articles
- **Scoring Algorithm**: similarity_score * 0.6 + recency_score * 0.4
- **Real-time Parsing**: Fresh content from RSS feeds

### Model Configuration
- **SBERT Model**: `all-MiniLM-L6-v2` (fast and accurate)
- **Embedding Dimension**: 384
- **Similarity Threshold**: Configurable per request

## Troubleshooting

### Common Issues

1. **Embeddings not found**: Run `python src/embed_articles.py`
2. **RSS feed errors**: Check feed URLs and network connectivity
3. **Memory issues**: Reduce batch size in embedding generation

### Logs
Check the console output for detailed error messages and system status.

## Future Enhancements

- User authentication and personalization
- Advanced filtering options
- Caching for improved performance
- Web interface for easier interaction
- Multi-language support

## License

This project is for educational and research purposes. 