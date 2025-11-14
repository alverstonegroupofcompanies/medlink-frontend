# Diagnose Backend Connection Failure

## Your Error
```
📍 Testing URL: http://192.168.0.174:8000/api/test
⚠️ Backend connection test failed: Network error
```

## What This Means
- ✅ **IP address is correct**: `192.168.0.174`
- ✅ **URL is correct**: `http://192.168.0.174:8000/api/test`
- ❌ **Mobile device CANNOT reach your computer**

## Step-by-Step Diagnosis

### Step 1: Is Backend Running?
Check if backend is actually running:
```bash
cd doctor_backend
php artisan serve --host=0.0.0.0 --port=8000
```

**CRITICAL:** Must use `--host=0.0.0.0` (NOT `localhost` or `127.0.0.1`)

You should see:
```
INFO  Server running on [http://0.0.0.0:8000]
```

### Step 2: Test from Computer Browser
Open on your computer:
- `http://localhost:8000/api/test` → Should work
- `http://192.168.0.174:8000/api/test` → Should work

If these don't work, backend isn't running correctly.

### Step 3: Test from Phone Browser (MOST IMPORTANT)
**This is the critical test:**

1. Open Chrome/Safari on your phone
2. Go to: `http://192.168.0.174:8000/api/test`
3. What happens?

**Results:**
- ✅ **Works** → Backend is accessible, app issue (unlikely)
- ❌ **Doesn't work** → Backend NOT accessible from phone (firewall/network)

### Step 4: Check Windows Firewall
**Most common issue!** Windows Firewall blocks port 8000.

**Fix (Run PowerShell as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

Or use the script:
- Right-click `doctor_backend/allow-firewall-port.bat`
- Select "Run as Administrator"

### Step 5: Verify Server is Listening on Network
Run this command:
```bash
netstat -an | findstr :8000
```

**You should see:**
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```

**If you see this instead:**
```
TCP    127.0.0.1:8000    0.0.0.0:0    LISTENING
```
→ Server is NOT accessible from network! Must use `--host=0.0.0.0`

### Step 6: Check Network Connection
**Both devices must be on same WiFi:**
- Computer: Connected to WiFi
- Phone: Connected to **same WiFi** (NOT mobile data!)

**Verify:**
- Computer IP: Run `ipconfig` → Should show `192.168.0.174`
- Phone WiFi: Settings → WiFi → Should show same network name

## Common Issues & Solutions

### Issue 1: Firewall Blocking
**Symptom:** Works on computer, fails on phone
**Solution:** Add firewall rule (see Step 4)

### Issue 2: Backend Not Listening on Network
**Symptom:** `netstat` shows `127.0.0.1:8000`
**Solution:** Restart with `--host=0.0.0.0`

### Issue 3: Different Networks
**Symptom:** Phone on mobile data or different WiFi
**Solution:** Connect both to same WiFi network

### Issue 4: Router AP Isolation
**Symptom:** Everything looks correct but still fails
**Solution:** Check router settings, disable "AP Isolation" or "Client Isolation"

### Issue 5: IP Address Changed
**Symptom:** Was working, suddenly stopped
**Solution:** Run `ipconfig` again, update `config/api.ts` if IP changed

## Quick Fix Checklist

- [ ] Backend running: `php artisan serve --host=0.0.0.0 --port=8000`
- [ ] Firewall allows port 8000
- [ ] `netstat` shows `0.0.0.0:8000` (not `127.0.0.1:8000`)
- [ ] Phone browser can access `http://192.168.0.174:8000/api/test`
- [ ] Both devices on same WiFi network
- [ ] IP address is correct (`ipconfig` to verify)

## Most Likely Issue

**Windows Firewall is blocking port 8000!**

Fix it:
1. Run PowerShell as Administrator
2. Run: `New-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow`
3. Test again in phone browser

If phone browser test works, the app will work too!

