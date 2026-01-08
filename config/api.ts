import Constants from 'expo-constants';

// Try to get BACKEND_URL from multiple sources:
// 1. process.env (for development and EAS builds)
// 2. Constants.expoConfig.extra (for production builds via app.config.js)
const BACKEND_URL = 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  // In production, provide a more graceful error message
  if (__DEV__) {
    throw new Error(`
    ❌ Missing EXPO_PUBLIC_BACKEND_URL in .env file!

    Add this to .env:

    EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8000

    Then restart Expo: npx expo start --clear
  `);
  } else {
    // Production: Log error but don't crash - use a default or show user-friendly message
    console.error('❌ EXPO_PUBLIC_BACKEND_URL is not configured. Please set it in eas.json or as an EAS secret.');
    // You may want to throw here or handle it differently based on your needs
    throw new Error('Server configuration error. Please contact support.');
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

// Debug log (visible only in development mode)
if (__DEV__) {
  console.log("==========================================");
  console.log("🔧 API CONFIG LOADED");
  console.log("Backend URL:", BACKEND_URL);
  console.log("API Base URL:", API_BASE_URL);
  console.log("==========================================");
} else {
  // Production: Log API base URL for debugging (without exposing full URL in user errors)
  // This helps diagnose connection issues without cluttering production logs
  // Only log if there's an issue connecting
  if (typeof console !== 'undefined' && console.log) {
    // Store for potential debugging - can be accessed via error handlers
    (global as any).__API_BASE_URL__ = API_BASE_URL;
  }
}
