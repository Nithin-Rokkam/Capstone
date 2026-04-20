import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Home, Compass, History, User, LogOut, Search, 
  TrendingUp, BookmarkPlus, Eye, Clock, Settings,
  Lock, Mail, ChevronRight, Sparkles, X, MapPin
} from 'lucide-react';
import './NewDashboard.css';

const allInterestOption = 'All';
const baseInterests = [
  'Technology', 'Business', 'Sports', 'Entertainment',
  'Health', 'Science', 'Politics', 'World News',
  'Finance', 'Lifestyle', 'Travel', 'Food'
];
const interests = [allInterestOption, ...baseInterests];
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

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
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(false);
  
  // Explore state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [trendingArticles, setTrendingArticles] = useState([]);
  
  // History state
  const [history, setHistory] = useState([]);
  const [bookmarkedUrls, setBookmarkedUrls] = useState(new Set());
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    locationCountry: '',
    locationState: '',
    locationCity: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileLocationCodes, setProfileLocationCodes] = useState({ countryCode: '', stateCode: '' });
  const [locationLibrary, setLocationLibrary] = useState(null);
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const hasHandledUnauthorized = useRef(false);
  const hasInitialized = useRef(false);

  const handleUnauthorized = useCallback(() => {
    if (hasHandledUnauthorized.current) return;
    hasHandledUnauthorized.current = true;
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authToken');
    navigate('/signin');
  }, [navigate]);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, [handleUnauthorized]);

  const getAuthConfig = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token || token === 'undefined' || token === 'null') return null;
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }, []);

  const getLocationWithFallback = useCallback(async (email, authConfig) => {
    const encodedEmail = encodeURIComponent(email);
    const paths = [
      `/api/users/${encodedEmail}/location`,
      `/users/${encodedEmail}/location`
    ];

    let lastError = null;
    for (const path of paths) {
      try {
        return await axios.get(`${API_BASE}${path}`, authConfig);
      } catch (error) {
        lastError = error;
        if (error?.response?.status !== 404) {
          throw error;
        }
      }
    }

    throw lastError;
  }, []);

  const updateLocationWithFallback = useCallback(async (email, payload, authConfig) => {
    const encodedEmail = encodeURIComponent(email);
    const paths = [
      `/api/users/${encodedEmail}/location`,
      `/users/${encodedEmail}/location`
    ];

    let lastError = null;
    for (const path of paths) {
      try {
        return await axios.put(`${API_BASE}${path}`, payload, authConfig);
      } catch (error) {
        lastError = error;
        if (error?.response?.status !== 404) {
          throw error;
        }
      }
    }

    throw lastError;
  }, []);

  const mergeUniqueArticles = useCallback((existing, incoming) => {
    const normalize = (value) => (value || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
    const keyFor = (article) => {
      const title = normalize(article?.title);
      const description = normalize(article?.description).slice(0, 140);
      const url = (article?.url || '').toLowerCase().trim();
      return `${title}|${description}|${url}`;
    };

    const seen = new Set(existing.map((article) => keyFor(article)));
    const appended = incoming.filter((article) => {
      if (!article?.url || !article?.title) return false;
      const key = keyFor(article);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return [...existing, ...appended];
  }, []);

  const fetchFeedArticles = useCallback(async (interests, page = 1, append = false) => {
    setFeedLoading(true);
    try {
      const primaryInterest = interests?.[0] || 'news';
      const persistedEmail = localStorage.getItem('userEmail') || '';
      const response = await axios.post(`${API_BASE}/api/feed`, {
        query: primaryInterest,
        interests,
        user_email: persistedEmail,
        top_k: 12,
        page,
        per_page: 12
      });
      const incoming = response.data.live_recommendations || response.data.articles || [];
      setFeedArticles((prev) => append ? mergeUniqueArticles(prev, incoming) : incoming);
      setFeedPage(page);
      setFeedHasMore(Boolean(response.data.has_more));
    } catch (error) {
      console.error('Error fetching feed:', error);
      if (!append) setFeedArticles([]);
      setFeedHasMore(false);
    } finally {
      setFeedLoading(false);
    }
  }, [mergeUniqueArticles]);

  const restoreScrollPosition = (scrollTop) => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollTop, behavior: 'auto' });
    });
  };

  const syncUserDataFromServer = useCallback(async (email) => {
    if (!email) return;

    try {
      const authConfig = getAuthConfig();
      if (!authConfig) {
        handleUnauthorized();
        return;
      }
      const [interestsResponse, historyResponse, bookmarksResponse] = await Promise.all([
        axios.get(`${API_BASE}/api/users/${encodeURIComponent(email)}/interests`, authConfig),
        axios.get(`${API_BASE}/api/users/${encodeURIComponent(email)}/history`, authConfig),
        axios.get(`${API_BASE}/api/users/${encodeURIComponent(email)}/bookmarks`, authConfig)
      ]);

      let locationResponse = null;
      try {
        locationResponse = await getLocationWithFallback(email, authConfig);
      } catch (locationError) {
        if (locationError?.response?.status !== 404) {
          throw locationError;
        }
      }

      const dbInterests = interestsResponse?.data?.interests || [];
      if (dbInterests.length > 0) {
        const withAll = dbInterests.length === baseInterests.length
          ? [allInterestOption, ...baseInterests]
          : dbInterests;

        setSelectedInterests(withAll);
        setIsNewUser(false);
        localStorage.setItem('userInterests', JSON.stringify(dbInterests));
        fetchFeedArticles(dbInterests, 1, false);
      }

      const dbHistory = historyResponse?.data?.history || [];
      if (dbHistory.length >= 0) {
        setHistory(dbHistory);
        localStorage.setItem('searchHistory', JSON.stringify(dbHistory));
      }

      const bookmarks = bookmarksResponse?.data?.bookmarks || [];
      setBookmarkedUrls(new Set(bookmarks.map((bookmark) => bookmark.url)));

      const location = locationResponse?.data?.location || {};
      setProfileData((prev) => ({
        ...prev,
        locationCountry: location.country_name || location.country_code || '',
        locationState: location.region || '',
        locationCity: location.city || ''
      }));
      setProfileLocationCodes({
        countryCode: (location.country_code || '').toUpperCase(),
        stateCode: ''
      });
    } catch (error) {
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Error syncing user data from server:', error);
    }
  }, [fetchFeedArticles, getAuthConfig, getLocationWithFallback, handleUnauthorized]);

  const loadHistory = useCallback(async (email) => {
    if (email) {
      try {
        const authConfig = getAuthConfig();
        if (!authConfig) {
          handleUnauthorized();
          return;
        }
        const response = await axios.get(`${API_BASE}/api/users/${encodeURIComponent(email)}/history`, authConfig);
        const dbHistory = response?.data?.history || [];
        setHistory(dbHistory);
        localStorage.setItem('searchHistory', JSON.stringify(dbHistory));
        return;
      } catch (error) {
        if (error?.response?.status === 401) {
          handleUnauthorized();
          return;
        }
        console.error('Error loading history from server:', error);
      }
    }

    const savedHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setHistory(savedHistory);
  }, [getAuthConfig, handleUnauthorized]);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const isAuth = localStorage.getItem('isAuthenticated');
    const token = localStorage.getItem('authToken');
    if (!isAuth || !token) {
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
      const parsedInterests = JSON.parse(userInterests);
      if (parsedInterests.length === baseInterests.length) {
        setSelectedInterests([allInterestOption, ...baseInterests]);
      } else {
        setSelectedInterests(parsedInterests);
      }
      fetchFeedArticles(parsedInterests, 1, false);
    }

    loadHistory(email);
    syncUserDataFromServer(email);
  }, [navigate, fetchFeedArticles, loadHistory, syncUserDataFromServer]);

  useEffect(() => {
    let cancelled = false;
    const loadLocationLibrary = async () => {
      if (activeSection !== 'profile' || locationLibrary) return;
      try {
        const library = await import('country-state-city');
        if (cancelled) return;
        setLocationLibrary(library);
        const allCountries = library.Country.getAllCountries()
          .map((country) => ({ name: country.name, isoCode: country.isoCode }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryOptions(allCountries);
      } catch (error) {
        console.error('Error loading location library:', error);
      }
    };

    loadLocationLibrary();

    return () => {
      cancelled = true;
    };
  }, [activeSection, locationLibrary]);

  useEffect(() => {
    if (!locationLibrary || !profileLocationCodes.countryCode) {
      setStateOptions([]);
      setCityOptions([]);
      return;
    }

    const states = locationLibrary.State.getStatesOfCountry(profileLocationCodes.countryCode)
      .map((state) => ({ name: state.name, isoCode: state.isoCode }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setStateOptions(states);
  }, [locationLibrary, profileLocationCodes.countryCode]);

  useEffect(() => {
    if (!locationLibrary || !profileLocationCodes.countryCode || !profileLocationCodes.stateCode) {
      setCityOptions([]);
      return;
    }

    const cities = locationLibrary.City.getCitiesOfState(profileLocationCodes.countryCode, profileLocationCodes.stateCode)
      .map((city) => city.name)
      .sort((a, b) => a.localeCompare(b));
    setCityOptions(cities);
  }, [locationLibrary, profileLocationCodes.countryCode, profileLocationCodes.stateCode]);

  useEffect(() => {
    if (!profileData.locationCountry || profileLocationCodes.countryCode || countryOptions.length === 0) return;
    const match = countryOptions.find((country) => country.name.toLowerCase() === profileData.locationCountry.toLowerCase().trim());
    if (match) {
      setProfileLocationCodes((prev) => ({ ...prev, countryCode: match.isoCode }));
    }
  }, [countryOptions, profileData.locationCountry, profileLocationCodes.countryCode]);

  useEffect(() => {
    if (!profileData.locationState || profileLocationCodes.stateCode || stateOptions.length === 0) return;
    const match = stateOptions.find((state) => state.name.toLowerCase() === profileData.locationState.toLowerCase().trim());
    if (match) {
      setProfileLocationCodes((prev) => ({ ...prev, stateCode: match.isoCode }));
    }
  }, [stateOptions, profileData.locationState, profileLocationCodes.stateCode]);

  const handleInterestToggle = (interest) => {
    setSelectedInterests((prev) => {
      const selectedBase = prev.filter((item) => item !== allInterestOption);

      if (interest === allInterestOption) {
        const allSelected = selectedBase.length === baseInterests.length;
        return allSelected ? [] : [allInterestOption, ...baseInterests];
      }

      const nextBase = selectedBase.includes(interest)
        ? selectedBase.filter((item) => item !== interest)
        : [...selectedBase, interest];

      if (nextBase.length === baseInterests.length) {
        return [allInterestOption, ...baseInterests];
      }

      return nextBase;
    });
  };

  const handleSaveInterests = async () => {
    if (selectedInterests.length === 0) {
      alert('Please select at least one interest');
      return;
    }

    const interestsToSave = selectedInterests.includes(allInterestOption)
      ? baseInterests
      : selectedInterests;

    setSavingInterests(true);

    // Persist locally first so the user can always continue.
    setSelectedInterests(interestsToSave);
    localStorage.setItem('userInterests', JSON.stringify(interestsToSave));
    setIsNewUser(false);
    fetchFeedArticles(interestsToSave, 1, false);

    try {
      if (userEmail) {
        const authConfig = getAuthConfig();
        if (!authConfig) {
          handleUnauthorized();
          setSavingInterests(false);
          return;
        }
        await axios.put(`${API_BASE}/api/users/${encodeURIComponent(userEmail)}/interests`, {
          interests: interestsToSave
        }, authConfig);
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        handleUnauthorized();
        setSavingInterests(false);
        return;
      }
      console.error('Error saving interests:', error);
      // Keep the user moving even if backend persistence fails temporarily.
      alert('Interests applied locally. Server sync will retry later.');
    } finally {
      setSavingInterests(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/recommend`, {
        query: searchQuery,
        interests: selectedInterests.includes(allInterestOption)
          ? baseInterests
          : selectedInterests,
        top_k: 12,
        page: 1,
        per_page: 12
      });
      
      const liveRecs = response.data.live_recommendations || response.data.articles || [];
      
      setSearchResults(liveRecs);
      setSearchPage(1);
      setSearchHasMore(Boolean(response.data.has_more));
      await addToHistory(searchQuery, liveRecs);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
      setSearchHasMore(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadMoreSearchResults = async () => {
    if (!searchQuery.trim() || searchLoading || !searchHasMore) return;

    const nextPage = searchPage + 1;
    const currentScrollTop = window.scrollY;
    setSearchLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/recommend`, {
        query: searchQuery,
        interests: selectedInterests.includes(allInterestOption)
          ? baseInterests
          : selectedInterests,
        top_k: 12,
        page: nextPage,
        per_page: 12
      });

      const incoming = response.data.live_recommendations || response.data.articles || [];
      setSearchResults((prev) => mergeUniqueArticles(prev, incoming));
      setSearchPage(nextPage);
      setSearchHasMore(Boolean(response.data.has_more));
      restoreScrollPosition(currentScrollTop);
    } catch (error) {
      console.error('Error loading more search results:', error);
      setSearchHasMore(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/trending?top_k=20`);
      setTrendingArticles(response.data.articles || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const loadMoreFeedArticles = async () => {
    if (feedLoading || !feedHasMore) return;

    const nextPage = feedPage + 1;
    const currentScrollTop = window.scrollY;
    const interestsToUse = selectedInterests.includes(allInterestOption)
      ? baseInterests
      : selectedInterests;

    await fetchFeedArticles(interestsToUse, nextPage, true);
    restoreScrollPosition(currentScrollTop);
  };

  const addToHistory = async (query, results) => {
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

    if (userEmail) {
      try {
        const authConfig = getAuthConfig();
        if (!authConfig) {
          handleUnauthorized();
          return;
        }
        await axios.post(`${API_BASE}/api/users/${encodeURIComponent(userEmail)}/history`, {
          query,
          results_count: results.length
        }, authConfig);
      } catch (error) {
        if (error?.response?.status === 401) {
          handleUnauthorized();
          return;
        }
        console.error('Error persisting history:', error);
      }
    }
  };

  const clearHistory = async () => {
    if (userEmail) {
      try {
        const authConfig = getAuthConfig();
        if (!authConfig) {
          handleUnauthorized();
          return;
        }
        await axios.delete(`${API_BASE}/api/users/${encodeURIComponent(userEmail)}/history`, authConfig);
      } catch (error) {
        if (error?.response?.status === 401) {
          handleUnauthorized();
          return;
        }
        console.error('Error clearing server history:', error);
      }
    }

    localStorage.removeItem('searchHistory');
    setHistory([]);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      if (userEmail) {
        const authConfig = getAuthConfig();
        if (!authConfig) {
          handleUnauthorized();
          return;
        }
        const response = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(userEmail)}/profile`, {
          name: profileData.name
        }, authConfig);
        const updatedName = response?.data?.user?.name || profileData.name;
        localStorage.setItem('userName', updatedName);
        setUserName(updatedName);
      } else {
        localStorage.setItem('userName', profileData.name);
        setUserName(profileData.name);
      }

      setProfileMessage('Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (error) {
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Error updating profile:', error);
      setProfileMessage('Profile update failed. Please try again.');
      setTimeout(() => setProfileMessage(''), 3000);
    }
  };

  const handleBookmarkToggle = async (article) => {
    if (!userEmail || !article?.url) {
      return;
    }

    const authConfig = getAuthConfig();
    if (!authConfig) {
      handleUnauthorized();
      return;
    }
    const encodedEmail = encodeURIComponent(userEmail);
    const isBookmarked = bookmarkedUrls.has(article.url);

    try {
      if (isBookmarked) {
        await axios.delete(`${API_BASE}/api/users/${encodedEmail}/bookmarks`, {
          ...authConfig,
          params: { url: article.url }
        });
        setBookmarkedUrls((prev) => {
          const next = new Set(prev);
          next.delete(article.url);
          return next;
        });
      } else {
        await axios.post(`${API_BASE}/api/users/${encodedEmail}/bookmarks`, {
          title: article.title || 'Untitled',
          description: article.description || '',
          url: article.url,
          source: typeof article.source === 'string' ? article.source : (article.source?.name || 'Unknown'),
          image_url: article.urlToImage || article.image_url || ''
        }, authConfig);
        setBookmarkedUrls((prev) => {
          const next = new Set(prev);
          next.add(article.url);
          return next;
        });
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Error updating bookmark:', error);
    }
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

  const handleLocationUpdate = async (e) => {
    e.preventDefault();
    const country = profileData.locationCountry.trim();
    const state = profileData.locationState.trim();
    const city = profileData.locationCity.trim();

    if (!country || !state || !city) {
      setProfileMessage('Please enter country, state, and city.');
      setTimeout(() => setProfileMessage(''), 3000);
      return;
    }

    const shouldSave = window.confirm('Are you sure you want to save this location?');
    if (!shouldSave) {
      return;
    }

    try {
      const authConfig = getAuthConfig();
      if (!authConfig) {
        handleUnauthorized();
        return;
      }

      const selectedCountry = countryOptions.find((item) => item.name.toLowerCase() === country.toLowerCase());
      const inferredCountryCode = (selectedCountry?.isoCode || profileLocationCodes.countryCode || '').toLowerCase();

      if (!inferredCountryCode) {
        setProfileMessage('Please select a valid country from suggestions.');
        setTimeout(() => setProfileMessage(''), 3000);
        return;
      }

      const response = await updateLocationWithFallback(
        userEmail,
        {
          country_code: inferredCountryCode,
          country_name: country,
          region: state,
          city,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        },
        authConfig
      );

      const updatedLocation = response?.data?.location || {};
      setProfileData((prev) => ({
        ...prev,
        locationCountry: updatedLocation.country_name || country,
        locationState: updatedLocation.region || state,
        locationCity: updatedLocation.city || city
      }));
      setProfileLocationCodes((prev) => ({
        ...prev,
        countryCode: (updatedLocation.country_code || inferredCountryCode || '').toUpperCase(),
      }));

      setProfileMessage('Saved successfully!');
      setTimeout(() => setProfileMessage(''), 3000);
      syncUserDataFromServer(userEmail);
      fetchFeedArticles(selectedInterests.filter((i) => i !== allInterestOption), 1, false);
    } catch (error) {
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error('Error updating location:', error);
      const detail = error?.response?.data?.detail;
      const message = detail === 'Not Found'
        ? 'Location endpoint not found on backend. Please restart backend with latest code.'
        : (detail || 'Location update failed. Please try again.');
      setProfileMessage(message);
      setTimeout(() => setProfileMessage(''), 3000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    navigate('/');
  };

  const renderArticleCard = (article, index) => (
    <div key={index} className="article-card">
      {(article.urlToImage || article.image_url) && (
        <div className="article-image">
          <img src={article.urlToImage || article.image_url} alt={article.title} />
        </div>
      )}
      <div className="article-content">
        <div className="article-meta">
          <span className="article-source">
            {typeof article.source === 'string' ? article.source : (article.source?.name || 'Unknown')}
          </span>
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
          <button
            className="bookmark-btn"
            onClick={() => handleBookmarkToggle(article)}
            title={bookmarkedUrls.has(article.url) ? 'Remove bookmark' : 'Save bookmark'}
          >
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
                  disabled={selectedInterests.length === 0 || savingInterests}
                >
                  {savingInterests ? 'Saving...' : 'Continue'}
                </button>
              </div>
            ) : (
              <div className="feed-content">
                <div className="feed-header">
                  <div className="interests-display">
                    <span className="interests-label">Your interests:</span>
                    {(selectedInterests.includes(allInterestOption) ? [allInterestOption] : selectedInterests).map(interest => (
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
                  <>
                    <div className="articles-grid">
                      {feedArticles.map((article, index) => renderArticleCard(article, index))}
                    </div>
                    {feedHasMore && (
                      <div className="load-more-wrapper">
                        <button
                          className="search-btn"
                          onClick={loadMoreFeedArticles}
                          disabled={feedLoading}
                        >
                          {feedLoading ? 'Loading...' : 'Load More'}
                        </button>
                      </div>
                    )}
                  </>
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
                        setSearchPage(1);
                        setSearchHasMore(false);
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
                {searchHasMore && (
                  <div className="load-more-wrapper">
                    <button
                      className="search-btn"
                      onClick={loadMoreSearchResults}
                      disabled={searchLoading}
                    >
                      {searchLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
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

                <div className="profile-form-card">
                  <h3 className="form-title">
                    <MapPin size={20} />
                    Update Location
                  </h3>
                  <form onSubmit={handleLocationUpdate} className="profile-form-compact">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Country</label>
                        <input
                          type="text"
                          list="profile-country-options"
                          value={profileData.locationCountry}
                          placeholder="Select country and type to filter"
                          onChange={(e) => {
                            const value = e.target.value;
                            const selectedCountry = countryOptions.find((country) => country.name.toLowerCase() === value.trim().toLowerCase());
                            setProfileLocationCodes({ countryCode: selectedCountry?.isoCode || '', stateCode: '' });
                            setProfileData({
                              ...profileData,
                              locationCountry: value,
                              locationState: '',
                              locationCity: ''
                            });
                          }}
                        />
                        <datalist id="profile-country-options">
                          {countryOptions.map((country) => (
                            <option key={country.isoCode} value={country.name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label>State</label>
                        <input
                          type="text"
                          list="profile-state-options"
                          value={profileData.locationState}
                          placeholder={profileLocationCodes.countryCode ? 'Select state and type to filter' : 'Select country first'}
                          onChange={(e) => {
                            const value = e.target.value;
                            const selectedState = stateOptions.find((state) => state.name.toLowerCase() === value.trim().toLowerCase());
                            setProfileLocationCodes((prev) => ({ ...prev, stateCode: selectedState?.isoCode || '' }));
                            setProfileData({
                              ...profileData,
                              locationState: value,
                              locationCity: ''
                            });
                          }}
                          disabled={!profileLocationCodes.countryCode}
                        />
                        <datalist id="profile-state-options">
                          {stateOptions.map((stateOption) => (
                            <option key={stateOption.isoCode} value={stateOption.name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        list="profile-city-options"
                        value={profileData.locationCity}
                        placeholder={profileLocationCodes.stateCode ? 'Select city and type to filter' : 'Select state first'}
                        onChange={(e) => setProfileData({ ...profileData, locationCity: e.target.value })}
                        disabled={!profileLocationCodes.stateCode}
                      />
                      <datalist id="profile-city-options">
                        {cityOptions.map((cityName) => (
                          <option key={cityName} value={cityName} />
                        ))}
                      </datalist>
                    </div>
                    <button type="submit" className="profile-submit-btn">
                      Save Location
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
