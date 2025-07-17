# Fast Docker build script for News Recommender API (PowerShell)
Write-Host "🚀 Building optimized Docker image..." -ForegroundColor Green

# Build with optimizations
docker build `
    --no-cache `
    --progress=plain `
    --tag news-recommender-api:latest `
    --tag news-recommender-api:$(Get-Date -Format "yyyyMMdd-HHmmss") `
    .

Write-Host "✅ Build completed!" -ForegroundColor Green
Write-Host "📦 Image tags:" -ForegroundColor Cyan
docker images news-recommender-api --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

Write-Host ""
Write-Host "🐳 To run the container:" -ForegroundColor Yellow
Write-Host "docker run -p 8080:8080 news-recommender-api:latest" -ForegroundColor White 