# Mobile Setup Guide

## Problem: Login/Registration Fails on Mobile

When testing on mobile devices (physical phone or emulator), `localhost:8000` refers to the device itself, not your development computer. This causes API calls to fail.

## Solution: Use Your Computer's IP Address

### Step 1: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" under your WiFi adapter (e.g., `192.168.1.100`)

### Step 2: Update API Configuration

1. Open `AlverstoneMedLink/app/config.ts`
2. Find the line: `const LOCAL_IP = 'YOUR_IP_HERE';`
3. Replace `YOUR_IP_HERE` with your actual IP address:
   ```typescript
   const LOCAL_IP = '192.168.1.100'; // Your actual IP
   ```

### Step 3: Configure Backend to Accept Connections

1. Make sure Laravel is running and accessible from your network:
   ```bash
   cd doctor_backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```
   
   The `--host=0.0.0.0` flag makes the server accessible from other devices on your network.

### Step 4: Configure CORS (if needed)

If you get CORS errors, update `doctor_backend/config/cors.php`:

```php
'allowed_origins' => ['*'], // Allow all origins for development
'allowed_headers' => ['*'],
'allowed_methods' => ['*'],
```

Or add your mobile IP to the allowed origins.

### Step 5: Check Firewall

Make sure your firewall allows incoming connections on port 8000:

**Windows:**
- Open Windows Firewall
- Add an inbound rule for port 8000

**Mac:**
```bash
# Allow port 8000
sudo pfctl -f /etc/pf.conf
```

### Step 6: Verify Network Connection

1. Make sure your phone and computer are on the **same WiFi network**
2. Test the connection:
   - Open a browser on your phone
   - Navigate to: `http://YOUR_IP:8000/api/test`
   - You should see: `{"message":"API routes working ✅"}`

### Step 7: Restart Expo

After making changes, restart Expo with cache cleared:

```bash
npx expo start --clear
```

## Troubleshooting

### "Network Error" or "Connection Refused"

1. ✅ Check backend is running: `php artisan serve --host=0.0.0.0 --port=8000`
2. ✅ Verify IP address in `app/config.ts` is correct
3. ✅ Ensure phone and computer are on same WiFi
4. ✅ Check firewall allows port 8000
5. ✅ Try accessing `http://YOUR_IP:8000/api/test` in phone browser

### "CORS Error"

1. Update `doctor_backend/config/cors.php` to allow your origin
2. Clear Laravel config cache: `php artisan config:clear`

### Still Not Working?

1. Check console logs in Expo for detailed error messages
2. Verify backend is accessible: `curl http://YOUR_IP:8000/api/test`
3. Check Laravel logs: `doctor_backend/storage/logs/laravel.log`

## Quick Test

After setup, test the API connection:

1. Open the app on your phone
2. Try to login or register
3. Check the Expo console for any errors
4. If you see "Network Error", double-check the IP address

## Example Configuration

```typescript
// app/config.ts
const LOCAL_IP = '192.168.1.100'; // Your computer's IP
const API_PORT = '8000';
```

## Production

For production, you'll want to:
1. Use environment variables
2. Set up proper CORS configuration
3. Use HTTPS
4. Configure proper domain names

