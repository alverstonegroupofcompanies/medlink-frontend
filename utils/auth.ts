/**
 * Authentication utilities
 * Centralized functions for login, logout, and token management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import API from '../app/api';

// Storage keys
export const STORAGE_KEYS = {
  DOCTOR_TOKEN: 'doctorToken',
  DOCTOR_INFO: 'doctorInfo',
  // Add any other storage keys here
} as const;

/**
 * Save doctor authentication data
 */
export const saveDoctorAuth = async (token: string, doctorInfo: any) => {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.DOCTOR_TOKEN, token],
      [STORAGE_KEYS.DOCTOR_INFO, JSON.stringify(doctorInfo)],
    ]);
    console.log('✅ Doctor auth data saved');
  } catch (error) {
    console.error('❌ Error saving doctor auth:', error);
    throw error;
  }
};

/**
 * Get doctor token from storage
 */
export const getDoctorToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_TOKEN);
  } catch (error) {
    console.error('❌ Error getting doctor token:', error);
    return null;
  }
};

/**
 * Get doctor info from storage
 */
export const getDoctorInfo = async (): Promise<any | null> => {
  try {
    const info = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_INFO);
    return info ? JSON.parse(info) : null;
  } catch (error) {
    console.error('❌ Error getting doctor info:', error);
    return null;
  }
};

/**
 * Check if doctor is logged in
 */
export const isDoctorLoggedIn = async (): Promise<boolean> => {
  try {
    const token = await getDoctorToken();
    const doctorInfo = await getDoctorInfo();
    return !!(token && doctorInfo);
  } catch (error) {
    console.error('❌ Error checking login status:', error);
    return false;
  }
};

/**
 * Clear all doctor authentication data from storage
 */
export const clearDoctorAuth = async (): Promise<void> => {
  try {
    // Remove all doctor-related storage
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DOCTOR_TOKEN,
      STORAGE_KEYS.DOCTOR_INFO,
    ]);
    console.log('✅ Doctor auth data cleared from storage');
    
    // Verify it's cleared
    const token = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_TOKEN);
    const info = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_INFO);
    if (token || info) {
      console.warn('⚠️ Warning: Some data still exists, clearing again...');
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_INFO);
    }
  } catch (error) {
    console.error('❌ Error clearing doctor auth:', error);
    // Try individual removal as fallback
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_INFO);
    } catch (fallbackError) {
      console.error('❌ Fallback clear also failed:', fallbackError);
    }
  }
};

/**
 * Logout doctor - clears local storage and calls backend API
 */
export const logoutDoctor = async (showAlert: boolean = true): Promise<void> => {
  try {
    console.log('🚪 Starting logout process...');
    
    // Try to call backend logout API to invalidate token
    try {
      const token = await getDoctorToken();
      if (token) {
        console.log('📞 Calling backend logout API...');
        const response = await API.post('/doctor/logout');
        console.log('✅ Backend logout successful');
        console.log('📊 Backend response:', response.data);
        if (response.data?.tokens_deleted) {
          console.log(`🗑️ Deleted ${response.data.tokens_deleted} token(s) from backend`);
        }
      } else {
        console.log('⚠️ No token found, skipping backend logout');
      }
    } catch (error: any) {
      // If backend logout fails, still clear local storage
      console.warn('⚠️ Backend logout failed (continuing with local logout)');
      console.warn('⚠️ Error details:', error?.response?.data || error?.message || error);
      // Don't throw - continue with local logout
    }

    // Clear all local storage - do this multiple times to ensure it's cleared
    await clearDoctorAuth();
    
    // Double-check and clear again
    const remainingToken = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_TOKEN);
    const remainingInfo = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_INFO);
    
    if (remainingToken || remainingInfo) {
      console.warn('⚠️ Data still exists, performing additional cleanup...');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.DOCTOR_TOKEN,
        STORAGE_KEYS.DOCTOR_INFO,
        'doctorToken', // Also try without STORAGE_KEYS prefix
        'doctorInfo',
      ]);
    }

    // Verify everything is cleared
    const finalToken = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_TOKEN);
    const finalInfo = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_INFO);
    
    if (finalToken || finalInfo) {
      console.error('❌ ERROR: Data still exists after cleanup!');
      // Last resort - try removing individually
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_INFO);
      await AsyncStorage.removeItem('doctorToken');
      await AsyncStorage.removeItem('doctorInfo');
    } else {
      console.log('✅ All login data cleared successfully');
    }

    console.log('✅ Logout complete - redirecting to login screen');

    // Navigate directly to login page - use multiple attempts to ensure it works
    // When navigating from tab navigator, we need to be more aggressive
    const navigateToLogin = () => {
      try {
        console.log('🔄 Attempting navigation to /login');
        router.dismissAll();
        router.replace('/login');
        console.log('✅ Navigation to login executed');
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        // Try alternative navigation method
        try {
          console.log('🔄 Trying router.push to /login...');
          router.dismissAll();
          router.push('/login');
        } catch (altError) {
          console.error('❌ Push navigation also failed:', altError);
        }
      }
    };

    // Try navigation immediately
    navigateToLogin();
    
    // Also try after a short delay to ensure it works
    setTimeout(() => {
      console.log('🔄 Retry navigation to login after delay...');
      navigateToLogin();
    }, 500);
  } catch (error) {
    console.error('❌ Error during logout:', error);
    // Still clear storage and navigate even if there's an error
    try {
      // Aggressive cleanup on error
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.DOCTOR_TOKEN,
        STORAGE_KEYS.DOCTOR_INFO,
        'doctorToken',
        'doctorInfo',
      ]);
      // Navigate to login immediately
      try {
        console.log('🔄 Attempting navigation to /login (error fallback)');
        router.dismissAll();
        router.replace('/login');
        console.log('✅ Navigation command executed (error fallback)');
      } catch (navError) {
        console.error('❌ Navigation error in fallback:', navError);
      }
      
      // Also retry after delay
      setTimeout(() => {
        try {
          router.dismissAll();
          router.replace('/login');
        } catch (retryError) {
          console.error('❌ Retry navigation failed:', retryError);
        }
      }, 500);
    } catch (clearError) {
      console.error('❌ Error clearing auth:', clearError);
      // Force navigation even if clearing fails
      try {
        console.log('🔄 Force navigation attempt to /login...');
        router.dismissAll();
        router.replace('/login');
      } catch (forceNavError) {
        console.error('❌ Force navigation failed:', forceNavError);
      }
      
      // Retry after delay
      setTimeout(() => {
        try {
          router.dismissAll();
          router.replace('/login');
        } catch (retryError) {
          console.error('❌ Retry navigation failed:', retryError);
        }
      }, 500);
    }
  }
};

/**
 * Clear all app storage (use with caution)
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log('✅ All storage cleared');
  } catch (error) {
    console.error('❌ Error clearing all storage:', error);
  }
};

/**
 * Get profile photo URL for doctor
 * Returns profile_photo if available, otherwise returns a placeholder avatar
 */
export const getProfilePhotoUrl = (doctor: any): string => {
  if (!doctor) {
    return 'https://i.pravatar.cc/150?img=1';
  }

  // Check if doctor has a profile_photo property
  if (doctor.profile_photo && doctor.profile_photo.trim()) {
    const profilePhoto = doctor.profile_photo.trim();
    
    // If it's already a full URL (starts with http/https), return as is
    if (profilePhoto.startsWith('http://') || profilePhoto.startsWith('https://')) {
      return profilePhoto;
    }
    
    // Import BASE_BACKEND_URL from config
    const { BASE_BACKEND_URL } = require('@/config/api');
    
    // Backend uses Storage::url() which returns paths like: /storage/uploads/doctors/11/profile/...
    // If it starts with /storage, prepend backend URL
    if (profilePhoto.startsWith('/storage/')) {
      return `${BASE_BACKEND_URL}${profilePhoto}`;
    }
    
    // If it's a relative path (uploads/doctors/...), add /storage/ prefix
    if (profilePhoto.startsWith('uploads/')) {
      return `${BASE_BACKEND_URL}/storage/${profilePhoto}`;
    }
    
    // If it starts with storage/ (without leading slash), add leading slash
    if (profilePhoto.startsWith('storage/')) {
      return `${BASE_BACKEND_URL}/${profilePhoto}`;
    }
    
    // Otherwise, assume it's a relative path and prepend /storage/
    return `${BASE_BACKEND_URL}/storage/${profilePhoto}`;
  }

  // Return default avatar if no profile photo
  return 'https://i.pravatar.cc/150?img=1';
};

