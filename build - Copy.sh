#!/bin/bash

# Fast Docker build script for News Recommender API
echo "🚀 Building optimized Docker image..."

# Build with optimizations
docker build \
    --no-cache \
    --progress=plain \
    --tag news-recommender-api:latest \
    --tag news-recommender-api:$(date +%Y%m%d-%H%M%S) \
    .

echo "✅ Build completed!"
echo "📦 Image tags:"
docker images news-recommender-api --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "🐳 To run the container:"
echo "docker run -p 8080:8080 news-recommender-api:latest" 