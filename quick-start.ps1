# Quick Start Script for Windows
# Run this in PowerShell: .\quick-start.ps1

Write-Host "🚀 WhatsApp to Google Drive Uploader - Quick Start" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "⏳ Checking Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "✅ Docker installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Check if credentials exist
Write-Host "⏳ Checking credentials..." -ForegroundColor Yellow
if (-Not (Test-Path "credentials\service-account.json")) {
    Write-Host "❌ Service account credentials not found!" -ForegroundColor Red
    Write-Host "   Please follow SETUP.md to create and download service-account.json" -ForegroundColor Yellow
    Write-Host "   Then place it in: credentials\service-account.json" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Credentials found" -ForegroundColor Green

# Check if .env exists
Write-Host "⏳ Checking environment configuration..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  .env not found, copying from .env.example" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please edit .env file and configure:" -ForegroundColor Yellow
    Write-Host "   - EVOLUTION_API_KEY" -ForegroundColor Yellow
    Write-Host "   - WEBHOOK_SECRET" -ForegroundColor Yellow
    Write-Host "   - GOOGLE_DRIVE_PARENT_FOLDER_ID" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to open .env file..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    notepad .env
    Write-Host "After editing .env, run this script again." -ForegroundColor Cyan
    exit 0
}
Write-Host "✅ Environment configured" -ForegroundColor Green

# Stop existing containers
Write-Host "⏳ Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
Write-Host "✅ Cleaned up" -ForegroundColor Green

# Start services
Write-Host "⏳ Starting services (this may take a few minutes)..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Service URLs:" -ForegroundColor Cyan
    Write-Host "   • App API:        http://localhost:3000" -ForegroundColor White
    Write-Host "   • Health Check:   http://localhost:3000/health" -ForegroundColor White
    Write-Host "   • Evolution API:  http://localhost:8080" -ForegroundColor White
    Write-Host "   • Evolution UI:   http://localhost:8080/manager" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Open Evolution Manager: http://localhost:8080/manager" -ForegroundColor White
    Write-Host "   2. Create instance named: whatsapp-instance" -ForegroundColor White
    Write-Host "   3. Scan QR Code with WhatsApp" -ForegroundColor White
    Write-Host "   4. Configure webhook (see SETUP.md Step 6)" -ForegroundColor White
    Write-Host "   5. Send test file to WhatsApp bot" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Useful Commands:" -ForegroundColor Cyan
    Write-Host "   • View logs:      docker-compose logs -f app" -ForegroundColor White
    Write-Host "   • Check status:   docker-compose ps" -ForegroundColor White
    Write-Host "   • Stop all:       docker-compose down" -ForegroundColor White
    Write-Host "   • Restart:        docker-compose restart" -ForegroundColor White
    Write-Host ""
    
    # Wait a moment for services to be ready
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Test health check
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
        if ($response.success) {
            Write-Host "✅ Health check passed!" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Services starting... Try health check in a minute" -ForegroundColor Yellow
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs" -ForegroundColor Yellow
    exit 1
}
