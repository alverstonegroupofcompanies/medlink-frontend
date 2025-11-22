const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error(`
    ❌ Missing EXPO_PUBLIC_BACKEND_URL in .env file!

    Add this to .env:

    EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8000

    Then restart Expo: npx expo start --clear
  `);
}

// Export backend URL for use in image URLs (without /api)
export const BASE_BACKEND_URL = BACKEND_URL.endsWith('/')
  ? BACKEND_URL.slice(0, -1) // Remove trailing slash
  : BACKEND_URL;

// Ensure /api is appended
export const API_BASE_URL = BACKEND_URL.endsWith('/api')
  ? BACKEND_URL
  : `${BACKEND_URL}/api`;

// Debug log (visible only in development mode)
if (__DEV__) {
  console.log("==========================================");
  console.log("🔧 API CONFIG LOADED");
  console.log("Backend URL:", BACKEND_URL);
  console.log("API Base URL:", API_BASE_URL);
  console.log("==========================================");
}
