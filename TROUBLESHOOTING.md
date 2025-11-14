# Troubleshooting: "Cannot Connect to Server"

## Your Setup
- ✅ IP Address: 192.168.0.174
- ✅ Backend Running: Yes
- ✅ Same WiFi: Yes
- ❌ Still Getting Error: "Cannot connect to server"

## Most Common Issue: Windows Firewall

**Windows Firewall is likely blocking port 8000!**

### Quick Fix (Run as Administrator):

1. **Option 1: Use the provided script**
   ```bash
   cd doctor_backend
   # Right-click "allow-firewall-port.bat" → Run as Administrator
   ```

2. **Option 2: Manual Windows Firewall Fix**
   - Open "Windows Defender Firewall with Advanced Security"
   - Click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - TCP, Specific local ports: `8000` → Next
   - Allow the connection → Next
   - Check all (Domain, Private, Public) → Next
   - Name: "Laravel Backend" → Finish

3. **Option 3: PowerShell (Run as Administrator)**
   ```powershell
   New-NetFirewallRule -DisplayName "Laravel Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

### Verify Backend is Accessible

**Step 1: Check if server is listening on 0.0.0.0**
```bash
cd doctor_backend
# Run the check script
check-port.bat
```

You should see:
```
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```

If you see `127.0.0.1:8000` instead, the server is NOT accessible from network!

**Step 2: Test from Phone Browser**
1. Open browser on phone
2. Go to: `http://192.168.0.174:8000/api/test`
3. You MUST see: `{"message":"API routes working ✅",...}`

**If this doesn't work, the backend is NOT accessible from your phone!**

### Common Causes:

1. **Backend not running with --host=0.0.0.0**
   ```bash
   # WRONG (only localhost):
   php artisan serve
   
   # CORRECT (network accessible):
   php artisan serve --host=0.0.0.0 --port=8000
   ```

2. **Windows Firewall blocking port 8000**
   - Use the firewall script above
   - Or manually add the rule

3. **Antivirus blocking connection**
   - Temporarily disable to test
   - Add exception for port 8000

4. **Different WiFi networks**
   - Phone on mobile data? Won't work!
   - Phone on different WiFi? Won't work!
   - Both must be on same WiFi network

5. **IP address changed**
   - Run `ipconfig` again
   - IP might have changed
   - Update `app/config.ts` if needed

### Diagnostic Steps:

1. **Check server status:**
   ```bash
   netstat -an | findstr :8000
   ```
   Should show: `TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING`

2. **Test from computer browser:**
   - `http://localhost:8000/api/test` → Should work
   - `http://192.168.0.174:8000/api/test` → Should work

3. **Test from phone browser:**
   - `http://192.168.0.174:8000/api/test` → MUST work before app will work

4. **Check Expo console:**
   - Look for API Configuration logs
   - Check what URL is being used
   - Look for error details

### Still Not Working?

Try these alternatives:

1. **Use different port:**
   ```bash
   php artisan serve --host=0.0.0.0 --port=8080
   ```
   Update `app/config.ts`: `const API_PORT = '8080';`

2. **Use ngrok (tunnel):**
   ```bash
   # Install ngrok, then:
   ngrok http 8000
   # Use the ngrok URL in app/config.ts
   ```

3. **Check if router has AP isolation:**
   - Some routers block device-to-device communication
   - Check router settings
   - Disable "AP Isolation" or "Client Isolation"

### What to Check in Expo Console:

When app starts, you should see:
```
🔗 API Base URL: http://192.168.0.174:8000/api
📱 Platform: android
```

When you try to login, you should see:
```
📤 POST http://192.168.0.174:8000/api/doctor/login
```

If you see `localhost` instead, the config is not being used (cache issue).

### Final Checklist:

- [ ] Backend running: `php artisan serve --host=0.0.0.0 --port=8000`
- [ ] Firewall allows port 8000
- [ ] Phone browser can access: `http://192.168.0.174:8000/api/test`
- [ ] Both devices on same WiFi
- [ ] Expo restarted with `--clear`
- [ ] Console shows correct IP address

If all checked and still not working, check router settings for AP isolation.

