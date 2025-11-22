# Setup Script for Mobile Connection
# This script configures your mobile app to connect to the backend

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Mobile Connection Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
Write-Host "Getting your local IP address..." -ForegroundColor Yellow
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" } | Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "Could not find local IP address. Please enter it manually:" -ForegroundColor Red
    $ipAddress = Read-Host "Enter your IP address (e.g., 192.168.0.145)"
}

Write-Host "Found IP: $ipAddress" -ForegroundColor Green
Write-Host ""

# Create .env file
Write-Host "Creating .env file..." -ForegroundColor Yellow
$envContent = @"
# Backend API Configuration
# Use your computer's local IP address (not localhost or 127.0.0.1)
# Your mobile device needs to connect to this IP address
# Find your IP: ipconfig | findstr IPv4
EXPO_PUBLIC_BACKEND_URL=http://${ipAddress}:8000

# Optional: API Host and Port (used if BACKEND_URL is not set)
EXPO_PUBLIC_API_HOST=${ipAddress}
EXPO_PUBLIC_API_PORT=8000

# Environment
APP_ENV=development
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host ".env file created with IP: $ipAddress" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend is running on port 8000..." -ForegroundColor Yellow
$backendRunning = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($backendRunning) {
    Write-Host "Backend appears to be running on port 8000" -ForegroundColor Green
} else {
    Write-Host "Backend is NOT running on port 8000" -ForegroundColor Red
    Write-Host "Please start your Laravel backend with:" -ForegroundColor Yellow
    Write-Host "  cd ..\doctor_backend" -ForegroundColor Yellow
    Write-Host "  php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor Yellow
}
Write-Host ""

# Check Windows Firewall
Write-Host "Checking Windows Firewall rule for port 8000..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -ErrorAction SilentlyContinue

if ($firewallRule) {
    Write-Host "Firewall rule exists" -ForegroundColor Green
} else {
    Write-Host "Firewall rule does NOT exist" -ForegroundColor Red
    Write-Host "Creating firewall rule (requires Administrator privileges)..." -ForegroundColor Yellow
    
    try {
        # Try to create firewall rule (may require admin)
        netsh advfirewall firewall add rule name="Laravel Backend Port 8000" dir=in action=allow protocol=TCP localport=8000 2>&1 | Out-Null
        Write-Host "Firewall rule created!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create firewall rule. Please run as Administrator:" -ForegroundColor Red
        Write-Host "  .\doctor_backend\allow-firewall-port.bat" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure backend is running: php artisan serve --host=0.0.0.0 --port=8000" -ForegroundColor White
Write-Host "2. Restart Expo: npx expo start --clear" -ForegroundColor White
Write-Host "3. Make sure your mobile device is on the same WiFi network" -ForegroundColor White
Write-Host "4. Connect to Expo using the QR code or tunnel" -ForegroundColor White
Write-Host ""
Write-Host "Your backend URL: http://${ipAddress}:8000" -ForegroundColor Green
Write-Host "API Base URL: http://${ipAddress}:8000/api" -ForegroundColor Green
Write-Host ""

