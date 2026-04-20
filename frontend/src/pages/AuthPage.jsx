import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Newspaper, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Sparkles, TrendingUp, Shield } from 'lucide-react';
import './AuthPage.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const postWithFallback = async (paths, payload) => {
  let lastError;
  for (const path of paths) {
    try {
      return await axios.post(`${API_BASE}${path}`, payload);
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }
  throw lastError;
};

const getLocaleCountryCode = () => {
  const locale = navigator.language || '';
  const parts = locale.split('-');
  if (parts.length < 2) return '';
  const code = (parts[1] || '').trim().toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : '';
};

const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

const fetchIpLocation = async () => {
  try {
    const response = await axios.get('https://ipapi.co/json/', { timeout: 4000 });
    const data = response?.data || {};
    return {
      country_code: (data.country_code || '').toLowerCase(),
      country_name: data.country_name || '',
      region: data.region || '',
      city: data.city || '',
      latitude: data.latitude ?? '',
      longitude: data.longitude ?? '',
      timezone: data.timezone || getBrowserTimezone(),
    };
  } catch {
    return {
      country_code: getLocaleCountryCode(),
      country_name: '',
      region: '',
      city: '',
      latitude: '',
      longitude: '',
      timezone: getBrowserTimezone(),
    };
  }
};

const fetchBrowserCoordinates = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Geolocation not supported'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => reject(error),
    {
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 300000,
    }
  );
});

const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'jsonv2',
        lat: latitude,
        lon: longitude,
        zoom: 10,
        addressdetails: 1,
      },
      timeout: 5000,
    });

    const address = response?.data?.address || {};
    const countryCode = (address.country_code || '').toLowerCase();
    return {
      country_code: countryCode,
      country_name: address.country || '',
      region: address.state || address.region || '',
      city: address.city || address.town || address.village || '',
      latitude,
      longitude,
      timezone: getBrowserTimezone(),
    };
  } catch {
    return {
      country_code: getLocaleCountryCode(),
      country_name: '',
      region: '',
      city: '',
      latitude,
      longitude,
      timezone: getBrowserTimezone(),
    };
  }
};

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(location.pathname === '/signup');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState('');
  const [manualLocation, setManualLocation] = useState({
    country: '',
    countryCode: '',
    state: '',
    stateCode: '',
    city: ''
  });
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [locationLibrary, setLocationLibrary] = useState(null);
  const isLocationDatasetReady = countryOptions.length > 0;

  useEffect(() => {
    let cancelled = false;
    const loadLocationLibrary = async () => {
      if (!isSignUp || useCurrentLocation || locationLibrary) return;
      try {
        const library = await import('country-state-city');
        if (cancelled) return;
        setLocationLibrary(library);
        const allCountries = library.Country.getAllCountries()
          .map((country) => ({ name: country.name, isoCode: country.isoCode }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryOptions(allCountries);
      } catch (loadError) {
        console.error('Failed to load country/state/city data:', loadError);
      }
    };

    loadLocationLibrary();

    return () => {
      cancelled = true;
    };
  }, [isSignUp, useCurrentLocation, locationLibrary]);

  useEffect(() => {
    if (!locationLibrary || !manualLocation.countryCode) {
      setStateOptions([]);
      return;
    }

    const states = locationLibrary.State.getStatesOfCountry(manualLocation.countryCode)
      .map((state) => ({ name: state.name, isoCode: state.isoCode }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setStateOptions(states);
  }, [locationLibrary, manualLocation.countryCode]);

  useEffect(() => {
    if (!locationLibrary || !manualLocation.countryCode || !manualLocation.stateCode) {
      setCityOptions([]);
      return;
    }

    const cities = locationLibrary.City.getCitiesOfState(manualLocation.countryCode, manualLocation.stateCode)
      .map((city) => city.name)
      .sort((a, b) => a.localeCompare(b));
    setCityOptions(cities);
  }, [locationLibrary, manualLocation.countryCode, manualLocation.stateCode]);

  const formatLocationPreview = (payload) => {
    if (!payload) return '';
    const city = (payload.city || '').trim();
    const region = (payload.region || '').trim();
    const country = (payload.country_name || payload.country_code || '').trim();
    return [city, region, country].filter(Boolean).join(', ');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setLocationStatus('');
    setManualLocation({ country: '', countryCode: '', state: '', stateCode: '', city: '' });
    // Update URL without page reload
    navigate(isSignUp ? '/signin' : '/signup', { replace: true });
  };

  const handleCountryInput = (value) => {
    const selectedCountry = countryOptions.find((country) => country.name.toLowerCase() === value.trim().toLowerCase());
    setManualLocation({
      country: value,
      countryCode: selectedCountry?.isoCode || '',
      state: '',
      stateCode: '',
      city: ''
    });
  };

  const handleStateInput = (value) => {
    const selectedState = stateOptions.find((state) => state.name.toLowerCase() === value.trim().toLowerCase());
    setManualLocation((prev) => ({
      ...prev,
      state: value,
      stateCode: selectedState?.isoCode || '',
      city: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (isSignUp) {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
    } else {
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
    }

    if (isSignUp && !useCurrentLocation) {
      const country = manualLocation.country.trim();
      const state = manualLocation.state.trim();
      const city = manualLocation.city.trim();
      if (!country || !state || !city) {
        setError('Please provide country, state, and city when auto location is disabled');
        setLoading(false);
        return;
      }
    }

    try {
      let locationPayload = null;
      if (isSignUp) {
        if (useCurrentLocation) {
          setLocationStatus('Requesting location access...');
          try {
            const coords = await fetchBrowserCoordinates();
            locationPayload = await reverseGeocode(coords.latitude, coords.longitude);
            setLocationStatus(`Detected: ${formatLocationPreview(locationPayload) || 'Location captured'}`);
          } catch {
            locationPayload = await fetchIpLocation();
            setLocationStatus(`Using approximate location: ${formatLocationPreview(locationPayload) || 'Unknown region'}`);
          }
        } else {
          locationPayload = {
            country_code: (manualLocation.countryCode || getLocaleCountryCode()).toLowerCase(),
            country_name: manualLocation.country.trim(),
            region: manualLocation.state.trim(),
            city: manualLocation.city.trim(),
            latitude: '',
            longitude: '',
            timezone: getBrowserTimezone(),
          };
          setLocationStatus(`Using manual location: ${manualLocation.city.trim()}, ${manualLocation.state.trim()}, ${manualLocation.country.trim()}`);
        }
      }

      if (isSignUp) {
        const response = await postWithFallback(['/api/auth/signup', '/auth/signup'], {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          location: locationPayload,
        });
        const user = response.data.user;
        const token = response.data.access_token;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('authToken', token);
        localStorage.setItem('locationPermissionGranted', 'true');
      } else {
        const response = await postWithFallback(['/api/auth/signin', '/auth/signin'], {
          email: formData.email,
          password: formData.password,
          location: null,
        });
        const user = response.data.user;
        const token = response.data.access_token;
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('authToken', token);
      }

      navigate('/dashboard');
    } catch (authError) {
      localStorage.removeItem('authToken');
      const message = authError?.response?.data?.detail || 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-new">
      {/* Animated Background */}
      <div className="auth-background">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-circle circle-3"></div>
      </div>

      <div className="auth-container-new">
        {/* Left Panel - Branding */}
        <div className="auth-left-new">
          <button className="back-button-new" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
            <span>Home</span>
          </button>

          <div className="branding-content">
            <div className="brand-top-row">
              <div className="logo-large brand-logo-frame">
                <img src="/logo.png" alt="Pigeon Logo" className="auth-logo-image" />
              </div>
              <h1 className="brand-title">Pigeon</h1>
            </div>
            <div className="brand-stack">
              <p className="brand-line">AI Powered</p>
              <p className="brand-line">News Recommender</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-right-new">
          <div className="form-wrapper">
            {/* Toggle Tabs */}
            <div className="auth-tabs">
              <button
                className={`tab-button ${!isSignUp ? 'active' : ''}`}
                onClick={() => !isSignUp ? null : handleToggleMode()}
              >
                Sign In
              </button>
              <button
                className={`tab-button ${isSignUp ? 'active' : ''}`}
                onClick={() => isSignUp ? null : handleToggleMode()}
              >
                Sign Up
              </button>
              <div className={`tab-indicator ${isSignUp ? 'right' : 'left'}`}></div>
            </div>

            {/* Form Title */}
            <div className="form-header">
              <h2 className="form-title-new">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message-new">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form-new">
              <div className={`form-fields ${isSignUp ? 'signup-mode' : 'signin-mode'}`}>
                {/* Name Field - Only for Sign Up */}
                {isSignUp && (
                  <div className="form-group-new fade-in">
                    <label htmlFor="name" className="form-label-new">
                      Full Name
                    </label>
                    <div className="input-wrapper-new">
                      <User size={20} className="input-icon-new" />
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-input-new"
                        placeholder="Full-Name"
                        value={formData.name}
                        onChange={handleChange}
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="form-group-new fade-in">
                  <label htmlFor="email" className="form-label-new">
                    Email Address
                  </label>
                  <div className="input-wrapper-new">
                    <Mail size={20} className="input-icon-new" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-input-new"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="form-group-new fade-in">
                  <label htmlFor="password" className="form-label-new">
                    Password
                  </label>
                  <div className="input-wrapper-new">
                    <Lock size={20} className="input-icon-new" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      className="form-input-new"
                      placeholder={isSignUp ? 'Create a strong password' : 'Enter your password'}
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password - Only for Sign Up */}
                {isSignUp && (
                  <div className="form-group-new fade-in">
                    <label htmlFor="confirmPassword" className="form-label-new">
                      Confirm Password
                    </label>
                    <div className="input-wrapper-new">
                      <Lock size={20} className="input-icon-new" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        className="form-input-new"
                        placeholder="Re-enter your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required={isSignUp}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remember Me / Terms */}
                {isSignUp && (
                  <div className="form-options-new">
                    <label className="checkbox-label-new full-width">
                      <input
                        type="checkbox"
                        className="checkbox-input-new"
                        checked={useCurrentLocation}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setUseCurrentLocation(enabled);
                          if (enabled) {
                            setLocationStatus('Auto location enabled');
                          } else {
                            setLocationStatus('');
                          }
                        }}
                      />
                      <span>Use my current location for regional news</span>
                    </label>

                    {/* {!useCurrentLocation && (
                      <div className="signup-info-warning">
                        Manual location mode is active. Select from dropdown and type to filter options.
                      </div>
                    )} */}

                    {!useCurrentLocation && (
                    <div className="form-group-new location-fields-container">
                      <div className="form-group-new">
                        <label htmlFor="manualCountry" className="form-label-new">Country</label>
                        <input
                          id="manualCountry"
                          type="text"
                          className="form-input-new manual-location-input"
                          placeholder={isLocationDatasetReady ? 'Select country and type to filter' : 'Loading countries...'}
                          list="country-options"
                          value={manualLocation.country}
                          onChange={(e) => handleCountryInput(e.target.value)}
                          disabled={!isLocationDatasetReady}
                        />
                        <datalist id="country-options">
                          {countryOptions.map((country) => (
                            <option key={country.isoCode} value={country.name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="location-row-new">
                        <div className="form-group-new location-field-half">
                          <label htmlFor="manualState" className="form-label-new">State</label>
                          <input
                            id="manualState"
                            type="text"
                            className="form-input-new manual-location-input"
                            placeholder={manualLocation.countryCode ? 'Select state and type to filter' : 'Select country first'}
                            list="state-options"
                            value={manualLocation.state}
                            onChange={(e) => handleStateInput(e.target.value)}
                            disabled={!manualLocation.countryCode}
                          />
                          <datalist id="state-options">
                            {stateOptions.map((stateOption) => (
                              <option key={stateOption.isoCode} value={stateOption.name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="form-group-new location-field-half">
                          <label htmlFor="manualCity" className="form-label-new">City</label>
                          <input
                            id="manualCity"
                            type="text"
                            className="form-input-new manual-location-input"
                            placeholder={manualLocation.stateCode ? 'Select city and type to filter' : 'Select state first'}
                            list="city-options"
                            value={manualLocation.city}
                            onChange={(e) => setManualLocation((prev) => ({ ...prev, city: e.target.value }))}
                            disabled={!manualLocation.stateCode}
                          />
                          <datalist id="city-options">
                            {cityOptions.map((cityName) => (
                              <option key={cityName} value={cityName} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                )}

                {isSignUp && locationStatus && (
                  <div className="form-subtitle" style={{ marginTop: '0.5rem' }}>
                    {locationStatus}
                  </div>
                )}

                {!isSignUp ? (
                  <div className="form-options-new auth-extra-options">
                    <label className="checkbox-label-new">
                      <input type="checkbox" className="checkbox-input-new" />
                      <span>Remember me</span>
                    </label>
                    <a href="#" className="forgot-link-new">Forgot password?</a>
                  </div>
                ) : (
                  <div className="form-options-new auth-extra-options">
                    <label className="checkbox-label-new full-width">
                      <input type="checkbox" className="checkbox-input-new" required />
                      <span>I agree to the Terms of Service and Privacy Policy</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button type="submit" className="submit-button-new" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner">
                    <span className="spinner"></span>
                    {isSignUp ? 'Creating...' : 'Signing in...'}
                  </span>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
