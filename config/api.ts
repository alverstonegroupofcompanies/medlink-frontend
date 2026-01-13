import Constants from 'expo-constants';

// Try to get BACKEND_URL from multiple sources (in order of priority):
// 1. Constants.expoConfig.extra (for EAS builds with env variables - this is the primary source for production)
// 2. Constants.manifest?.extra (for Expo Go and older builds)
// 3. process.env (for development and local builds via .env file)
const BACKEND_URL = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  // In production, provide a more graceful error message
  if (__DEV__) {
    throw new Error(`
    ❌ Missing EXPO_PUBLIC_BACKEND_URL!

    For development:
    Add this to .env file:
    EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8000

    Then restart Expo: npx expo start --clear

    For production builds:
    Set it as an EAS secret:
    eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value https://your-api-url.com

    Or add it to app.config.js extra section.
  `);
  } else {
    // Production: Log detailed error for debugging
    console.error('❌ EXPO_PUBLIC_BACKEND_URL is not configured.');
    console.error('Available Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
    console.error('Available Constants.manifest?.extra:', (Constants as any)?.manifest?.extra);
    console.error('Available process.env.EXPO_PUBLIC_BACKEND_URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
    console.error('To fix: Set EXPO_PUBLIC_BACKEND_URL as an EAS secret or in app.config.js extra section');
    // Throw error to prevent app from running with invalid configuration
    throw new Error('Server configuration error. EXPO_PUBLIC_BACKEND_URL not found. Please contact support.');
  }
}

// Ensure URL has protocol
let processedUrl = BACKEND_URL.trim();
if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
  // Default to https for production-like domains, http for localhost if user forgot
  if (processedUrl.includes('localhost') || processedUrl.includes('127.0.0.1')) {
    processedUrl = `http://${processedUrl}`;
  } else {
    processedUrl = `https://${processedUrl}`;
  }
}

// Remove trailing slash to avoid double slashes
processedUrl = processedUrl.replace(/\/+$/, '');

const FINAL_BACKEND_URL = processedUrl;

// Export backend URL for use in image URLs (without /api)
export const BASE_BACKEND_URL = FINAL_BACKEND_URL;

// Ensure /api is appended (without double slashes)
const apiPath = FINAL_BACKEND_URL.endsWith('/api') 
  ? '' 
  : '/api';
export const API_BASE_URL = `${FINAL_BACKEND_URL}${apiPath}`;

// Debug log (always log in production for troubleshooting, but with limited info)
if (__DEV__) {
  console.log("==========================================");
  console.log("🔧 API CONFIG LOADED (Development)");
  console.log("Backend URL:", BACKEND_URL);
  console.log("API Base URL:", API_BASE_URL);
  console.log("Source:", 
    Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ? 'Constants.expoConfig.extra' :
    (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_BACKEND_URL ? 'Constants.manifest.extra' :
    'process.env'
  );
  console.log("==========================================");
} else {
  // Production: Log limited info for debugging network issues
  console.log("🔧 API CONFIG LOADED (Production)");
  console.log("API Base URL configured:", API_BASE_URL ? 'Yes' : 'No');
  console.log("URL source:", 
    Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ? 'EAS Env (Constants.expoConfig.extra)' :
    (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_BACKEND_URL ? 'Expo Manifest' :
    process.env.EXPO_PUBLIC_BACKEND_URL ? 'process.env (.env file)' : 'Not Found'
  );
  // Store for potential debugging - can be accessed via error handlers if needed
  if (typeof global !== 'undefined') {
    (global as any).__API_BASE_URL__ = API_BASE_URL;
  }
}
