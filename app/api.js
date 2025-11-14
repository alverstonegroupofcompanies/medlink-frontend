import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

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
      } else if (__DEV__) {
        console.warn('⚠️ No token found for route:', url);
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    
    // Don't override Content-Type if it's multipart/form-data (for file uploads)
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }
    
    // Log request in development
    if (__DEV__) {
      const fullUrl = `${config.baseURL || API_BASE_URL}${config.url}`;
      console.log(`📤 ${config.method?.toUpperCase()} ${fullUrl}`);
      console.log('   Headers:', config.headers);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
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
    // Handle network errors (common on mobile)
    if (!error.response) {
      // Network error - backend not reachable
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('Network request failed') || error.message?.includes('Failed to connect')) {
        // Construct full URL for better debugging
        const relativePath = error.config?.url || 'Unknown';
        const fullUrl = error.config?.baseURL 
          ? `${error.config.baseURL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`
          : `${API_BASE_URL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
        
        // Use console.warn instead of console.error to avoid LogBox error display
        console.warn('═══════════════════════════════════════');
        console.warn('❌ NETWORK ERROR: Cannot connect to backend');
        console.warn('═══════════════════════════════════════');
        console.warn('📍 Relative Path:', relativePath);
        console.warn('🔗 Base URL:', error.config?.baseURL || API_BASE_URL);
        console.warn('🌐 Full URL Attempted:', fullUrl);
        console.warn('💡 Fix: Allow port 8000 in Windows Firewall');
        console.warn('   Run: New-NetFirewallRule -DisplayName "Laravel Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow');
        console.warn('═══════════════════════════════════════');
        error.message = `Cannot connect to server at ${fullUrl}. Fix: Allow port 8000 in Windows Firewall (Run as Administrator)`;
      } else {
        console.warn('❌ Request Error:', error.message);
      }
    } else if (error.response) {
      // Server responded with error status
      console.error(`❌ API Error ${error.response.status}:`, error.response.data);
      
      // Handle 401 Unauthorized - token expired or invalid
      if (error.response.status === 401) {
        console.warn('⚠️ Unauthorized - clearing auth data');
        try {
          // Clear auth data directly to avoid circular dependency
          await AsyncStorage.multiRemove(['doctorToken', 'doctorInfo']);
        } catch (clearError) {
          console.error('Error clearing auth data:', clearError);
        }
        // Don't redirect here, let the component handle it
      }
    }
    return Promise.reject(error);
  }
);

export default API;
