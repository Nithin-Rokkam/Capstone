# Deployment Guide - Alternative Platforms

## 🚀 Platform Options

### **1. Railway (Recommended)**
- **Pros**: Easy deployment, good free tier, automatic HTTPS
- **Cons**: Limited free tier hours
- **Best for**: Quick deployment, small projects

### **2. Heroku**
- **Pros**: Mature platform, good documentation
- **Cons**: No free tier anymore, paid plans only
- **Best for**: Production applications

### **3. DigitalOcean App Platform**
- **Pros**: Reliable, good performance
- **Cons**: Paid service
- **Best for**: Production applications

### **4. Google Cloud Run**
- **Pros**: Serverless, pay-per-use, scalable
- **Cons**: More complex setup
- **Best for**: Scalable applications

### **5. AWS Elastic Beanstalk**
- **Pros**: Highly scalable, enterprise-grade
- **Cons**: Complex setup, AWS knowledge required
- **Best for**: Enterprise applications

---

## 🎯 Recommended: Railway Deployment

### **Step 1: Prepare Your Code**
Your code is already prepared with:
- ✅ `requirements.txt` at root level
- ✅ `main.py` entry point
- ✅ Proper imports in `src/main.py`

### **Step 2: Deploy to Railway**

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Your App**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure the Service**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `NEWS_API_KEY`: Your NewsAPI key

4. **Deploy**
   - Railway will automatically deploy your app
   - You'll get a URL like `https://your-app.railway.app`

### **Step 3: Deploy Frontend to Vercel**

1. **Prepare Frontend**
   - Update API calls to use your Railway backend URL
   - Set environment variable: `VITE_API_URL=https://your-app.railway.app`

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Deploy

---

## 🔧 Alternative: Heroku Deployment

### **Step 1: Install Heroku CLI**
```bash
# Download and install from https://devcenter.heroku.com/articles/heroku-cli
```

### **Step 2: Create Heroku App**
```bash
heroku create your-app-name
```

### **Step 3: Add Buildpacks**
```bash
heroku buildpacks:set heroku/python
```

### **Step 4: Set Environment Variables**
```bash
heroku config:set NEWS_API_KEY=your_api_key
```

### **Step 5: Deploy**
```bash
git push heroku main
```

---

## 📁 File Structure
```
/
├── main.py              # Entry point
├── requirements.txt     # Python dependencies
├── src/
│   ├── __init__.py     # Package marker
│   ├── main.py         # FastAPI app
│   ├── recommender.py
│   └── newsapi_client.py
├── frontend/           # React app
└── data/              # Data files
```

---

## 🚨 Troubleshooting

### **Common Issues:**
1. **Import Errors**: Make sure all dependencies are in `requirements.txt`
2. **Port Issues**: Use `$PORT` environment variable
3. **Data Files**: Ensure data files are included in deployment
4. **CORS**: Update CORS origins for your domain

### **Environment Variables:**
- `NEWS_API_KEY`: Your NewsAPI key
- `PORT`: Platform will set this automatically

---

## 🎉 Next Steps

1. **Choose a platform** (Railway recommended)
2. **Deploy backend** following the guide above
3. **Deploy frontend** to Vercel
4. **Test your application**
5. **Add custom domain** (optional)

**Which platform would you like to deploy to?** I can provide specific instructions for any of these platforms! 