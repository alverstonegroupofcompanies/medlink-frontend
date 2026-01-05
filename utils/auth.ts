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
  HOSPITAL_TOKEN: 'hospitalToken',
  HOSPITAL_INFO: 'hospitalInfo',
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
 * Save hospital authentication data
 */
export const saveHospitalAuth = async (token: string, hospitalInfo: any) => {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.HOSPITAL_TOKEN, token],
      [STORAGE_KEYS.HOSPITAL_INFO, JSON.stringify(hospitalInfo)],
    ]);
    console.log('✅ Hospital auth data saved');
  } catch (error) {
    console.error('❌ Error saving hospital auth:', error);
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
 * Get hospital token from storage
 */
export const getHospitalToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.HOSPITAL_TOKEN);
  } catch (error) {
    console.error('❌ Error getting hospital token:', error);
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
 * Get hospital info from storage
 */
export const getHospitalInfo = async (): Promise<any | null> => {
  try {
    const info = await AsyncStorage.getItem(STORAGE_KEYS.HOSPITAL_INFO);
    return info ? JSON.parse(info) : null;
  } catch (error) {
    console.error('❌ Error getting hospital info:', error);
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
 * Check if hospital is logged in
 */
export const isHospitalLoggedIn = async (): Promise<boolean> => {
  try {
    const token = await getHospitalToken();
    const info = await getHospitalInfo();
    return !!(token && info);
  } catch (error) {
    console.error('❌ Error checking hospital login status:', error);
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
    const navigateToLogin = () => {
      try {
        console.log('🔄 Attempting navigation to /login');
        router.dismissAll();
        router.replace('/login');
        console.log('✅ Navigation to login executed');
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        try {
          console.log('🔄 Trying router.push to /login...');
          router.dismissAll();
          router.push('/login');
        } catch (altError) {
          console.error('❌ Push navigation also failed:', altError);
        }
      }
    };

    navigateToLogin();
    setTimeout(() => {
      console.log('🔄 Retry navigation to login after delay...');
      navigateToLogin();
    }, 500);
  } catch (error) {
    console.error('❌ Error during logout:', error);
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.DOCTOR_TOKEN,
        STORAGE_KEYS.DOCTOR_INFO,
        'doctorToken',
        'doctorInfo',
      ]);
      router.dismissAll();
      router.replace('/login');
    } catch (clearError) {
      console.error('❌ Error clearing auth:', clearError);
      router.dismissAll();
      router.replace('/login');
    }
  }
};

/**
 * Logout hospital
 */
export const logoutHospital = async (): Promise<void> => {
  try {
    console.log('🚪 Starting hospital logout...');

    // Attempt backend logout (optional)
    try {
      const token = await getHospitalToken();
      if (token) {
        await API.post('/hospital/logout');
      }
    } catch (e) { console.warn('Backend logout failed', e); }

    await AsyncStorage.multiRemove([
      STORAGE_KEYS.HOSPITAL_TOKEN,
      STORAGE_KEYS.HOSPITAL_INFO,
    ]);
    console.log('✅ Hospital auth cleared');
    router.dismissAll();
    router.replace('/login');
  } catch (error) {
    console.error('❌ Error logging out hospital:', error);
    // Force nav
    router.replace('/login');
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
// Import helper at top of file needed? No, imports are usually top.
// Wait, I need to add import first or replace entire function block.
// Let's verify imports first. I'll add the import in a separate block or check if I can do it in one go.
// auth.ts doesn't import url-helper yet.

/**
 * Get profile photo URL for doctor
 * Returns profile_photo if available, otherwise returns a placeholder avatar
 */
export const getProfilePhotoUrl = (doctor: any): string => {
  // Use the robust helper we already have
  const { getFullImageUrl } = require('./url-helper');

  if (!doctor) {
    return 'https://i.pravatar.cc/150?img=1';
  }

  // Get raw path
  const profilePhoto = doctor.profile_photo;

  // If no photo path, return default
  if (!profilePhoto || !profilePhoto.trim()) {
    return 'https://i.pravatar.cc/150?img=1';
  }

  // Use helper to process it (handles localhost fixes, storage prefixes, etc.)
  return getFullImageUrl(profilePhoto);
};
