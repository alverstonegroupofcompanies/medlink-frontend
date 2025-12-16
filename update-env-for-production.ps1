# Update .env file for production backend
# This script ensures HTTPS is used for production domains

$envPath = Join-Path $PSScriptRoot ".env"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Updating .env for Production Backend" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Production backend URL
$backendUrl = "https://medlink.alverstones.com"

Write-Host "Setting backend URL to: $backendUrl" -ForegroundColor Yellow
Write-Host ""

# Read existing .env if it exists
$envContent = ""
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    Write-Host "Existing .env file found" -ForegroundColor Green
} else {
    Write-Host "Creating new .env file" -ForegroundColor Yellow
}

# Update or add BACKEND_URL
if ($envContent -match "EXPO_PUBLIC_BACKEND_URL") {
    # Replace existing line
    $envContent = $envContent -replace "EXPO_PUBLIC_BACKEND_URL=.*", "EXPO_PUBLIC_BACKEND_URL=$backendUrl"
    Write-Host "✓ Updated EXPO_PUBLIC_BACKEND_URL" -ForegroundColor Green
} else {
    # Add new line
    if ($envContent -and -not $envContent.EndsWith("`n")) {
        $envContent += "`n"
    }
    $envContent += "EXPO_PUBLIC_BACKEND_URL=$backendUrl`n"
    Write-Host "✓ Added EXPO_PUBLIC_BACKEND_URL" -ForegroundColor Green
}

# Update or add API_HOST
if ($envContent -match "EXPO_PUBLIC_API_HOST") {
    $envContent = $envContent -replace "EXPO_PUBLIC_API_HOST=.*", "EXPO_PUBLIC_API_HOST=medlink.alverstones.com"
    Write-Host "✓ Updated EXPO_PUBLIC_API_HOST" -ForegroundColor Green
} else {
    if ($envContent -and -not $envContent.EndsWith("`n")) {
        $envContent += "`n"
    }
    $envContent += "EXPO_PUBLIC_API_HOST=medlink.alverstones.com`n"
    Write-Host "✓ Added EXPO_PUBLIC_API_HOST" -ForegroundColor Green
}

# Update or add API_PORT
if ($envContent -match "EXPO_PUBLIC_API_PORT") {
    $envContent = $envContent -replace "EXPO_PUBLIC_API_PORT=.*", "EXPO_PUBLIC_API_PORT=443"
    Write-Host "✓ Updated EXPO_PUBLIC_API_PORT" -ForegroundColor Green
} else {
    if ($envContent -and -not $envContent.EndsWith("`n")) {
        $envContent += "`n"
    }
    $envContent += "EXPO_PUBLIC_API_PORT=443`n"
    Write-Host "✓ Added EXPO_PUBLIC_API_PORT" -ForegroundColor Green
}

# Write the updated content
try {
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    Write-Host ""
    Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current .env content:" -ForegroundColor Cyan
    Get-Content $envPath | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    Write-Host ""
    Write-Host "⚠️ IMPORTANT: Restart Expo with cache clear:" -ForegroundColor Yellow
    Write-Host "   npx expo start --clear" -ForegroundColor White
} catch {
    Write-Host "❌ Error updating .env file: $_" -ForegroundColor Red
}





