# Quick Start Guide - Mobile Testing

## ✅ Your IP is Configured: 192.168.0.174

The app is now configured to use your IP address for mobile testing.

## Step-by-Step Setup

### 1. Start Backend Server (IMPORTANT!)
```bash
cd doctor_backend
php artisan serve --host=0.0.0.0 --port=8000
```

**⚠️ CRITICAL:** You MUST use `--host=0.0.0.0` to make it accessible from mobile devices!

### 2. Verify Backend is Accessible
Open browser on your phone (same WiFi) and go to:
```
http://192.168.0.174:8000/api/test
```

You should see: `{"message":"API routes working ✅"}`

If this doesn't work, the backend is not accessible. Check:
- Backend is running with `--host=0.0.0.0`
- Firewall allows port 8000
- Phone and computer are on same WiFi

### 3. Start Expo (Clear Cache)
```bash
cd AlverstoneMedLink
npx expo start --clear
```

### 4. Open App on Your Phone
- Open Expo Go app
- Scan the QR code from terminal
- Or use the tunnel URL

### 5. Check Console Logs
When the app starts, you should see in Expo console:
```
═══════════════════════════════════════
🔗 API Configuration
═══════════════════════════════════════
📍 Local IP: 192.168.0.174
🔌 API Port: 8000
🌐 API Base URL: http://192.168.0.174:8000/api
📱 Platform: android (or ios)
═══════════════════════════════════════
✅ Mobile IP configured: 192.168.0.174
```

### 6. Test Login/Registration
When you try to login, you should see:
```
📤 POST http://192.168.0.174:8000/api/doctor/login
```

If you see `localhost` instead, the cache wasn't cleared. Restart with `--clear`.

## Troubleshooting

### Still Getting Errors?

1. **Check Expo Console:**
   - Look for the API Configuration logs
   - Check what URL is being used for API calls
   - Look for any error messages

2. **Test Backend First:**
   - Open phone browser
   - Go to: `http://192.168.0.174:8000/api/test`
   - If this doesn't work, backend is not accessible

3. **Common Issues:**
   - ❌ Backend not running → Start with `--host=0.0.0.0`
   - ❌ Wrong IP address → Check `ipconfig` again
   - ❌ Different WiFi networks → Connect both to same WiFi
   - ❌ Firewall blocking → Allow port 8000
   - ❌ Cache not cleared → Use `npx expo start --clear`

## About the Android Device Error

The error about "No Android connected device" is **NORMAL** when using Expo Go app. You don't need an emulator or USB connection. Just:
1. Open Expo Go app on your phone
2. Scan the QR code
3. The app will load

This error appears because Expo is trying to find a connected device, but since you're using Expo Go, you can ignore it.

## Need Help?

Check the console logs - they will show:
- What IP is being used
- What URL is being called
- Any error messages

The logs will help identify the exact issue!

