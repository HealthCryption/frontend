# HealthCryption Development Stop Script

Write-Host "🛑 Stopping HealthCryption Development Environment..." -ForegroundColor Yellow
Write-Host ""

docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Containers stopped successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to stop containers" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💡 To remove volumes (database and node_modules), use:" -ForegroundColor Cyan
Write-Host "   docker-compose down -v" -ForegroundColor White
