# HealthCryption Development Restart Script
# Quickly restart services without rebuilding

Write-Host "🔄 Restarting HealthCryption Development Environment..." -ForegroundColor Yellow
Write-Host ""

docker-compose restart

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Containers restarted successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📡 Services available at:" -ForegroundColor Cyan
    Write-Host "   Backend API: http://localhost:8001" -ForegroundColor White
    Write-Host "   Frontend: http://localhost:3001" -ForegroundColor White
} else {
    Write-Host "❌ Failed to restart containers" -ForegroundColor Red
    exit 1
}
