import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Home, Compass, History, User, LogOut, Search, 
  TrendingUp, BookmarkPlus, Eye, Clock, Settings,
  Lock, Mail, ChevronRight, Sparkles, X
} from 'lucide-react';
import './NewDashboard.css';

const NewDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('feed');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState([]);
  
  // Feed state
  const [feedArticles, setFeedArticles] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  
  // Explore state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendingArticles, setTrendingArticles] = useState([]);
  
  // History state
  const [history, setHistory] = useState([]);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileMessage, setProfileMessage] = useState('');

  const interests = [
    'Technology', 'Business', 'Sports', 'Entertainment',
    'Health', 'Science', 'Politics', 'World News',
    'Finance', 'Lifestyle', 'Travel', 'Food'
  ];

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/signin');
      return;
    }

    const name = localStorage.getItem('userName') || 'User';
    const email = localStorage.getItem('userEmail') || '';
    const userInterests = localStorage.getItem('userInterests');
    
    setUserName(name);
    setUserEmail(email);
    setProfileData(prev => ({ ...prev, name, email }));
    
    if (!userInterests) {
      setIsNewUser(true);
    } else {
      setSelectedInterests(JSON.parse(userInterests));
      fetchFeedArticles(JSON.parse(userInterests));
    }

    loadHistory();
  }, [navigate]);

  const handleInterestToggle = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSaveInterests = () => {
    if (selectedInterests.length === 0) {
      alert('Please select at least one interest');
      return;
    }
    localStorage.setItem('userInterests', JSON.stringify(selectedInterests));
    setIsNewUser(false);
    fetchFeedArticles(selectedInterests);
  };

  const fetchFeedArticles = async (interests) => {
    setFeedLoading(true);
    try {
      // Simulate API call with interests
      const category = interests[0]?.toLowerCase() || 'general';
      const response = await axios.get(
        `http://localhost:8000/api/trending?category=${category}&page=1`
      );
      setFeedArticles(response.data.articles || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
      setFeedArticles([]);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/recommend', {
        query: searchQuery
      });
      
      // Only use live recommendations, ignore MIND dataset
      const liveRecs = response.data.live_recommendations || [];
      
      setSearchResults(liveRecs);
      addToHistory(searchQuery, liveRecs);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/trending?category=general&page=1');
      setTrendingArticles(response.data.articles || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const addToHistory = (query, results) => {
    const historyItem = {
      id: Date.now(),
      query,
      timestamp: new Date().toISOString(),
      resultsCount: results.length
    };
    
    const currentHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const updatedHistory = [historyItem, ...currentHistory].slice(0, 50);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
  };

  const loadHistory = () => {
    const savedHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setHistory(savedHistory);
  };

  const clearHistory = () => {
    localStorage.removeItem('searchHistory');
    setHistory([]);
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    localStorage.setItem('userName', profileData.name);
    setUserName(profileData.name);
    setProfileMessage('Profile updated successfully!');
    setTimeout(() => setProfileMessage(''), 3000);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (profileData.newPassword !== profileData.confirmPassword) {
      setProfileMessage('Passwords do not match!');
      return;
    }
    // Simulate password change
    setProfileMessage('Password changed successfully!');
    setProfileData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
    setTimeout(() => setProfileMessage(''), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  const renderArticleCard = (article, index) => (
    <div key={index} className="article-card">
      {article.urlToImage && (
        <div className="article-image">
          <img src={article.urlToImage} alt={article.title} />
        </div>
      )}
      <div className="article-content">
        <div className="article-meta">
          <span className="article-source">{article.source?.name || 'Unknown'}</span>
          <span className="article-date">
            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Recent'}
          </span>
        </div>
        <h3 className="article-title">{article.title}</h3>
        <p className="article-description">{article.description}</p>
        <div className="article-actions">
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="read-more-btn"
          >
            Read Full Article
            <ChevronRight size={16} />
          </a>
          <button className="bookmark-btn">
            <BookmarkPlus size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="new-dashboard">
      {/* Side Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="Pigeon" className="sidebar-logo" />
          <span className="sidebar-brand">Pigeon</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeSection === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveSection('feed')}
          >
            <Home size={20} />
            <span>Feed</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'explore' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('explore');
              if (trendingArticles.length === 0) fetchTrending();
            }}
          >
            <Compass size={20} />
            <span>Explore</span>
          </button>
          <button
            className={`nav-item ${activeSection === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSection('history')}
          >
            <History size={20} />
            <span>History</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className={`nav-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <div className="profile-preview">
              <img src="/logo.png" alt={userName} className="profile-avatar" />
              <div className="profile-info">
                <span className="profile-name">{userName}</span>
                <span className="profile-email">{userEmail}</span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="content-header">
          <h1 className="section-heading">
            {activeSection === 'feed' && 'Your Feed'}
            {activeSection === 'explore' && 'Explore'}
            {activeSection === 'history' && 'Search History'}
            {activeSection === 'profile' && 'Profile Settings'}
          </h1>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </header>

        {/* Feed Section */}
        {activeSection === 'feed' && (
          <div className="feed-section">
            {isNewUser ? (
              <div className="interest-selection">
                <div className="interest-header">
                  <Sparkles size={32} />
                  <h2>Welcome to Pigeon!</h2>
                  <p>Select your interests to personalize your news feed</p>
                </div>
                <div className="interests-grid">
                  {interests.map(interest => (
                    <button
                      key={interest}
                      className={`interest-chip ${selectedInterests.includes(interest) ? 'selected' : ''}`}
                      onClick={() => handleInterestToggle(interest)}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                <button 
                  className="save-interests-btn"
                  onClick={handleSaveInterests}
                  disabled={selectedInterests.length === 0}
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="feed-content">
                <div className="feed-header">
                  <div className="interests-display">
                    <span className="interests-label">Your interests:</span>
                    {selectedInterests.map(interest => (
                      <span key={interest} className="interest-tag">{interest}</span>
                    ))}
                    <button 
                      className="edit-interests-btn"
                      onClick={() => setIsNewUser(true)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
                
                {feedLoading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your personalized feed...</p>
                  </div>
                ) : feedArticles.length > 0 ? (
                  <div className="articles-grid">
                    {feedArticles.map((article, index) => renderArticleCard(article, index))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Home size={48} />
                    <h3>No articles yet</h3>
                    <p>Check back later for personalized recommendations</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Explore Section */}
        {activeSection === 'explore' && (
          <div className="explore-section">
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-wrapper">
                  <Search size={20} />
                  <input
                    type="text"
                    placeholder="Search for news articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="clear-search"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <button type="submit" className="search-btn" disabled={searchLoading}>
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {searchResults.length > 0 ? (
              <div className="search-results">
                <h3 className="results-title">
                  Search Results ({searchResults.length})
                </h3>
                <div className="articles-grid">
                  {searchResults.map((article, index) => renderArticleCard(article, index))}
                </div>
              </div>
            ) : (
              <div className="trending-section">
                <div className="trending-header">
                  <TrendingUp size={24} />
                  <h3>Trending Now</h3>
                </div>
                {trendingArticles.length > 0 ? (
                  <div className="articles-grid">
                    {trendingArticles.map((article, index) => renderArticleCard(article, index))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Compass size={48} />
                    <h3>Discover News</h3>
                    <p>Search for topics you're interested in</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* History Section */}
        {activeSection === 'history' && (
          <div className="history-section">
            <div className="history-header">
              <h3>Recent Searches</h3>
              {history.length > 0 && (
                <button className="clear-history-btn" onClick={clearHistory}>
                  Clear All
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="history-list">
                {history.map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-icon">
                      <Clock size={20} />
                    </div>
                    <div className="history-content">
                      <h4 className="history-query">{item.query}</h4>
                      <div className="history-meta">
                        <span className="history-date">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <span className="history-results">
                          {item.resultsCount} results
                        </span>
                      </div>
                    </div>
                    <button
                      className="history-action"
                      onClick={() => {
                        setSearchQuery(item.query);
                        setActiveSection('explore');
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <History size={48} />
                <h3>No Search History</h3>
                <p>Your search history will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="profile-section">
            {profileMessage && (
              <div className="profile-message">
                {profileMessage}
              </div>
            )}

            <div className="profile-grid">
              {/* Left Side - Profile Info */}
              <div className="profile-info-card">
                <div className="profile-avatar-section">
                  <img src="/logo.png" alt={userName} className="profile-avatar-large" />
                  <h2>{userName}</h2>
                  <p className="profile-email-text">{userEmail}</p>
                </div>
                
                <div className="profile-stats">
                  <div className="stat-item">
                    <div className="stat-icon">
                      <Settings size={20} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-label">Account Status</span>
                      <span className="stat-value">Active</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">
                      <Clock size={20} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-label">Member Since</span>
                      <span className="stat-value">2025</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Forms */}
              <div className="profile-forms-grid">
                {/* Update Profile */}
                <div className="profile-form-card">
                  <h3 className="form-title">
                    <User size={20} />
                    Update Profile
                  </h3>
                  <form onSubmit={handleProfileUpdate} className="profile-form-compact">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          placeholder="Your name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          placeholder="Your email"
                          disabled
                        />
                      </div>
                    </div>
                    <button type="submit" className="profile-submit-btn">
                      Save Changes
                    </button>
                  </form>
                </div>

                {/* Change Password */}
                <div className="profile-form-card">
                  <h3 className="form-title">
                    <Lock size={20} />
                    Change Password
                  </h3>
                  <form onSubmit={handlePasswordChange} className="profile-form-compact">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Current Password</label>
                        <input
                          type="password"
                          value={profileData.currentPassword}
                          onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                          placeholder="Current password"
                        />
                      </div>
                      <div className="form-group">
                        <label>New Password</label>
                        <input
                          type="password"
                          value={profileData.newPassword}
                          onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                          placeholder="New password"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                        placeholder="Confirm password"
                      />
                    </div>
                    <button type="submit" className="profile-submit-btn">
                      Update Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewDashboard;
