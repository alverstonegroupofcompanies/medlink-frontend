import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { getUserFriendlyError } from '../utils/errorMessages';

// Disable console errors in production
if (!__DEV__) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    // Only log critical errors silently in production
    // Don't show to users
  };
  
  console.warn = (...args) => {
    // Suppress warnings in production
  };
}

// Create Axios instance with configurable base URL
const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout for mobile connections
});

// Log the API base URL on initialization (for debugging)
if (__DEV__) {
  console.log('═══════════════════════════════════════');
  console.log('🚀 API Instance Created (api.js)');
  console.log('═══════════════════════════════════════');
  console.log('📍 Base URL:', API_BASE_URL);
  console.log('🔗 Full API URL example:', `${API_BASE_URL}/doctor/login`);
  console.log('📦 Imported from: config/api.ts');
  console.log('═══════════════════════════════════════');
}

// Request interceptor - automatically attach token
API.interceptors.request.use(
  async (config) => {
    // Get token directly to avoid circular dependency
    // Use hospital token for hospital routes, doctor token for doctor routes
    try {
      let token = null;
      const url = config.url || '';
      
      // List of public routes that don't require authentication
      const publicRoutes = [
        '/doctor/login',
        '/doctor/register',
        '/hospital/login',
        '/hospital/register',
        '/send-otp',
        '/verify-otp',
        '/test',
        '/storage-test',
      ];
      
      // Check if this is a public route
      const isPublicRoute = publicRoutes.some(route => url.includes(route));
      
      // Check if this is a hospital route
      if (url.includes('/hospital/')) {
        // Hospital route - use hospital token
        token = await AsyncStorage.getItem('hospitalToken');
        if (__DEV__ && token) {
          console.log('🏥 Using hospital token for:', url);
        }
      } else {
        // Doctor route or other - use doctor token
        token = await AsyncStorage.getItem('doctorToken');
        if (__DEV__ && token) {
          console.log('👨‍⚕️ Using doctor token for:', url);
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (__DEV__ && !isPublicRoute) {
        // Only warn if it's not a public route (login/register don't need tokens)
        console.warn('⚠️ No token found for route:', url);
      }
    } catch (error) {
      // Silently handle token errors - don't log in production
      if (__DEV__) {
        console.error('Error getting token:', error);
      }
    }
    
    // Don't override Content-Type if it's multipart/form-data (for file uploads)
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    
    // Log request in development
    if (__DEV__) {
      // Use the actual baseURL from config (which comes from env)
      const actualBaseURL = config.baseURL || API_BASE_URL;
      const fullUrl = `${actualBaseURL}${config.url?.startsWith('/') ? '' : '/'}${config.url}`;
      console.log(`📤 ${config.method?.toUpperCase()} ${fullUrl}`);
      console.log('   Base URL:', actualBaseURL);
      console.log('   Headers:', config.headers);
      
      // Warn if using local IP (for development)
      if (actualBaseURL.includes('192.168.') || actualBaseURL.includes('localhost')) {
        console.warn('⚠️ Using local IP address for development');
        console.warn('   Update .env file to change: EXPO_PUBLIC_BACKEND_URL');
        console.warn('   Then restart Expo: npx expo start --clear');
      }
    }
    
    return config;
  },
  (error) => {
    // Only log in development
    if (__DEV__) {
      console.error('❌ Request error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and network issues
API.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (__DEV__) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - Success`);
    }
    return response;
  },
  async (error) => {
    // Convert technical errors to user-friendly messages
    const friendlyMessage = getUserFriendlyError(error);
    
    // Only log technical details in development
    if (__DEV__) {
      if (!error.response) {
        // Network error - backend not reachable
        if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('Network request failed') || error.message?.includes('Failed to connect')) {
          const relativePath = error.config?.url || 'Unknown';
          const fullUrl = error.config?.baseURL 
            ? `${error.config.baseURL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
            : `${API_BASE_URL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
          
          console.warn('═══════════════════════════════════════');
          console.warn('❌ NETWORK ERROR: Cannot connect to backend');
          console.warn('═══════════════════════════════════════');
          console.warn('📍 Relative Path:', relativePath);
          console.warn('🔗 Base URL:', error.config?.baseURL || API_BASE_URL);
          console.warn('🌐 Full URL Attempted:', fullUrl);
          console.warn('═══════════════════════════════════════');
          
          // Log network errors
          try {
            const { logConsoleError } = require('@/utils/error-logger');
            logConsoleError(
              `Network Error: Cannot connect to ${fullUrl}`,
              'network',
              {
                endpoint: relativePath,
                method: error.config?.method?.toUpperCase(),
              }
            );
          } catch (logError) {
            // Silently fail
          }
        } else {
          console.warn('❌ Request Error:', error.message);
          
          // Log other request errors
          try {
            const { logConsoleError } = require('@/utils/error-logger');
            logConsoleError(
              error.message || 'Request Error',
              'api',
              {
                endpoint: error.config?.url,
                method: error.config?.method?.toUpperCase(),
              }
            );
          } catch (logError) {
            // Silently fail
          }
        }
      } else if (error.response) {
        // Server responded with error status
        console.error(`❌ API Error ${error.response.status}:`, error.response.data);
        
        // Log API errors to backend
        try {
          const { logConsoleError } = require('@/utils/error-logger');
          logConsoleError(
            error.response.data?.message || error.message || 'API Error',
            'api',
            {
              endpoint: error.config?.url,
              method: error.config?.method?.toUpperCase(),
              trace: JSON.stringify(error.response.data),
            }
          );
        } catch (logError) {
          // Silently fail
        }
        
        // Handle 401 Unauthorized - token expired or invalid
        if (error.response.status === 401) {
          console.warn('⚠️ Unauthorized - clearing auth data');
          try {
            const url = error.config?.url || '';
            if (url.includes('/hospital/')) {
              await AsyncStorage.multiRemove(['hospitalToken', 'hospitalInfo']);
              console.warn('🏥 Cleared hospital auth data');
            } else {
              await AsyncStorage.multiRemove(['doctorToken', 'doctorInfo']);
              console.warn('👨‍⚕️ Cleared doctor auth data');
            }
          } catch (clearError) {
            console.error('Error clearing auth data:', clearError);
          }
        }
      }
    } else {
      // Production: Only handle auth silently, no logging
      if (error.response?.status === 401) {
        try {
          const url = error.config?.url || '';
          if (url.includes('/hospital/')) {
            await AsyncStorage.multiRemove(['hospitalToken', 'hospitalInfo']);
          } else {
            await AsyncStorage.multiRemove(['doctorToken', 'doctorInfo']);
          }
        } catch (clearError) {
          // Silently handle - no logging in production
        }
      }
    }
    
    // Replace error message with user-friendly version
    error.userFriendlyMessage = friendlyMessage;
    error.message = friendlyMessage;
    
    return Promise.reject(error);
  }
);

export default API;
