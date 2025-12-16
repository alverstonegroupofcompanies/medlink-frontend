# Fix: Incorrect API URL Error

## Problem
You're seeing this error:
```
POST http://localhost:8081/medlink.alverstones.com/api/doctor/login 404 (Not Found)
```

This happens when the `.env` file has an incorrect format or Expo hasn't loaded the new values.

## Solution

### Step 1: Update `.env` file

Open `frontend/.env` and ensure it has this **EXACT** format:

```env
EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com
EXPO_PUBLIC_API_HOST=medlink.alverstones.com
EXPO_PUBLIC_API_PORT=8000
APP_ENV=development
```

**IMPORTANT:**
- ✅ Must include `http://` protocol
- ✅ No trailing slash
- ✅ No spaces around `=`
- ✅ No quotes needed

### Step 2: Clear Expo Cache and Restart

```bash
cd frontend
npx expo start --clear
```

The `--clear` flag is **REQUIRED** to reload the `.env` file!

### Step 3: Verify Configuration

After restarting Expo, check the console logs. You should see:

```
═══════════════════════════════════
🔧 API Configuration Loaded
📍 Backend URL: http://medlink.alverstones.com
📍 API Base URL: http://medlink.alverstones.com/api
═══════════════════════════════════
```

If you see `undefined` or `localhost:8081`, the `.env` file isn't being loaded correctly.

## Common Issues

### Issue 1: `.env` file missing protocol
**Wrong:**
```env
EXPO_PUBLIC_BACKEND_URL=medlink.alverstones.com
```

**Correct:**
```env
EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com
```

### Issue 2: Old cached values
**Solution:** Always use `--clear` flag:
```bash
npx expo start --clear
```

### Issue 3: `.env` file in wrong location
**Must be in:** `frontend/.env` (same directory as `package.json`)

### Issue 4: Environment variable not loaded
**Check:** Make sure `app.config.js` has:
```javascript
require('dotenv').config();
```

## Quick Fix Command

If `.env` file exists but has wrong values:

```bash
cd frontend
echo "EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com" > .env
echo "EXPO_PUBLIC_API_HOST=medlink.alverstones.com" >> .env
echo "EXPO_PUBLIC_API_PORT=8000" >> .env
echo "APP_ENV=development" >> .env
npx expo start --clear
```

## Verify It's Working

After fixing, try logging in again. The API request should go to:
```
POST http://medlink.alverstones.com/api/doctor/login
```

NOT:
```
POST http://localhost:8081/medlink.alverstones.com/api/doctor/login
```




