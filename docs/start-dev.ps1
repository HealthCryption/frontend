# HealthCryption Development Startup Script
# Starts both backend and frontend with hot reloading

Write-Host "🚀 Starting HealthCryption Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if (-not $dockerRunning) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Build and start containers with hot reload
Write-Host "🔨 Building and starting containers..." -ForegroundColor Yellow
docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start containers" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Containers started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Services available at:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:8001" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8001/docs" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Hot reloading is ENABLED:" -ForegroundColor Green
Write-Host "   - Backend: Python files will auto-reload on save" -ForegroundColor White
Write-Host "   - Frontend: React files will auto-reload on save" -ForegroundColor White
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop: docker-compose down" -ForegroundColor White
Write-Host "   Restart: docker-compose restart" -ForegroundColor White
Write-Host "   View backend logs: docker-compose logs -f backend" -ForegroundColor White
Write-Host "   View frontend logs: docker-compose logs -f frontend" -ForegroundColor White
Write-Host ""

# Show logs
Write-Host "📜 Showing live logs (Ctrl+C to exit, containers keep running)..." -ForegroundColor Yellow
Write-Host ""
docker-compose logs -f
