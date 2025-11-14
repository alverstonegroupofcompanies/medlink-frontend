# Quick Fix - Backend Connection Failing

## Your Issue
Mobile app can't connect to `http://192.168.0.174:8000/api/test`

## Most Likely Cause: Windows Firewall

**90% of the time, this is Windows Firewall blocking port 8000.**

## Immediate Fix (2 minutes)

### Step 1: Allow Port 8000 in Firewall

**Option A: PowerShell (Run as Administrator)**
1. Right-click Start → Windows PowerShell (Admin)
2. Run this command:
   ```powershell
   New-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```
3. You should see: `Ok`

**Option B: Use the Script**
1. Navigate to: `doctor_backend/allow-firewall-port.bat`
2. Right-click → "Run as Administrator"
3. Done!

### Step 2: Verify Backend is Running

Open terminal and run:
```bash
cd doctor_backend
php artisan serve --host=0.0.0.0 --port=8000
```

**IMPORTANT:** Must use `--host=0.0.0.0` (NOT `localhost`)

### Step 3: Test from Phone Browser

**This is the critical test:**

1. Open Chrome/Safari on your phone
2. Type in address bar: `http://192.168.0.174:8000/api/test`
3. Press Enter

**Expected Result:**
```json
{"message":"API routes working ✅","timestamp":"...","server_ip":"...","client_ip":"..."}
```

**If this works → App will work too!**
**If this fails → Backend still not accessible (check network/firewall)**

### Step 4: Restart Expo

After fixing firewall:
```bash
cd AlverstoneMedLink
npx expo start --clear
```

Then reload the app on your phone.

## Why This Happens

- **Web works** because browser on your computer can access `localhost`
- **Mobile fails** because phone can't reach your computer's IP address
- **Firewall blocks** incoming connections from other devices (like your phone)

## Still Not Working?

### Check 1: Is Backend Actually Running?
```bash
netstat -an | findstr :8000
```

Should show:
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```

If you see `127.0.0.1:8000` instead, backend is NOT accessible from network!

### Check 2: Are Both Devices on Same WiFi?
- Computer: Check WiFi name
- Phone: Check WiFi name
- Must be **exactly the same**!

### Check 3: Is IP Address Correct?
```bash
ipconfig
```

Look for "IPv4 Address" under your WiFi adapter. Should be `192.168.0.174`.

If different, update `config/api.ts` with correct IP.

## Summary

1. ✅ Fix firewall (most important!)
2. ✅ Verify backend running with `--host=0.0.0.0`
3. ✅ Test in phone browser
4. ✅ Restart Expo

The phone browser test is the key - if that works, everything will work!

