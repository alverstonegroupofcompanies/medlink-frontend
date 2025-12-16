# Script to set local IP address for backend connection
# This replaces medlink.alverstones.com with local IP for local testing

$localIP = "10.221.155.201"
$backendPort = "8000"
$backendUrl = "http://${localIP}:${backendPort}"

Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Setting Local Backend IP Address" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists (script should be run from frontend directory)
$envPath = ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    New-Item -Path $envPath -ItemType File -Force | Out-Null
}

# Read existing .env content
$envContent = Get-Content $envPath -ErrorAction SilentlyContinue

# Remove old BACKEND_URL and API_HOST lines
$envContent = $envContent | Where-Object { 
    $_ -notmatch "^EXPO_PUBLIC_BACKEND_URL=" -and 
    $_ -notmatch "^EXPO_PUBLIC_API_HOST="
}

# Add new backend URL
$envContent += "EXPO_PUBLIC_BACKEND_URL=$backendUrl"

# Write updated content
$envContent | Set-Content $envPath

Write-Host "✅ Updated frontend/.env:" -ForegroundColor Green
Write-Host "   EXPO_PUBLIC_BACKEND_URL=$backendUrl" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Make sure backend is running on: $backendUrl" -ForegroundColor White
Write-Host "   2. Restart Expo: npx expo start --clear" -ForegroundColor White
Write-Host ""
Write-Host "Note: Make sure your backend is accessible at $backendUrl" -ForegroundColor Yellow
Write-Host "If your IP is different, edit this script and update the localIP variable" -ForegroundColor Yellow

