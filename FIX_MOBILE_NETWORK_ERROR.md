# Fix Mobile Network Error (Expo) - Working on Web but Not Mobile

## Problem
- ✅ Works fine on web browser
- ❌ Network error on mobile Expo app

## Root Cause
The backend server is likely only accessible from localhost, not from your mobile device's network.

## Quick Fix Steps

### 1. Check Your Backend Server Configuration

**Current:** Your `.env` shows: `EXPO_PUBLIC_BACKEND_URL=http://192.168.29.202:8080`

**Issue:** Backend might be running on `localhost` which only works on the same computer, not on mobile devices.

### 2. Start Backend on All Network Interfaces

```bash
cd backend

# Stop current server (Ctrl+C if running)

# Start backend accessible from network
php artisan serve --host=0.0.0.0 --port=8000

# OR if port 8000 is taken, use 8080 (match your .env):
php artisan serve --host=0.0.0.0 --port=8080
```

**Important:** Use `--host=0.0.0.0` not `localhost` or `127.0.0.1`!

### 3. Verify Backend is Accessible

**From your computer's browser:**
- Open: `http://192.168.29.202:8080/api/departments`
- Should show JSON response

**From your phone's browser (connected to same WiFi):**
- Open: `http://192.168.29.202:8080/api/departments`
- Should show JSON response

If phone browser can't access it, backend isn't accessible on network.

### 4. Check Windows Firewall

Allow the port through Windows Firewall:

```powershell
# For port 8080
New-NetFirewallRule -DisplayName "Laravel Dev Server 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow

# For port 8000 (if you switch)
New-NetFirewallRule -DisplayName "Laravel Dev Server 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

### 5. Verify Both Devices on Same Network

- Computer and phone must be on **same WiFi network**
- No VPN enabled
- No network isolation

### 6. Update Frontend .env (if needed)

If your backend runs on port 8000 instead of 8080:

```bash
cd frontend

# Edit .env file
EXPO_PUBLIC_BACKEND_URL=http://192.168.29.202:8000
```

### 7. Restart Expo with Cache Clear

```bash
cd frontend

# Stop Expo (Ctrl+C)

# Restart with cache clear
npx expo start --clear
```

### 8. Check Expo Console Logs

Look for these in Expo console:
```
═══════════════════════════════════
🔧 API Configuration Loaded
🔍 Raw ENV value: http://192.168.29.202:8080
📍 Backend URL: http://192.168.29.202:8080
📍 API Base URL: http://192.168.29.202:8080/api
═══════════════════════════════════
```

## Common Network Error Types

### Error: "Network request failed"
**Cause:** Backend not accessible from mobile network
**Fix:** 
1. Start backend with `--host=0.0.0.0`
2. Check firewall
3. Verify same WiFi network

### Error: "Connection refused"
**Cause:** Backend not running or wrong port
**Fix:**
1. Check backend is running: `php artisan serve --host=0.0.0.0 --port=8080`
2. Verify port in `.env` matches backend port

### Error: "Timeout"
**Cause:** Firewall blocking or wrong IP
**Fix:**
1. Check firewall rules
2. Verify IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

## Step-by-Step Complete Fix

1. **Get your computer's IP address:**
   ```powershell
   ipconfig
   # Look for: IPv4 Address: 192.168.x.x
   ```

2. **Start backend on all interfaces:**
   ```bash
   cd backend
   php artisan serve --host=0.0.0.0 --port=8080
   ```

3. **Test from computer browser:**
   - `http://192.168.29.202:8080/api/departments`

4. **Test from phone browser (same WiFi):**
   - `http://192.168.29.202:8080/api/departments`
   - If this doesn't work, backend isn't accessible - check firewall

5. **Update frontend .env:**
   ```env
   EXPO_PUBLIC_BACKEND_URL=http://192.168.29.202:8080
   ```

6. **Restart Expo:**
   ```bash
   cd frontend
   npx expo start --clear
   ```

7. **Test in mobile app**

## Alternative: Use Expo Tunnel (for Testing)

If network connection is too complex, use Expo tunnel:

```bash
cd frontend
npx expo start --tunnel
```

Then update `.env` to use the tunnel URL (but this is slower).

## Still Not Working?

1. **Check backend logs:**
   ```bash
   cd backend
   tail -f storage/logs/laravel.log
   ```
   - See if requests are reaching backend

2. **Check Expo logs:**
   - Look for detailed error messages in Expo console

3. **Test with curl from phone:**
   - Use a network testing app on your phone
   - Test: `http://192.168.29.202:8080/api/departments`

4. **Verify CORS:**
   - Check `backend/config/cors.php`
   - Should allow all origins: `'allowed_origins' => ['*']`

