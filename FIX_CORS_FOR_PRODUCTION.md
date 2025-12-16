# Fix CORS Error: Frontend Local + Backend Production

## Problem
When running frontend locally but using backend in production:
- Frontend: `http://localhost:8081` (local development)
- Backend: `http://medlink.alverstones.com` (production on Hostinger)
- Error: "Redirect is not allowed for a preflight request"

## Root Cause
1. Production server redirects HTTP → HTTPS automatically
2. CORS preflight OPTIONS request gets redirected
3. Browser blocks redirected preflight requests ❌

## Solution Applied

### ✅ Auto-Force HTTPS for Production Domains
Updated `frontend/config/api.ts` to automatically convert HTTP to HTTPS for production domains (non-localhost/IP addresses).

**This ensures:**
- Local IP addresses (192.168.x.x, 127.0.0.1) can still use HTTP
- Production domains (medlink.alverstones.com) automatically use HTTPS
- No more redirects = No more CORS errors

## Update Your .env File

**File:** `frontend/.env`

```env
EXPO_PUBLIC_BACKEND_URL=https://medlink.alverstones.com
```

**Important:** Use `https://` directly, but the code will auto-correct if you accidentally use `http://`

## Restart Expo

After updating `.env`, restart Expo with cache clear:

```bash
cd frontend
npx expo start --clear
```

The `--clear` flag is **essential** to reload the new configuration.

## How It Works

1. Frontend reads `EXPO_PUBLIC_BACKEND_URL` from `.env`
2. Code detects it's a production domain (not localhost/IP)
3. Automatically converts `http://` to `https://`
4. All requests use HTTPS from the start
5. No redirects = No CORS errors ✅

## Testing

After restart, check the console logs:
```
═══════════════════════════════════
🔧 API Configuration Loaded
🔍 Raw ENV value: https://medlink.alverstones.com
📍 Backend URL: https://medlink.alverstones.com
📍 API Base URL: https://medlink.alverstones.com/api
═══════════════════════════════════
```

The URL should show `https://` (not `http://`).

## Still Having Issues?

1. **Verify .env file** - Make sure it has `https://medlink.alverstones.com`
2. **Clear Expo cache** - Use `npx expo start --clear`
3. **Check browser console** - Look for the API configuration logs
4. **Hard refresh browser** - `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)





