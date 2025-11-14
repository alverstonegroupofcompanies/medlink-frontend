# Fix Metro Disconnect Error

## What This Error Means

```
Disconnected from Metro (1006: "")
```

This means your **mobile app lost connection to the Metro bundler** (the development server that serves your JavaScript code).

**This is NOT related to your API connection issue** - this is about the app code itself, not the backend API.

## Common Causes

1. **Metro bundler stopped/crashed**
2. **Network connection lost** (WiFi disconnected)
3. **Device disconnected** from development server
4. **Firewall blocking Metro's connection**
5. **Expo server restarted** but app didn't reconnect

## Quick Fixes

### Fix 1: Reload the App
**Easiest solution:**
- Shake your phone (or press `Ctrl+M` on Android emulator)
- Tap "Reload" or "Reload App"

### Fix 2: Restart Metro Bundler
1. Stop Metro (press `Ctrl+C` in the terminal)
2. Clear cache and restart:
   ```bash
   npx expo start --clear
   ```
3. Reconnect your phone (scan QR code again)

### Fix 3: Check Network Connection
- **Phone and computer must be on same WiFi network**
- If using Expo Go, both devices need internet connection
- Try switching WiFi networks

### Fix 4: Use Tunnel Mode (If Local Network Fails)
If local network doesn't work, use Expo's tunnel:
```bash
npx expo start --tunnel
```
This creates a public URL but may be slower.

### Fix 5: Check Firewall (If Using Local Network)
Metro uses port **8081** by default. Make sure firewall allows it:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Metro Bundler Port 8081" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

## Step-by-Step Solution

### Step 1: Stop Everything
1. Stop Metro bundler (Ctrl+C)
2. Close Expo Go app on phone

### Step 2: Clear Cache
```bash
cd AlverstoneMedLink
npx expo start --clear
```

### Step 3: Reconnect
1. Open Expo Go app on phone
2. Scan the QR code again
3. Wait for app to load

### Step 4: If Still Fails - Use Tunnel
```bash
npx expo start --tunnel
```
Then scan the new QR code.

## Prevention

1. **Keep Metro running** - Don't close the terminal
2. **Stay on same WiFi** - Don't switch networks
3. **Keep app active** - Don't let phone go to sleep
4. **Use tunnel mode** if local network is unreliable

## Difference Between Errors

- **Metro Disconnect** → App can't load JavaScript code
- **API Connection Error** → App loads but can't connect to backend

These are **separate issues**:
- Metro = Development server (serves app code)
- API = Backend server (serves data)

## Still Not Working?

1. **Check Metro is running** - Look at terminal, should see "Metro waiting on..."
2. **Check phone WiFi** - Same network as computer?
3. **Try tunnel mode** - `npx expo start --tunnel`
4. **Restart everything** - Metro, phone app, WiFi

This is usually just a network hiccup - reloading the app fixes it most of the time!

