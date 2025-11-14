# Fix Login - Quick Guide

## Your Problem
Login fails on mobile with "Cannot connect to server" error.

## Root Cause
**Windows Firewall is blocking port 8000**, so your phone can't reach the backend.

## Quick Fix (2 Steps)

### Step 1: Allow Port 8000 in Firewall

**Run PowerShell as Administrator:**
1. Right-click Start → Windows PowerShell (Admin)
2. Run:
   ```powershell
   New-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

**OR use the script:**
- Right-click `doctor_backend/allow-firewall-port.bat`
- Select "Run as Administrator"

### Step 2: Verify Backend is Running

Make sure backend is running with network access:
```bash
cd doctor_backend
php artisan serve --host=0.0.0.0 --port=8000
```

**IMPORTANT:** Must use `--host=0.0.0.0` (NOT `localhost`)

## Why Login Fails

1. You click "Login" in the app
2. App tries to connect to `http://192.168.0.174:8000/api/doctor/login`
3. Windows Firewall blocks the connection
4. Login fails with "Cannot connect to server"

**After fixing firewall → Login will work!**

## Verify It Works

After fixing firewall:
1. Restart Expo: `npx expo start --clear`
2. Try login again
3. Should work now!

## Still Not Working?

### Check 1: Backend Running?
```bash
netstat -an | findstr :8000
```

Should show:
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```

### Check 2: Same WiFi?
- Computer and phone must be on **same WiFi network**
- Phone NOT on mobile data

### Check 3: Test in Phone Browser
Open phone browser → `http://192.168.0.174:8000/api/test`

If this works, login will work too!

## Summary

**The fix is simple:**
1. ✅ Allow port 8000 in Windows Firewall
2. ✅ Backend running with `--host=0.0.0.0`
3. ✅ Both devices on same WiFi

That's it! Login will work after fixing the firewall.

