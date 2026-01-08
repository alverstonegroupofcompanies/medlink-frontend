# Setup EAS Secrets for Production Build
# This script helps you set up EAS environment variables

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "EAS Secrets Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if EAS CLI is installed
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easInstalled) {
    Write-Host "❌ EAS CLI is not installed!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g eas-cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ EAS CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking EAS login status..." -ForegroundColor Yellow
$loginStatus = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to EAS!" -ForegroundColor Red
    Write-Host "Please run: eas login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Logged in to EAS" -ForegroundColor Green
Write-Host ""

Write-Host "Creating EAS environment variable..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Creating environment variable with:" -ForegroundColor Cyan
Write-Host "  Name: EXPO_PUBLIC_BACKEND_URL" -ForegroundColor White
Write-Host "  Value: https://medlink.alverstones.com" -ForegroundColor White
Write-Host "  Environment: production" -ForegroundColor White
Write-Host "  Visibility: plaintext (EXPO_PUBLIC_ variables are compiled into app)" -ForegroundColor White
Write-Host ""

# Create the environment variable
# Note: EXPO_PUBLIC_ variables should use "plaintext" visibility, not "secret"
# because they are compiled into the app bundle
Write-Host "Running: eas env:create --name EXPO_PUBLIC_BACKEND_URL --value https://medlink.alverstones.com --scope project --environment production --visibility plaintext" -ForegroundColor Gray
Write-Host ""

eas env:create --name EXPO_PUBLIC_BACKEND_URL --value https://medlink.alverstones.com --scope project --environment production --visibility plaintext

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ EAS secret created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying secret..." -ForegroundColor Yellow
    eas env:list
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now build your APK with:" -ForegroundColor Yellow
    Write-Host "  eas build --profile production --platform android" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Failed to create secret. Please run manually:" -ForegroundColor Red
    Write-Host "  eas env:create --name EXPO_PUBLIC_BACKEND_URL --value https://medlink.alverstones.com --scope project" -ForegroundColor Yellow
}

