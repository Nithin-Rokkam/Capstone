# News Recommendation System - Public Website

A modern, production-ready public website for the Real-Time News Recommendation System featuring a minimal black and white design with authentication.

## Features

### 🎨 Design
- **Minimal Black & White Theme**: Clean, professional aesthetic with subtle detailing
- **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI Components**: Built with React and Lucide icons
- **Smooth Animations**: Subtle transitions and hover effects

### 📄 Pages

#### 1. Landing Page (`/`)
- Hero section with animated visual cards
- Feature showcase with 6 key capabilities
- Problem statement and solution overview
- Technical architecture highlights
- "How It Works" step-by-step guide
- Call-to-action sections
- Professional footer

#### 2. Sign In Page (`/signin`)
- Split-panel design with branding
- Email and password authentication
- "Remember me" option
- Forgot password link
- Link to sign up page
- Back to home navigation

#### 3. Sign Up Page (`/signup`)
- User registration form
- Full name, email, and password fields
- Password confirmation
- Terms of service agreement
- Link to sign in page
- Back to home navigation

#### 4. Dashboard (`/dashboard`)
- Personalized news feed
- Search functionality for custom queries
- Trending news by category
- Category filtering (General, Business, Entertainment, Health, Science, Sports, Technology)
- Pagination for news articles
- Logout functionality
- Real-time news integration

## Technology Stack

- **React 19**: Latest React version with modern hooks
- **React Router DOM**: Client-side routing
- **Lucide React**: Beautiful, consistent icons
- **Axios**: HTTP client for API requests
- **Vite**: Fast build tool and dev server

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx      # Home page with features
│   │   ├── LandingPage.css      # Landing page styles
│   │   ├── SignIn.jsx           # Sign in page
│   │   ├── SignUp.jsx           # Sign up page
│   │   ├── Auth.css             # Shared auth page styles
│   │   ├── Dashboard.jsx        # Main news feed
│   │   └── Dashboard.css        # Dashboard styles
│   ├── App.jsx                  # Main app with routing
│   ├── App.css                  # App-level styles
│   ├── index.css                # Global styles
│   └── main.jsx                 # Entry point
├── package.json
└── vite.config.js
```

## Authentication Flow

1. **Landing Page**: Users see the public website with features and information
2. **Sign Up/Sign In**: Users create an account or log in
3. **Dashboard**: Authenticated users access personalized news feed
4. **Logout**: Users can log out and return to landing page

### Current Authentication
- Uses localStorage for demo purposes
- In production, integrate with your backend authentication API
- Update `SignIn.jsx` and `SignUp.jsx` to call your auth endpoints

## Customization

### Colors
The design uses a minimal black and white palette:
- Primary: `#000000` (Black)
- Background: `#ffffff` (White)
- Gray tones: `#f8f8f8`, `#e5e5e5`, `#666666`, `#999999`

### Typography
- System fonts for optimal performance
- Font weights: 400 (regular), 600 (semibold), 700 (bold), 800 (extrabold)
- Letter spacing: -0.01em to -0.03em for tight, modern look

### Components
All components are self-contained with their own CSS files for easy maintenance and customization.

## API Integration

The dashboard connects to your backend API:

### Endpoints Used
- `GET /trending?category={category}&page={page}` - Fetch trending news
- `POST /recommend` - Get personalized recommendations

### Configuration
Update the API base URL in `Dashboard.jsx` if your backend runs on a different port:

```javascript
// Change from:
axios.get('http://localhost:8000/trending...')

// To your backend URL:
axios.get('https://your-api.com/trending...')
```

## Features to Implement

### For Production
1. **Real Authentication**: Connect to backend auth API
2. **User Profile**: Add profile page with preferences
3. **Bookmarks**: Save favorite articles
4. **Reading History**: Track and display read articles
5. **Email Verification**: Verify user emails
6. **Password Reset**: Implement forgot password flow
7. **Social Login**: Add Google/Facebook authentication
8. **Dark Mode**: Optional dark theme toggle
9. **Notifications**: Real-time news alerts
10. **Analytics**: Track user engagement

## Performance

- **Lazy Loading**: Consider code splitting for larger apps
- **Image Optimization**: Use WebP format for images
- **Caching**: Implement service workers for offline support
- **CDN**: Serve static assets from CDN in production

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Part of the Real-Time News Recommendation System project.

## Credits

Powered by [Nithin Rokkam](https://github.com/Nithin-Rokkam/Real-Time-News-recommendations)
