import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Newspaper, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Sparkles, TrendingUp, Shield } from 'lucide-react';
import './AuthPage.css';

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
    // Update URL without page reload
    navigate(isSignUp ? '/signin' : '/signup', { replace: true });
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

    // Simulate authentication
    setTimeout(() => {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', formData.email);
      if (isSignUp) {
        localStorage.setItem('userName', formData.name);
      }
      navigate('/dashboard');
      setLoading(false);
    }, 1500);
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
            <div className="logo-large">
              <img src="/logo.png" alt="Pigeon Logo" className="auth-logo-image" />
            </div>
            <h1 className="brand-title">Pigeon</h1>
            <p className="brand-tagline">
              AI-Powered News Recommendations
            </p>
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
                        placeholder="John Doe"
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
                <div className="form-options-new">
                  {!isSignUp ? (
                    <>
                      <label className="checkbox-label-new">
                        <input type="checkbox" className="checkbox-input-new" />
                        <span>Remember me</span>
                      </label>
                      <a href="#" className="forgot-link-new">Forgot password?</a>
                    </>
                  ) : (
                    <label className="checkbox-label-new full-width">
                      <input type="checkbox" className="checkbox-input-new" required />
                      <span>I agree to the Terms of Service and Privacy Policy</span>
                    </label>
                  )}
                </div>
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
