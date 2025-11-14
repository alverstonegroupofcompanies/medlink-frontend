# Fixes Applied

## Issues Fixed

### 1. ✅ Config File Route Warning
**Problem:** `app/config.ts` was being treated as a route by Expo Router, causing warnings.

**Fix:** Moved config file to `config/api.ts` (outside the `app/` folder)

### 2. ✅ Circular Dependency
**Problem:** `utils/auth.ts` → `app/api.js` → `utils/auth.ts` circular dependency

**Fix:** Removed dependency on `utils/auth` from `app/api.js` by using `AsyncStorage` directly

### 3. ✅ Network Connection Issue
**Problem:** App can't connect to backend at `http://192.168.0.174:8000/api`

**Status:** Configuration is correct, but connection is being blocked (likely firewall)

## Current Status

From your logs:
- ✅ IP Address: `192.168.0.174` (correctly configured)
- ✅ API URL: `http://192.168.0.174:8000/api` (correct)
- ✅ Platform: Android (detected correctly)
- ❌ Connection: `ERR_NETWORK` (blocked)

## Next Steps - Fix Network Connection

### Step 1: Allow Port 8000 in Windows Firewall

**Option A: Use PowerShell (Run as Administrator)**
```powershell
New-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

**Option B: Use the Script**
1. Right-click `doctor_backend/allow-firewall-port.bat`
2. Select "Run as Administrator"

**Option C: Manual Windows Firewall**
1. Open "Windows Defender Firewall with Advanced Security"
2. Click "Inbound Rules" → "New Rule"
3. Select "Port" → Next
4. TCP, Specific local ports: `8000` → Next
5. Allow the connection → Next
6. Check all (Domain, Private, Public) → Next
7. Name: "Laravel Backend" → Finish

### Step 2: Verify Backend is Running Correctly

```bash
cd doctor_backend
php artisan serve --host=0.0.0.0 --port=8000
```

**IMPORTANT:** Must use `--host=0.0.0.0` (not `localhost` or `127.0.0.1`)

You should see:
```
INFO  Server running on [http://0.0.0.0:8000]
```

### Step 3: Test from Phone Browser FIRST

**Before testing in the app**, test in your phone's browser:

1. Open Chrome/Safari on your phone
2. Go to: `http://192.168.0.174:8000/api/test`
3. You MUST see: `{"message":"API routes working ✅",...}`

**If this doesn't work, the backend is NOT accessible from your phone!**

### Step 4: Check Server is Listening on Network

Run this command:
```bash
netstat -an | findstr :8000
```

You should see:
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```

If you see `127.0.0.1:8000` instead, the server is NOT accessible from network!

### Step 5: Restart Expo

After fixing firewall:
```bash
cd AlverstoneMedLink
npx expo start --clear
```

## Troubleshooting

### Still Getting "Network Error"?

1. **Check Firewall:**
   - Windows Firewall must allow port 8000
   - Antivirus may also block it (temporarily disable to test)

2. **Check Backend:**
   - Must run with `--host=0.0.0.0`
   - Check if it's actually running: `netstat -an | findstr :8000`

3. **Check Network:**
   - Both devices on same WiFi?
   - Phone not on mobile data?
   - Router doesn't have AP isolation enabled?

4. **Test in Phone Browser:**
   - If `http://192.168.0.174:8000/api/test` doesn't work in browser, the app won't work either

### Alternative: Use ngrok (If Local Network Doesn't Work)

If firewall/router issues persist, use ngrok:

```bash
# Install ngrok, then:
ngrok http 8000
# Use the ngrok URL in config/api.ts
```

## What Changed

- ✅ `app/config.ts` → `config/api.ts` (moved out of app folder)
- ✅ Fixed circular dependency in `app/api.js`
- ✅ All imports updated to new path
- ✅ Better error logging for network issues

The app is now correctly configured. The remaining issue is network connectivity (firewall/router).

