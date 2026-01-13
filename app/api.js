import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { getUserFriendlyError } from '../utils/errorMessages';

/**
 * Detect the specific type of network error
 * @param {Error} error - The axios error object
 * @returns {Object} Error type information
 */
function detectErrorType(error) {
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  const fullMessage = JSON.stringify(error).toLowerCase();
  
  // SSL/Certificate errors
  if (
    code === 'ERR_CERT' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    message.includes('certificate') ||
    message.includes('ssl') ||
    message.includes('tls') ||
    message.includes('handshake') ||
    fullMessage.includes('certificate') ||
    fullMessage.includes('ssl') ||
    fullMessage.includes('tls')
  ) {
    return {
      type: 'SSL_ERROR',
      likelyCause: 'SSL certificate validation failed. Server certificate may be invalid, expired, or have an incomplete chain.',
      severity: 'high',
      canRetry: false,
      requiresServerFix: true,
    };
  }
  
  // Timeout errors
  if (
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return {
      type: 'TIMEOUT',
      likelyCause: 'Request timed out. File may be too large or connection too slow.',
      severity: 'medium',
      canRetry: true,
      requiresServerFix: false,
    };
  }
  
  // Connection refused
  if (
    code === 'ECONNREFUSED' ||
    message.includes('connection refused') ||
    message.includes('refused')
  ) {
    return {
      type: 'CONNECTION_REFUSED',
      likelyCause: 'Server is not accepting connections. Server may be down or not running.',
      severity: 'high',
      canRetry: true,
      requiresServerFix: true,
    };
  }
  
  // DNS errors
  if (
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    message.includes('dns') ||
    message.includes('getaddrinfo') ||
    message.includes('hostname')
  ) {
    return {
      type: 'DNS_ERROR',
      likelyCause: 'DNS resolution failed. Cannot resolve server hostname.',
      severity: 'high',
      canRetry: true,
      requiresServerFix: false,
    };
  }
  
  // Network unavailable
  if (
    code === 'ERR_NETWORK' ||
    message.includes('network') ||
    message.includes('unable to connect') ||
    message.includes('network request failed')
  ) {
    // Check if it's specifically a POST with FormData over HTTPS
    const isPostFormData = error.config?.method?.toUpperCase() === 'POST' && 
                          error.config?.data instanceof FormData;
    const isHttps = (error.config?.baseURL || API_BASE_URL).startsWith('https://');
    
    if (isPostFormData && isHttps) {
      return {
        type: 'NETWORK_ERROR_SSL_LIKELY',
        likelyCause: 'Network error on POST with FormData over HTTPS. Likely SSL certificate issue or server configuration problem.',
        severity: 'high',
        canRetry: true,
        requiresServerFix: true,
      };
    }
    
    return {
      type: 'NETWORK_ERROR',
      likelyCause: 'General network error. Check internet connection and server availability.',
      severity: 'medium',
      canRetry: true,
      requiresServerFix: false,
    };
  }
  
  // Unknown error
  return {
    type: 'UNKNOWN_ERROR',
    likelyCause: 'Unknown network error. Check error message for details.',
    severity: 'medium',
    canRetry: true,
    requiresServerFix: false,
  };
}

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
        '/doctor/registration/send-otp',
        '/doctor/registration/verify-otp',
        '/doctor/registration/register',
        '/hospital/login',
        '/hospital/register',
        '/hospital/registration/send-otp',
        '/hospital/registration/verify-otp',
        '/hospital/registration/register',
        '/departments',
        '/send-otp',
        '/verify-otp',
        '/test',
        '/storage-test',
        '/blogs',
        '/blogs/',
      ];
      
      // Normalize URL for comparison (remove leading/trailing slashes)
      const normalizedUrl = url.startsWith('/') ? url : '/' + url;
      
      // Check if this is a public route (exact match or starts with)
      const isPublicRoute = publicRoutes.some(route => {
        const normalizedRoute = route.startsWith('/') ? route : '/' + route;
        // Check exact match, starts with, or contains
        return normalizedUrl === normalizedRoute || 
               normalizedUrl.startsWith(normalizedRoute + '/') || 
               normalizedUrl.includes(normalizedRoute);
      });
      
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
        // Only warn if it's not a public route (login/register/departments don't need tokens)
        console.warn('⚠️ No token found for route:', url, '(This route may require authentication)');
      } else if (__DEV__ && isPublicRoute) {
        // Public route - no token needed, suppress warning
        // Don't log every time to avoid console spam
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
        // Remove Content-Type header for FormData - axios will set it with boundary
        delete config.headers['Content-Type'];
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
        
        // Enhanced error type detection
        const errorType = detectErrorType(error);
        const isFormData = error.config?.data instanceof FormData;
        const isPostRequest = error.config?.method?.toUpperCase() === 'POST';
        const isHttps = fullUrl.startsWith('https://');
        
        // Store error type for use in error handling
        error.errorType = errorType;
        
        // Consolidated error logging - only in development
        if (__DEV__) {
          const errorDetails = [
            `❌ NETWORK ERROR: ${errorType.type}`,
            `📍 Path: ${relativePath}`,
            `🔗 URL: ${fullUrl}`,
            `📦 Method: ${error.config?.method?.toUpperCase() || 'UNKNOWN'}`,
            `📦 Type: ${isFormData ? 'FormData (file upload)' : 'JSON'}`,
            `⚠️ Cause: ${errorType.likelyCause}`,
          ];
          
          if (isPostRequest && isFormData && isHttps) {
            errorDetails.push('');
            errorDetails.push('🔒 SSL CERTIFICATE ISSUE DETECTED');
            errorDetails.push('This is a SERVER-SIDE problem that must be fixed by your server administrator.');
            errorDetails.push('');
            errorDetails.push('Common causes:');
            errorDetails.push('1. SSL certificate is expired or invalid');
            errorDetails.push('2. Incomplete certificate chain (missing intermediate certificates)');
            errorDetails.push('3. Certificate doesn\'t match domain name');
            errorDetails.push('4. Server not configured for large POST requests');
            errorDetails.push('');
            errorDetails.push('Solution: Contact server admin to fix SSL certificate on:');
            errorDetails.push(`   ${fullUrl.split('/api')[0]}`);
          }
          
          console.error(errorDetails.join('\n'));
        }
        
        // Log to backend error logger (skip error-logs endpoint to prevent loops)
        // Only log in development to avoid spamming when network is down
        if (__DEV__ && relativePath && !relativePath.includes('/error-logs')) {
          try {
            const { logConsoleError } = require('@/utils/error-logger');
            // Function handles errors internally and has rate limiting
            logConsoleError(
              `Network Error: ${errorType.type} - ${error.message}`,
              'network',
              {
                endpoint: relativePath,
                method: error.config?.method?.toUpperCase(),
                errorType: errorType.type,
              }
            );
          } catch (logError) {
            // Silently fail - network might be down
          }
        }
      } else if (error.response) {
        // Server responded with error status
        console.error(`❌ API Error ${error.response.status}:`, error.response.data);
        
        // Log API errors to backend (but skip if it's the error-logs endpoint to prevent loops)
        // Only log in development to avoid spamming
        if (__DEV__ && error.config?.url && !error.config.url.includes('/error-logs')) {
          try {
            const { logConsoleError } = require('@/utils/error-logger');
            // Function handles errors internally and has rate limiting
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
