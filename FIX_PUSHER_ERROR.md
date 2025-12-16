# Fix Pusher-js Bundling Error

## Error
```
SyntaxError: Unexpected token (1:1020)
node_modules\pusher-js\dist\react-native\pusher.js
```

## Solution

The error occurs because `pusher-js` has bundling issues with React Native/Expo. Here's how to fix it:

### Step 1: Install Required Dependencies

The peer dependency is already added. Run:

```bash
cd frontend
npm install
```

### Step 2: Clear Metro Bundler Cache

Clear the cache and restart:

```bash
cd frontend
npx expo start --clear
```

Or manually:

```bash
rm -rf node_modules/.cache
npx expo start -c
```

### Step 3: If Still Failing - Reinstall Dependencies

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```

### Step 4: Alternative - Use Different Pusher Version

If the issue persists, try installing a specific version:

```bash
cd frontend
npm uninstall pusher-js
npm install pusher-js@8.3.0
npm install
```

## What Was Changed

1. **Created Pusher Utility Wrapper** (`utils/pusher.ts`)
   - Handles Pusher initialization gracefully
   - Falls back if Pusher fails to load
   - Better error handling

2. **Updated Live Tracking Component**
   - Uses the Pusher wrapper instead of direct import
   - Handles errors gracefully
   - Falls back to polling if WebSocket fails

3. **Added Peer Dependency**
   - `@react-native-community/netinfo` (required by pusher-js)

4. **Updated Metro Config**
   - Added support for `.cjs` and `.mjs` files

## Testing

After fixing, test the live tracking screen:
1. Open hospital live tracking
2. Check console for Pusher connection status
3. Should see either "Live updates (WebSocket)" or "Auto-refreshing every 15s"

## Fallback

If Pusher still doesn't work, the app will automatically fall back to polling every 15 seconds. The real-time features won't work, but the app will still function.


