# Setting Up EAS Environment Variables

## Why EAS Env Instead of Secrets?

EAS environment variables work in both:
- ✅ **EAS Builds** (production, preview, development builds)
- ✅ **Expo Go** (development - if configured properly)

EAS secrets only work in builds, not Expo Go.

## Setup Instructions

### 1. Remove Old Secret (if exists)

The old secret command is deprecated. EAS env variables replace secrets.

### 2. Create EAS Environment Variables

Run these commands **interactively** (they will prompt you):

```bash
# For Production builds
eas env:create --name EXPO_PUBLIC_BACKEND_URL --value https://medlink.alverstones.com --scope project --environment production

# For Preview builds  
eas env:create --name EXPO_PUBLIC_BACKEND_URL --value https://medlink.alverstones.com --scope project --environment preview

# For Development builds
eas env:create --name EXPO_PUBLIC_BACKEND_URL --value https://medlink.alverstones.com --scope project --environment development
```

**When prompted:**
- **Visibility**: Choose `plaintext` (since this is a public URL, not sensitive)
- **Type**: Choose `string`

### 3. For Expo Go (Development)

EAS env variables **don't work in Expo Go**. You need a `.env` file:

Create `frontend/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=https://medlink.alverstones.com
```

Then restart Expo:
```bash
npx expo start --clear
```

### 4. Verify Setup

Check your env variables:
```bash
eas env:list
```

### 5. Rebuild App

After setting up EAS env variables, rebuild your app:
```bash
# For production
eas build --platform android --profile production

# For preview
eas build --platform android --profile preview

# For development build
eas build --platform android --profile development
```

## How It Works

1. **EAS Builds**: EAS env variables are automatically injected into `Constants.expoConfig?.extra` during build
2. **Expo Go**: Uses `.env` file via `process.env.EXPO_PUBLIC_BACKEND_URL`
3. **Code**: The `config/api.ts` file checks both sources automatically

## Troubleshooting

### Still Getting Connection Errors?

1. **Check if env variable is loaded**:
   - Look for log: `🔧 API CONFIG LOADED (Production)`
   - Check: `URL source: EAS Secret (Constants.expoConfig.extra)` or similar

2. **For Expo Go**: Make sure `.env` file exists and has the correct URL

3. **For Builds**: Make sure you rebuilt after creating env variables

4. **Verify server is accessible**:
   ```bash
   curl https://medlink.alverstones.com/api
   ```

## Current Configuration

The app is configured to read from:
1. `Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL` (EAS builds)
2. `Constants.manifest?.extra?.EXPO_PUBLIC_BACKEND_URL` (Expo Go)
3. `process.env.EXPO_PUBLIC_BACKEND_URL` (development/.env file)

This ensures it works in all scenarios!

