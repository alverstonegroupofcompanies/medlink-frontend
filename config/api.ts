/**
 * API Configuration
 * 
 * ⚠️ IMPORTANT FOR MOBILE TESTING:
 * 
 * On mobile devices, 'localhost' refers to the device itself, not your computer.
 * You MUST replace 'YOUR_IP_HERE' below with your computer's local IP address.
 * 
 * To find your IP address:
 * - Windows: Open CMD → type `ipconfig` → look for "IPv4 Address" (e.g., 192.168.1.100)
 * - Mac/Linux: Open Terminal → type `ifconfig` → look for "inet" under en0/wifi (e.g., 192.168.1.100)
 * 
 * Steps:
 * 1. Find your computer's IP address (e.g., 192.168.1.100)
 * 2. Replace 'YOUR_IP_HERE' below with your actual IP
 * 3. Make sure your Laravel backend is running: php artisan serve --host=0.0.0.0 --port=8000
 * 4. Make sure your firewall allows connections on port 8000
 * 5. Restart Expo: npx expo start --clear
 * 
 * Example:
 * const API_BASE_URL = 'http://192.168.1.100:8000/api';
 */

import { Platform } from 'react-native';

// ⚠️ IP address for both web and mobile
// Use the same IP address for both platforms
const LOCAL_IP = '192.168.0.174'; // Your computer's IP address
const API_PORT = '8000';

// Determine the API base URL - same for web and mobile
const getApiBaseUrl = () => {
  // Use the same IP address for both web and mobile
  const url = `http://${LOCAL_IP}:${API_PORT}/api`;
  
  // Debug logging
  if (__DEV__) {
    console.log('🔧 Building API URL:', {
      LOCAL_IP,
      API_PORT,
      finalUrl: url,
      platform: Platform.OS,
    });
  }
  
  return url;
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (helpful for debugging)
if (__DEV__) {
  console.log('═══════════════════════════════════════');
  console.log('🔗 API Configuration');
  console.log('═══════════════════════════════════════');
  console.log('📍 Local IP:', LOCAL_IP);
  console.log('🔌 API Port:', API_PORT);
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('📱 Platform:', Platform.OS);
  console.log('═══════════════════════════════════════');
  
  console.log('✅ IP configured for both web and mobile:', LOCAL_IP);
  console.log('💡 Make sure backend is running: php artisan serve --host=0.0.0.0 --port=8000');
  console.log('💡 Test in browser: http://' + LOCAL_IP + ':' + API_PORT + '/api/test');
}

