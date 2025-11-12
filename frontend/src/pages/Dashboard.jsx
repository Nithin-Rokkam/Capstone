import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Newspaper, LogOut, Search, RefreshCw, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trending, setTrending] = useState(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingCategory, setTrendingCategory] = useState('general');
  const [trendingPage, setTrendingPage] = useState(1);
  const [userName, setUserName] = useState('');

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'business', label: 'Business' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'health', label: 'Health' },
    { value: 'science', label: 'Science' },
    { value: 'sports', label: 'Sports' },
    { value: 'technology', label: 'Technology' },
  ];

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/signin');
      return;
    }

    const name = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'User';
    setUserName(name);
  }, [navigate]);

  useEffect(() => {
    setTrendingPage(1);
  }, [trendingCategory]);

  useEffect(() => {
    if (!query.trim()) {
      fetchTrending();
    }
  }, [query, trendingCategory, trendingPage]);

  const fetchTrending = () => {
    setTrendingLoading(true);
    axios.get(`http://localhost:8000/trending?category=${trendingCategory}&page=${trendingPage}&_=${Date.now()}`)
      .then(res => {
        setTrending(res.data);
      })
      .catch(() => setTrending(null))
      .finally(() => setTrendingLoading(false));
  };

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
    } catch (err) {
      setError('Failed to fetch recommendations. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    navigate('/');
  };

  const handleBackToTrending = () => {
    setQuery('');
    setResults(null);
    setError('');
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo">
            <img src="/logo.png" alt="Pigeon Logo" className="dashboard-logo-image" />
            <span className="dashboard-logo-text">Pigeon</span>
          </div>
          <div className="dashboard-user">
            <span className="user-greeting">Welcome, {userName}</span>
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Search Section */}
          <div className="search-section">
            <h1 className="dashboard-title">Your Personalized News Feed</h1>
            <form onSubmit={handleSearch} className="dashboard-search-form">
              <div className="search-input-wrapper">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search for topics, keywords, or article text..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <button type="submit" disabled={loading || !query.trim()} className="search-button">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          {/* Trending News Section */}
          {!query.trim() && (
            <div className="news-section">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <TrendingUp size={24} />
                  <h2 className="section-title">Trending News</h2>
                </div>
                <div className="section-controls">
                  <select
                    value={trendingCategory}
                    onChange={e => setTrendingCategory(e.target.value)}
                    className="category-select"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <button onClick={fetchTrending} className="refresh-button" disabled={trendingLoading}>
                    <RefreshCw size={18} className={trendingLoading ? 'spinning' : ''} />
                  </button>
                </div>
              </div>

              {trendingLoading ? (
                <div className="loading-state">Loading trending news...</div>
              ) : trending && trending.articles && trending.articles.length > 0 ? (
                <>
                  <div className="news-grid">
                    {trending.articles.map((article, idx) => (
                      <article key={idx} className="news-card">
                        <div className="news-card-content">
                          <h3 className="news-card-title">
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                              {article.title}
                            </a>
                          </h3>
                          <p className="news-card-description">{article.description}</p>
                          <div className="news-card-meta">
                            <span className="news-source">{article.source}</span>
                            <span className="news-date">
                              {article.publishedAt && new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="pagination">
                    <button
                      onClick={() => setTrendingPage(p => Math.max(1, p - 1))}
                      disabled={trendingPage === 1 || trendingLoading}
                      className="pagination-button"
                    >
                      Previous
                    </button>
                    <span className="pagination-info">Page {trendingPage}</span>
                    <button
                      onClick={() => setTrendingPage(p => p + 1)}
                      disabled={trendingLoading}
                      className="pagination-button"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">No trending news found.</div>
              )}
            </div>
          )}

          {/* Search Results Section */}
          {results && (
            <div className="news-section">
              <button onClick={handleBackToTrending} className="back-to-trending">
                ← Back to Trending
              </button>
              <div className="section-header">
                <h2 className="section-title">
                  Recommendations for: <span className="query-highlight">{results.query}</span>
                </h2>
              </div>

              {results.live_recommendations && results.live_recommendations.length > 0 ? (
                <div className="news-grid">
                  {results.live_recommendations.map((article, idx) => (
                    <article key={idx} className="news-card">
                      <div className="news-card-content">
                        <h3 className="news-card-title">
                          <a href={article.url} target="_blank" rel="noopener noreferrer">
                            {article.title}
                          </a>
                        </h3>
                        <p className="news-card-description">{article.description}</p>
                        <div className="news-card-meta">
                          <span className="news-source">{article.source}</span>
                          <span className="news-score">
                            Score: {article.similarity_score?.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No recommendations found.</div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>
          Powered by{' '}
          <a
            href="https://github.com/Nithin-Rokkam/Real-Time-News-recommendations"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Pigeon
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
