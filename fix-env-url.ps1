# Fix .env file with correct backend URL
# This script will create a properly formatted .env file

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fixing .env file for backend URL" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
$frontendPath = Join-Path $PSScriptRoot "."
if (-not (Test-Path (Join-Path $frontendPath "package.json"))) {
    Write-Host "❌ Error: Must run from frontend directory!" -ForegroundColor Red
    exit 1
}

$envPath = Join-Path $frontendPath ".env"

# Backup existing .env if it exists
if (Test-Path $envPath) {
    $backupPath = "$envPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $envPath $backupPath -Force
    Write-Host "✅ Backed up existing .env to: $backupPath" -ForegroundColor Green
    Write-Host ""
    
    # Show current content
    Write-Host "Current .env content:" -ForegroundColor Yellow
    Get-Content $envPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host ""
}

# Create new .env file with correct format
Write-Host "Creating new .env file..." -ForegroundColor Yellow

$envContent = @"
# Backend API Configuration
# IMPORTANT: Use full URL with http:// protocol (no double protocols!)
EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com

# Optional: API Host and Port
EXPO_PUBLIC_API_HOST=medlink.alverstones.com
EXPO_PUBLIC_API_PORT=8000

# Environment
APP_ENV=development
"@

# Write to file (UTF-8 without BOM)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($envPath, $envContent, $utf8NoBom)

Write-Host "✅ Created new .env file!" -ForegroundColor Green
Write-Host ""

# Verify content
Write-Host "New .env content:" -ForegroundColor Yellow
Get-Content $envPath | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
Write-Host ""

# Check for any malformed values
$content = Get-Content $envPath -Raw
if ($content -match 'http://http') {
    Write-Host "⚠️  WARNING: Still found double protocol in .env!" -ForegroundColor Red
    Write-Host "Please manually check and fix the file." -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file looks correct!" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. Stop Expo if it's running (Ctrl+C)" -ForegroundColor White
Write-Host "2. Clear cache and restart:" -ForegroundColor White
Write-Host "   npx expo start --clear" -ForegroundColor Cyan
Write-Host ""
Write-Host "After restart, check console for:" -ForegroundColor White
Write-Host "  📍 Backend URL: http://medlink.alverstones.com" -ForegroundColor Green
Write-Host "  📍 API Base URL: http://medlink.alverstones.com/api" -ForegroundColor Green
Write-Host ""




