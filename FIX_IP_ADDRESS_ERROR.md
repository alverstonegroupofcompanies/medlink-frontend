# Fix IP Address Configuration Error

## Your Current Configuration

Your `.env` file has:
```
EXPO_PUBLIC_BACKEND_URL=http://192.168.29.202:8080
```

## ✅ Format is Correct!

The format you're using is correct:
- ✅ Has protocol: `http://`
- ✅ Has IP address: `192.168.29.202`
- ✅ Has port: `8080`

## Common Issues & Solutions

### 1. **Wrong Port Number**

Most Laravel backends run on port **8000**, not 8080. Check your backend:

**Quick Check:**
```bash
# In your backend directory
php artisan serve --host=192.168.29.202 --port=8000
```

**Fix:**
If your backend runs on port 8000, update your `.env`:
```
EXPO_PUBLIC_BACKEND_URL=http://192.168.29.202:8000
```

### 2. **Didn't Restart Expo After Changing .env**

Environment variables are loaded when Expo starts. You MUST restart Expo after changing `.env`:

```bash
# Stop Expo (Ctrl+C)
# Then restart with cache clear:
npx expo start --clear
```

### 3. **Backend Not Accessible from Network**

The backend must be accessible from your device's network. Check:

**Backend Setup:**
```bash
# Make sure backend is running on ALL network interfaces (0.0.0.0)
php artisan serve --host=0.0.0.0 --port=8000

# OR specify your IP explicitly
php artisan serve --host=192.168.29.202 --port=8000
```

**Verify Backend is Running:**
- Open browser on your computer: `http://192.168.29.202:8000`
- Should see Laravel welcome page or API response

### 4. **Android Network Security (HTTP Connection)**

Android blocks HTTP connections by default. The app config already allows cleartext traffic, but verify:

**File:** `frontend/app.config.js` (Already configured ✅)
```javascript
android: {
  usesCleartextTraffic: true  // ✅ This is already set
}
```

### 5. **Firewall Blocking Connection**

Check Windows Firewall:

```powershell
# Allow Laravel through firewall
New-NetFirewallRule -DisplayName "Laravel Development Server" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

### 6. **Wrong IP Address**

Verify your computer's IP address:

```powershell
# Get your IP address
ipconfig
# Look for IPv4 Address: 192.168.29.202
```

### 7. **CORS Issues**

Check backend CORS configuration:

**File:** `backend/config/cors.php`
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['*'], // Or specific: ['http://192.168.29.202:19000']
```

## Step-by-Step Fix Process

1. **Stop Expo** (if running)

2. **Check Backend Port:**
   ```bash
   cd backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```

3. **Update .env File:**
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.29.202:8000
   ```
   (Change port if needed - 8000 is standard for Laravel)

4. **Restart Expo with Cache Clear:**
   ```bash
   cd frontend
   npx expo start --clear
   ```

5. **Test Connection:**
   - Check Expo console for API configuration logs
   - Try login/signup - should connect to backend

## Quick Debug Check

Run this to see what Expo is loading:

```bash
cd frontend
npx expo start --clear
```

Look for these logs in the console:
```
═══════════════════════════════════
🔧 API Configuration Loaded
🔍 Raw ENV value: http://192.168.29.202:8000
📍 Backend URL: http://192.168.29.202:8000
📍 API Base URL: http://192.168.29.202:8000/api
═══════════════════════════════════
```

## Common Errors

### Error: "Network request failed"
- Backend not running
- Wrong IP/port
- Firewall blocking
- Device not on same network

### Error: "Connection refused"
- Backend not accessible on network
- Wrong port number
- Backend not started with `--host=0.0.0.0`

### Error: "CORS policy"
- Add CORS configuration in backend
- Check `backend/config/cors.php`

## Still Having Issues?

1. **Check Backend Logs:**
   ```bash
   cd backend
   tail -f storage/logs/laravel.log
   ```

2. **Check Expo Logs:**
   Look for API error messages in Expo console

3. **Test Backend Directly:**
   ```bash
   curl http://192.168.29.202:8000/api/departments
   ```

4. **Verify Network:**
   - Both devices (computer + phone) on same WiFi network
   - No VPN interfering
   - No network isolation enabled

