# Fix: http://http/ Double Protocol Error

## Problem
You're seeing this error:
```
http://http/medlink.alverstones.com/api/doctor/login
net::ERR_NAME_NOT_RESOLVED
```

This means your `.env` file has a malformed URL with double protocols.

## Solution

### Step 1: Check your `.env` file

Open `frontend/.env` and check the value. It might look like one of these **WRONG** formats:

**❌ WRONG Examples:**
```env
EXPO_PUBLIC_BACKEND_URL=http://http://medlink.alverstones.com
EXPO_PUBLIC_BACKEND_URL=http://http/medlink.alverstones.com
EXPO_PUBLIC_BACKEND_URL="http://medlink.alverstones.com"
EXPO_PUBLIC_BACKEND_URL=medlink.alverstones.com
```

### Step 2: Fix the `.env` file

**✅ CORRECT Format:**
```env
EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com
EXPO_PUBLIC_API_HOST=medlink.alverstones.com
EXPO_PUBLIC_API_PORT=8000
APP_ENV=development
```

**Important:**
- ✅ Must have exactly ONE `http://` protocol
- ✅ No quotes around the value
- ✅ No spaces around the `=` sign
- ✅ No trailing slash

### Step 3: Delete and recreate the `.env` file (Recommended)

If the file is corrupted, delete it and create a new one:

**On Windows (PowerShell):**
```powershell
cd frontend
Remove-Item .env -ErrorAction SilentlyContinue
@"
EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com
EXPO_PUBLIC_API_HOST=medlink.alverstones.com
EXPO_PUBLIC_API_PORT=8000
APP_ENV=development
"@ | Out-File -FilePath .env -Encoding utf8
```

**On Mac/Linux:**
```bash
cd frontend
rm -f .env
cat > .env << EOF
EXPO_PUBLIC_BACKEND_URL=http://medlink.alverstones.com
EXPO_PUBLIC_API_HOST=medlink.alverstones.com
EXPO_PUBLIC_API_PORT=8000
APP_ENV=development
EOF
```

### Step 4: Clear Expo cache and restart

```bash
cd frontend
npx expo start --clear
```

**CRITICAL:** You MUST use the `--clear` flag to reload the `.env` file!

### Step 5: Verify the configuration

After restarting Expo, check the console. You should see:

```
═══════════════════════════════════
🔧 API Configuration Loaded
📍 Backend URL: https://medlink.alverstones.com
📍 API Base URL: https://medlink.alverstones.com/api
═══════════════════════════════════
```

If you still see `http://http/` or any other malformed URL, the `.env` file is still incorrect.

## Common Mistakes

### Mistake 1: Double protocol
```env
# ❌ WRONG
EXPO_PUBLIC_BACKEND_URL=http://http://medlink.alverstones.com
```

### Mistake 2: Missing domain after protocol
```env
# ❌ WRONG
EXPO_PUBLIC_BACKEND_URL=http://http/medlink.alverstones.com
```

### Mistake 3: Quotes around value
```env
# ❌ WRONG
EXPO_PUBLIC_BACKEND_URL="http://medlink.alverstones.com"
```

### Mistake 4: Spaces around =
```env
# ❌ WRONG
EXPO_PUBLIC_BACKEND_URL = http://medlink.alverstones.com
```

## Quick Verification

After fixing, the API request should go to:
```
✅ POST http://medlink.alverstones.com/api/doctor/login
```

NOT:
```
❌ POST http://http/medlink.alverstones.com/api/doctor/login
❌ POST http://http://medlink.alverstones.com/api/doctor/login
❌ POST http://localhost:8081/medlink.alverstones.com/api/doctor/login
```

## Still Having Issues?

1. **Completely stop Expo** (Ctrl+C in the terminal)
2. **Delete the `.env` file** and recreate it with the exact format above
3. **Clear Metro bundler cache:**
   ```bash
   npx expo start --clear
   ```
4. **Check for other `.env` files** that might be interfering:
   ```bash
   # In frontend directory
   ls -la | grep env
   ```

The code has been updated to automatically clean malformed URLs, but it's best to fix the `.env` file directly.




