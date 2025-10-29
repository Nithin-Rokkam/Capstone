import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Target, TrendingUp, Brain, Clock } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Brain className="feature-icon" />,
      title: "Semantic Understanding",
      description: "Uses SBERT embeddings to capture deeper semantic meaning beyond keyword matching"
    },
    {
      icon: <Zap className="feature-icon" />,
      title: "Real-Time Updates",
      description: "Live NewsAPI integration delivers the latest news articles across various domains"
    },
    {
      icon: <Shield className="feature-icon" />,
      title: "Trustworthy Sources",
      description: "Only verified and reliable platforms to ensure authenticity and minimize misinformation"
    },
    {
      icon: <Target className="feature-icon" />,
      title: "Personalized Feed",
      description: "Analyzes your reading history to build a dynamic profile that adapts to your interests"
    },
    {
      icon: <TrendingUp className="feature-icon" />,
      title: "Content-Based Recommendations",
      description: "Advanced NLP-based similarity matching finds semantically similar articles"
    },
    {
      icon: <Clock className="feature-icon" />,
      title: "Hybrid Approach",
      description: "Combines pre-trained embeddings with live article recommendations for best results"
    }
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="header-content">
          <div className="logo">
            <img src="/logo.png" alt="Pigeon Logo" className="logo-image" />
            <span className="logo-text">Pigeon</span>
          </div>
          <button className="cta-button" onClick={() => navigate('/signin')}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Real-Time News
            <br />
            <span className="hero-highlight">Recommendation System</span>
          </h1>
          <p className="hero-description">
            A smart news recommendation system that uses SBERT embeddings to capture the semantic meaning 
            of news articles and align them with your interests. Get the latest and most relevant updates 
            in real time with personalized, context-aware recommendations.
          </p>
          <div className="hero-buttons">
            <button className="primary-button" onClick={() => navigate('/signup')}>
              Start Reading
            </button>
            <button className="secondary-button" onClick={() => navigate('/signin')}>
              Sign In
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-container">
            <svg className="hero-illustration" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Newspaper/Document Stack */}
              <rect x="100" y="120" width="300" height="360" rx="8" fill="#f8f8f8" stroke="#000000" strokeWidth="3"/>
              <rect x="80" y="100" width="300" height="360" rx="8" fill="#ffffff" stroke="#000000" strokeWidth="3"/>
              
              {/* Header Lines */}
              <line x1="120" y1="140" x2="340" y2="140" stroke="#000000" strokeWidth="4" strokeLinecap="round"/>
              <line x1="120" y1="160" x2="280" y2="160" stroke="#000000" strokeWidth="2" strokeLinecap="round"/>
              
              {/* Content Lines */}
              <line x1="120" y1="200" x2="340" y2="200" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              <line x1="120" y1="220" x2="340" y2="220" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              <line x1="120" y1="240" x2="300" y2="240" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              
              <line x1="120" y1="280" x2="340" y2="280" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              <line x1="120" y1="300" x2="340" y2="300" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              <line x1="120" y1="320" x2="280" y2="320" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              
              <line x1="120" y1="360" x2="340" y2="360" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              <line x1="120" y1="380" x2="340" y2="380" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              <line x1="120" y1="400" x2="320" y2="400" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round"/>
              
              {/* AI/Brain Icon */}
              <circle cx="380" cy="180" r="50" fill="#000000"/>
              <circle cx="365" cy="170" r="8" fill="#ffffff"/>
              <circle cx="395" cy="170" r="8" fill="#ffffff"/>
              <path d="M 360 195 Q 380 205 400 195" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none"/>
              
              {/* Sparkles/Stars for AI */}
              <path d="M 320 140 L 325 145 L 330 140 L 325 135 Z" fill="#000000"/>
              <path d="M 430 160 L 435 165 L 440 160 L 435 155 Z" fill="#000000"/>
              <path d="M 410 220 L 415 225 L 420 220 L 415 215 Z" fill="#000000"/>
            </svg>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="problem-section">
        <div className="section-content">
          <h2 className="section-title">The Challenge</h2>
          <p className="section-text">
            In today's digital landscape, social platforms and news aggregators are flooded with massive 
            volumes of information, much of which is either misleading, fake, or irrelevant to the reader. 
            While users seek trustworthy and relevant news, existing platforms often rely on unverified 
            sources, failing to guarantee credibility. Moreover, the absence of personalization leads to 
            information overload, leaving users overwhelmed with news that does not match their interests.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="section-content">
          <h2 className="section-title">Our Solution</h2>
          <p className="section-subtitle">
            Combining semantic understanding, real-time data access, and personalization
          </p>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon-wrapper">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works-section">
        <div className="section-content">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 className="step-title">Data Processing</h3>
              <p className="step-description">
                MIND dataset preprocessing and embedding generation using state-of-the-art NLP models
              </p>
            </div>
            <div className="step-divider">→</div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h3 className="step-title">Recommendation Engine</h3>
              <p className="step-description">
                SBERT + Cosine Similarity for content-based recommendations with high accuracy
              </p>
            </div>
            <div className="step-divider">→</div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h3 className="step-title">Live Integration</h3>
              <p className="step-description">
                Real-time news fetching from NewsAPI combined with personalized user profiles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Experience Smarter News?</h2>
          <p className="cta-description">
            Join thousands of readers who trust our AI-powered recommendation system
          </p>
          <button className="cta-large-button" onClick={() => navigate('/signup')}>
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/logo.png" alt="Pigeon Logo" className="footer-logo-image" />
            <span>Pigeon</span>
          </div>
          <p className="footer-text">
            Powered by{' '}
            <a
              href="https://github.com/Nithin-Rokkam/Real-Time-News-recommendations"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Nithin Rokkam
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
