# Verify Environment Variable is Loading Correctly

## Your Current Setup
Your `.env` file has:
```env
EXPO_PUBLIC_BACKEND_URL=https://medlink.alverstones.com
```

But you're seeing error: `http://http/medlink.alverstones.com`

This means the environment variable **is NOT being loaded correctly**.

## Solution Steps

### Step 1: Verify .env File Location and Content

Make sure your `.env` file is in the `frontend/` directory (same folder as `package.json`).

Open `frontend/.env` and verify it contains **EXACTLY**:
```env
EXPO_PUBLIC_BACKEND_URL=https://medlink.alverstones.com
```

**Check for:**
- ✅ No extra spaces
- ✅ No quotes around the value
- ✅ No blank lines before or after
- ✅ File is saved

### Step 2: Stop Expo Completely

1. Press `Ctrl+C` in the Expo terminal
2. Wait for it to fully stop
3. Close the terminal if needed

### Step 3: Clear All Caches

```bash
cd frontend

# Clear Metro bundler cache
npx expo start --clear

# If that doesn't work, also try:
# Delete node_modules/.cache if it exists
rm -rf node_modules/.cache

# Clear Expo cache
npx expo start -c
```

### Step 4: Check Console Output

After restarting Expo, look at the console. You should see:

```
🔍 DEBUG: Raw BACKEND_URL from env: https://medlink.alverstones.com
═══════════════════════════════════
🔧 API Configuration Loaded
🔍 Raw ENV value: https://medlink.alverstones.com
📍 Backend URL: https://medlink.alverstones.com
📍 API Base URL: https://medlink.alverstones.com/api
═══════════════════════════════════
```

### Step 5: If Still Not Working

If you still see `http://http/` or `undefined`:

1. **Delete `.env` file completely**
2. **Create a new one** with this exact content (copy-paste):

```env
EXPO_PUBLIC_BACKEND_URL=https://medlink.alverstones.com
EXPO_PUBLIC_API_HOST=medlink.alverstones.com
EXPO_PUBLIC_API_PORT=8000
APP_ENV=development
```

3. **Save the file**
4. **Verify file encoding** (should be UTF-8, not UTF-8-BOM)
5. **Restart Expo:** `npx expo start --clear`

### Step 6: Alternative - Use http:// instead of https://

If HTTPS is causing issues, try using HTTP:

```env
EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com
```

Then restart: `npx expo start --clear`

## Verify It's Fixed

After fixing, the API request should go to:
```
✅ POST https://medlink.alverstones.com/api/doctor/login
```

NOT:
```
❌ POST http://http/medlink.alverstones.com/api/doctor/login
```

## Common Issues

### Issue 1: Multiple .env files
Check if you have multiple `.env` files:
- `frontend/.env`
- `frontend/.env.local`
- `.env` (in root directory)

**Solution:** Keep only `frontend/.env` and delete others, or ensure only one has `EXPO_PUBLIC_BACKEND_URL`.

### Issue 2: File not saved
**Solution:** Make sure you saved the file after editing (Ctrl+S).

### Issue 3: Expo using cached value
**Solution:** Always use `--clear` flag: `npx expo start --clear`

### Issue 4: Web platform caching
If testing on web, try:
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Use incognito/private window

## Quick Test

Add this temporarily to see what value is being loaded:

After restarting Expo, check the browser console or Expo console. You should see the debug output showing the raw environment variable value.




