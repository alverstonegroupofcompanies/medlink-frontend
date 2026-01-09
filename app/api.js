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
  timeout: 120000, // 120 second timeout for file uploads (2 minutes)
  maxContentLength: Infinity, // No limit on response size
  maxBodyLength: Infinity, // No limit on request body size (for file uploads)
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
        '/blogs',
        '/blogs/',
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
        // Validate token format (should not be empty or just whitespace)
        const trimmedToken = token.trim();
        if (trimmedToken && trimmedToken.length > 0) {
          config.headers.Authorization = `Bearer ${trimmedToken}`;
        } else {
          // Invalid token format
          if (__DEV__ && !isPublicRoute) {
            console.warn('⚠️ Invalid token format (empty/whitespace) for route:', url);
          }
        }
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
    
    // For FormData, let axios set Content-Type automatically with boundary
    // Don't manually set it, as axios needs to add the boundary parameter
    // This is critical - manually setting Content-Type breaks FormData uploads
    if (config.data instanceof FormData) {
      // Remove Content-Type header to let axios set it with proper boundary
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
      
      // Also remove from any nested headers object
      if (config.headers && typeof config.headers === 'object') {
        Object.keys(config.headers).forEach(key => {
          if (key.toLowerCase() === 'content-type') {
            delete config.headers[key];
          }
        });
      }
      
      if (__DEV__) {
        console.log('📦 FormData detected - Content-Type will be set automatically by axios');
      }
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
    
    // Enhanced error logging for network errors
    if (!error.response) {
      // Network error - backend not reachable
      const isNetworkError = 
        error.code === 'ECONNREFUSED' || 
        error.code === 'ERR_NETWORK' ||
        error.message?.includes('Network Error') || 
        error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to connect') ||
        error.message?.includes('Unable to connect');
      
      if (isNetworkError) {
        const relativePath = error.config?.url || 'Unknown';
        const fullUrl = error.config?.baseURL 
          ? `${error.config.baseURL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
          : `${API_BASE_URL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
        
        // Log detailed error information
        console.error('═══════════════════════════════════════');
        console.error('❌ NETWORK ERROR: Cannot connect to backend');
        console.error('═══════════════════════════════════════');
        console.error('📍 Error Code:', error.code);
        console.error('📍 Error Message:', error.message);
        console.error('📍 Relative Path:', relativePath);
        console.error('🔗 Base URL:', error.config?.baseURL || API_BASE_URL);
        console.error('🌐 Full URL Attempted:', fullUrl);
        console.error('📦 Request Method:', error.config?.method?.toUpperCase());
        console.error('📦 Request Data Type:', error.config?.data instanceof FormData ? 'FormData (file upload)' : 'JSON');
        if (error.config?.data instanceof FormData) {
          console.error('📦 FormData size: Large (file upload)');
        }
        
        // Additional diagnostics
        if (error.code === 'ERR_NETWORK') {
          console.error('🔍 Possible Causes:');
          console.error('   1. Server is down or unreachable');
          console.error('   2. SSL certificate validation failed');
          console.error('   3. DNS resolution failed');
          console.error('   4. Network/firewall blocking connection');
          console.error('   5. EAS secret not loaded (app needs rebuild)');
          if (fullUrl.includes('https://')) {
            console.error('   6. SSL/TLS handshake failed - check server certificate');
          }
        }
        console.error('═══════════════════════════════════════');
        
        // Only log in development
        if (__DEV__) {
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
          
          // Log network errors (but skip if it's the error-logs endpoint to prevent loops)
          if (relativePath && !relativePath.includes('/error-logs')) {
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
          }
        } else {
          console.warn('❌ Request Error:', error.message);
          
          // Log other request errors (but skip if it's the error-logs endpoint to prevent loops)
          if (error.config?.url && !error.config.url.includes('/error-logs')) {
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
        }
      } else if (error.response) {
        // Server responded with error status
        console.error(`❌ API Error ${error.response.status}:`, error.response.data);
        
        // Log API errors to backend (but skip if it's the error-logs endpoint to prevent loops)
        if (error.config?.url && !error.config.url.includes('/error-logs')) {
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
        }
        
        // Handle 401 Unauthorized - token expired or invalid
        if (error.response.status === 401) {
          console.warn('⚠️ Unauthorized - clearing auth data');
          try {
            const url = error.config?.url || '';
            const { router } = require('expo-router');
            
            if (url.includes('/hospital/')) {
              await AsyncStorage.multiRemove(['hospitalToken', 'hospitalInfo']);
              console.warn('🏥 Cleared hospital auth data');
              // Redirect to hospital login
              setTimeout(() => {
                try {
                  router.replace('/hospital/login');
                } catch (navError) {
                  console.error('Navigation error:', navError);
                }
              }, 100);
            } else if (url.includes('/admin/')) {
              // Admin routes - don't clear here, let admin handle it
              console.warn('🔐 Admin route 401 - admin should handle logout');
            } else {
              await AsyncStorage.multiRemove(['doctorToken', 'doctorInfo']);
              console.warn('👨‍⚕️ Cleared doctor auth data');
              // Redirect to doctor login
              setTimeout(() => {
                try {
                  router.replace('/login');
                } catch (navError) {
                  console.error('Navigation error:', navError);
                }
              }, 100);
            }
          } catch (clearError) {
            console.error('Error clearing auth data:', clearError);
          }
        }
      }
    } else {
      // Production: Handle auth errors and redirect
      if (error.response?.status === 401) {
        try {
          const url = error.config?.url || '';
          const { router } = require('expo-router');
          
          if (url.includes('/hospital/')) {
            await AsyncStorage.multiRemove(['hospitalToken', 'hospitalInfo']);
            // Redirect to hospital login
            setTimeout(() => {
              try {
                router.replace('/hospital/login');
              } catch (navError) {
                // Silently handle navigation errors
              }
            }, 100);
          } else if (!url.includes('/admin/')) {
            // Only redirect doctor routes, not admin
            await AsyncStorage.multiRemove(['doctorToken', 'doctorInfo']);
            // Redirect to doctor login
            setTimeout(() => {
              try {
                router.replace('/login');
              } catch (navError) {
                // Silently handle navigation errors
              }
            }, 100);
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
