# Debug Mobile Connection Issue

## Current Situation
- ✅ **Web works** - Backend is accessible from your computer
- ❌ **Mobile doesn't work** - Mobile device can't connect

## Why This Happens

Since web works, your backend IS running and accessible. The issue is that **mobile devices can't reach your computer's IP address**.

## Quick Diagnosis

### Step 1: Check What URL Mobile is Using

When you open the app on mobile, check the Expo console. You should see:
```
🔗 API Base URL: http://192.168.0.174:8000/api
📱 Platform: android (or ios)
```

**If you see `localhost` instead**, the config isn't being loaded correctly.

### Step 2: Test from Phone Browser FIRST

**This is the most important test:**

1. Open Chrome/Safari on your phone
2. Go to: `http://192.168.0.174:8000/api/test`
3. What happens?
   - ✅ **Works** → Backend is accessible, app issue
   - ❌ **Doesn't work** → Backend NOT accessible from phone (firewall/network)

### Step 3: Check Windows Firewall

Even if web works, **Windows Firewall might block mobile devices specifically**.

**Fix:**
1. Open PowerShell as Administrator
2. Run:
   ```powershell
   New-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

Or use: `doctor_backend/allow-firewall-port.bat` (Run as Administrator)

### Step 4: Verify Network

**Both devices must be on the same WiFi network:**
- Computer: Connected to WiFi
- Phone: Connected to **same WiFi** (not mobile data!)

### Step 5: Check Backend is Listening on Network

Run this command:
```bash
netstat -an | findstr :8000
```

You should see:
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```

If you see `127.0.0.1:8000` instead, the server is NOT accessible from network!

## Common Issues

### Issue 1: Firewall Blocks Mobile But Not Web
**Why:** Windows Firewall might allow local connections but block external devices
**Fix:** Add firewall rule (see Step 3)

### Issue 2: Router AP Isolation
**Why:** Some routers block device-to-device communication
**Fix:** Check router settings, disable "AP Isolation" or "Client Isolation"

### Issue 3: Different Networks
**Why:** Phone on mobile data or different WiFi
**Fix:** Connect both to same WiFi network

### Issue 4: IP Address Changed
**Why:** IP address might have changed
**Fix:** Run `ipconfig` again, update `config/api.ts` if needed

## File Structure (For Reference)

- ✅ `app/api.js` - **Still exists and working** (JavaScript file for API calls)
- ✅ `config/api.ts` - **Config file** (TypeScript, defines IP address)
- ✅ `app/api.js` imports from `config/api.ts`

**Nothing changed in api.js** - we just moved the config file location.

## Still Not Working?

1. **Check Expo console logs** - What URL is shown?
2. **Test in phone browser** - Does `http://192.168.0.174:8000/api/test` work?
3. **Check firewall** - Is port 8000 allowed?
4. **Check network** - Same WiFi for both devices?

The logs will tell you exactly what's happening!

