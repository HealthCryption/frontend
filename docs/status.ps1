# HealthCryption Development Status Check

Write-Host "🔍 Checking HealthCryption Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check Docker
$dockerRunning = docker info 2>&1 | Select-String "Server Version"
if ($dockerRunning) {
    Write-Host "✅ Docker is running" -ForegroundColor Green
} else {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop" -ForegroundColor Yellow
}

Write-Host ""

# Check containers
Write-Host "📦 Container Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""

# Check if services are accessible
Write-Host "🌐 Service Health:" -ForegroundColor Cyan

try {
    $backend = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 2 -UseBasicParsing
    if ($backend.StatusCode -eq 200) {
        Write-Host "✅ Backend API: http://localhost:8001 (responding)" -ForegroundColor Green
        Write-Host "   API Docs: http://localhost:8001/docs" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Backend API: http://localhost:8001 (not responding)" -ForegroundColor Red
    Write-Host "   Try: docker-compose logs backend" -ForegroundColor Yellow
}

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 2 -UseBasicParsing
    if ($frontend.StatusCode -eq 200) {
        Write-Host "✅ Frontend: http://localhost:3001 (responding)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend: http://localhost:3001 (not responding)" -ForegroundColor Red
    Write-Host "   Try: docker-compose logs frontend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Quick Commands:" -ForegroundColor Cyan
Write-Host "   Start: .\start-dev.ps1" -ForegroundColor White
Write-Host "   Stop: .\stop-dev.ps1" -ForegroundColor White
Write-Host "   Restart: .\restart-dev.ps1" -ForegroundColor White
Write-Host "   Logs: docker-compose logs -f" -ForegroundColor White
