# Test Hostinger Backend Connection

## Current Configuration ✅
Your `.env` file is correctly set:
```
EXPO_PUBLIC_BACKEND_URL=https://medlink.alverstones.com
```

## 🔧 Fix Steps

### Step 1: Clear Expo Cache and Restart
```bash
cd frontend
# Stop Expo (Ctrl+C)
npx expo start --clear
```

**IMPORTANT:** The `--clear` flag is essential to reload the `.env` file.

### Step 2: Verify Backend is Accessible

**Test in Browser:**
```
https://medlink.alverstones.com/api/test
```

**Or test registration endpoint:**
```
https://medlink.alverstones.com/api/doctor/registration/send-otp
```

If you get a response (even an error), the backend is reachable.

### Step 3: Check Console Logs

When Expo starts, you should see:
```
🔧 API CONFIG LOADED (Development)
Backend URL: https://medlink.alverstones.com
API Base URL: https://medlink.alverstones.com/api
```

If you see `undefined` or wrong URL, the `.env` file isn't being loaded.

### Step 4: Test in App

Try to register/login. Check the console for:
- Request URL being called
- Error messages
- Network status

## 🐛 Common Issues

### Issue 1: "Unable to connect"
**Possible causes:**
- Backend server down on Hostinger
- Network/firewall blocking
- SSL certificate issue
- Wrong URL (but yours is correct)

**Fix:**
1. Test backend in browser first
2. Check Hostinger server status
3. Try from different network (mobile data vs WiFi)

### Issue 2: SSL Certificate Error
**Symptoms:**
- ERR_CERT errors
- Certificate validation failed

**Fix:**
- Check certificate in browser
- Verify Hostinger SSL is valid
- May need to configure SSL pinning in React Native

### Issue 3: CORS Error
**Symptoms:**
- CORS policy errors
- Preflight request fails

**Fix:**
- Backend CORS is already configured to allow all origins
- Should not be an issue

### Issue 4: Timeout
**Symptoms:**
- Request times out
- No response after 120 seconds

**Fix:**
- Check backend response time
- Verify Hostinger server performance
- Check network speed

## 🔍 Debugging

### Add Temporary Debug Code
In any screen, add:
```javascript
import { API_BASE_URL } from '@/config/api';
console.log('🔍 Current API URL:', API_BASE_URL);
```

### Check Network Tab
In Expo DevTools, check:
- Network requests
- Request URLs
- Response status
- Error details

### Test Direct API Call
```javascript
import API from './api';

// Test connection
API.get('/test')
  .then(res => console.log('✅ Connected:', res.data))
  .catch(err => console.error('❌ Error:', err.message));
```

## ✅ Verification Checklist

- [ ] `.env` file exists with correct URL
- [ ] Restarted Expo with `--clear` flag
- [ ] Console shows correct API URL
- [ ] Backend accessible in browser
- [ ] Network connectivity working
- [ ] No SSL certificate errors
- [ ] CORS configured correctly (already done)

## 🚨 Still Not Working?

1. **Check Hostinger:**
   - Is Laravel running?
   - Are routes accessible?
   - Check Hostinger error logs

2. **Check Network:**
   - Try different network
   - Test on device browser
   - Check firewall settings

3. **Check Expo:**
   - Try hardcoding URL temporarily
   - Check app.config.js
   - Verify environment variables
