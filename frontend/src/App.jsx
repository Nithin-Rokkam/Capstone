import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const NEWS_BG_URL = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80";
const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80";

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE_URL);
  const [trending, setTrending] = useState(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingCategory, setTrendingCategory] = useState('general');
  const [trendingPage, setTrendingPage] = useState(1);

  // List of categories for the picker
  const categories = [
    { value: 'general', label: 'General' },
    { value: 'business', label: 'Business' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'health', label: 'Health' },
    { value: 'science', label: 'Science' },
    { value: 'sports', label: 'Sports' },
    { value: 'technology', label: 'Technology' },
    { value: 'politics', label: 'Politics' }, // NewsAPI may not support this, but for UI completeness
    { value: 'geography', label: 'Geography' }, // Not a NewsAPI category, but for UI completeness
  ];

  // Reset page to 1 when category changes
  useEffect(() => {
    setTrendingPage(1);
  }, [trendingCategory]);

  // Fetch trending news when trendingCategory, trendingPage, or search is cleared
  useEffect(() => {
    if (!query.trim()) {
      setTrendingLoading(true);
      axios.get(`http://localhost:8000/trending?category=${trendingCategory}&page=${trendingPage}&_=${Date.now()}`)
        .then(res => {
          setTrending(res.data);
        })
        .catch(() => setTrending(null))
        .finally(() => setTrendingLoading(false));
    }
  }, [query, trendingCategory, trendingPage]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const response = await axios.post('http://localhost:8000/recommend', {
        query,
        top_k: 5,
        include_live: true,
        include_mind: false
      });
      setResults(response.data);
      // Fetch Unsplash image based on query
      try {
        const unsplashRes = await axios.get(
          "https://api.unsplash.com/search/photos",
          {
            params: { query: query, orientation: "landscape", per_page: 10 },
            headers: {
              Authorization: `Client-ID AjnFB-SWxZkKvBEm-ipkW-tJeMCamBk5bMdeyATxSNQ`,
            },
          }
        );
        if (unsplashRes.data.results && unsplashRes.data.results.length > 0) {
          setImageUrl(unsplashRes.data.results[0].urls.regular);
        } else {
          setImageUrl(DEFAULT_IMAGE_URL); // fallback
        }
      } catch (imgErr) {
        setImageUrl(DEFAULT_IMAGE_URL); // fallback
      }
    } catch (err) {
      setError('Failed to fetch recommendations. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // Handler for back button
  const handleBackToTrending = () => {
    setQuery('');
    setResults(null);
    setError('');
    setImageUrl(DEFAULT_IMAGE_URL);
  };

  // Handler for refreshing trending news
  const handleRefreshTrending = () => {
    setTrendingLoading(true);
    axios.get(`http://localhost:8000/trending?category=${trendingCategory}&page=${trendingPage}&_=${Date.now()}`)
      .then(res => {
        setTrending(res.data);
      })
      .catch(() => setTrending(null))
      .finally(() => setTrendingLoading(false));
  };

  // Pagination handlers
  const handleNextPage = () => setTrendingPage(p => p + 1);
  const handlePrevPage = () => setTrendingPage(p => Math.max(1, p - 1));

  return (
    <div className="main-layout split-layout">
      <div className="left-panel fill-panel">
        <header className="app-title">The News</header>
        <div className="container fill-container">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Enter a topic, keywords, or article text..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              required
            />
            <button type="submit" disabled={loading || !query.trim()}>
              {loading ? 'Loading...' : 'Get Recommendations'}
            </button>
          </form>
          {error && <div className="error">{error}</div>}
          {/* Trending news section (shown when no search results) */}
          {!query.trim() && (
            <div className="results">
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label htmlFor="category-picker" style={{ fontWeight: 600, marginRight: 8 }}>Trending Category:</label>
                <select
                  id="category-picker"
                  value={trendingCategory}
                  onChange={e => setTrendingCategory(e.target.value)}
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: '1rem', fontWeight: 500 }}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleRefreshTrending}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                  title="Refresh trending news"
                  disabled={trendingLoading}
                >
                  <span role="img" aria-label="refresh">🔄</span> Refresh
                </button>
              </div>
              <h2 className="results-title">Trending News of the Day <span style={{ fontSize: '1rem', fontWeight: 400 }}>[{categories.find(c => c.value === trendingCategory)?.label || trendingCategory}]</span></h2>
              <div className="rec-section">
                {trendingLoading ? (
                  <div>Loading trending news...</div>
                ) : trending && trending.articles && trending.articles.length > 0 ? (
                  <>
                    <ul>
                      {trending.articles.map((art, idx) => (
                        <li key={idx} className="article">
                          <a href={art.url} target="_blank" rel="noopener noreferrer"><b>{art.title}</b></a>
                          <div className="desc">{art.description}</div>
                          <div className="meta">
                            <span>Source: {art.source}</span>
                            <span>Published: {art.publishedAt && new Date(art.publishedAt).toLocaleString()}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                      <button
                        onClick={handlePrevPage}
                        disabled={trendingPage === 1 || trendingLoading}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          background: trendingPage === 1 ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 600,
                          border: 'none',
                          cursor: trendingPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                          transition: 'background 0.2s',
                        }}
                      >
                        ← Previous
                      </button>
                      <span style={{ fontWeight: 600 }}>Page {trendingPage}</span>
                      <button
                        onClick={handleNextPage}
                        disabled={trendingLoading}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                          transition: 'background 0.2s',
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </>
                ) : <div>No trending news found.</div>}
              </div>
            </div>
          )}
          {/* Existing recommendations section (shown when search is performed) */}
          {results && (
            <div className="results">
              <button
                onClick={handleBackToTrending}
                style={{
                  marginBottom: '1rem',
                  padding: '10px 24px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                  transition: 'background 0.2s',
                }}
              >
                ← Back to Trending News
              </button>
              <h2 className="results-title">Recommendations for: <span className="query">{results.query}</span></h2>
              <div className="rec-section">
                <h3>Live NewsAPI Recommendations</h3>
                {results.live_recommendations && results.live_recommendations.length > 0 ? (
                  <ul>
                    {results.live_recommendations.map((art, idx) => (
                      <li key={idx} className="article">
                        <a href={art.url} target="_blank" rel="noopener noreferrer"><b>{art.title}</b></a>
                        <div className="desc">{art.description}</div>
                        <div className="meta">
                          <span>Source: {art.source}</span>
                          <span>Score: {art.similarity_score?.toFixed(3)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <div>No live recommendations found.</div>}
              </div>
            </div>
          )}
          <footer>
            <p>
              <a
                href="https://github.com/Nithin-Rokkam/Real-Time-News-recommendations"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#667eea', textDecoration: 'none', fontWeight: '600', transition: 'color 0.3s ease' }}
                onMouseOver={(e) => e.target.style.color = '#764ba2'}
                onMouseOut={(e) => e.target.style.color = '#667eea'}
              >
                Powered by @Nithin Rokkam
              </a>
            </p>
          </footer>
        </div>
      </div>
      <div className="right-panel fill-panel">
        <img src={imageUrl} alt="Related to search" className="news-bg-img fill-img" />
      </div>
    </div>
  );
}

export default App;
