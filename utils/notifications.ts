/**
 * Push Notification Service
 * Handles push notification registration and display
 */

// Conditional import for expo-notifications to prevent build errors
// Note: SDK 53+ removed Android push notifications from Expo Go
// This is expected and the app will work with in-app notifications
let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  // Suppress SDK 53+ Android push notification warnings
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('expo-notifications') && message.includes('SDK 53')) {
      // Suppress the SDK 53 Android push notification warning
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('expo-notifications') && message.includes('SDK 53')) {
      // Suppress the SDK 53 Android push notification error
      return;
    }
    originalError.apply(console, args);
  };

  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');

  // Restore original console methods
  console.warn = originalWarn;
  console.error = originalError;
} catch (error) {
  console.warn('⚠️ expo-notifications or expo-device not available:', error);
}

import { Platform } from 'react-native';
import API from '@/app/api';
import { getDoctorToken } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import router dynamically to avoid circular dependencies
let router: any = null;
try {
  router = require('expo-router').router;
} catch (e) {
  console.warn('Router not available:', e);
}

// Configure notification behavior (only if Notifications is available)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const PUSH_TOKEN_KEY = 'expoPushToken';
const LAST_SHOWN_NOTIFICATION_KEY = 'lastShownNotificationId';
const SHOWN_NOTIFICATIONS_SET_KEY = 'shownNotificationsSet';

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications || !Device) {
    console.warn('⚠️ expo-notifications not available');
    return false;
  }

  if (!Device.isDevice) {
    console.warn('⚠️ Push notifications only work on physical devices');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permissions not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Register for push notifications and get token
 */
export async function registerForPushNotifications(userType: 'doctor' | 'hospital' = 'doctor'): Promise<string | null> {
  if (!Notifications || !Device) {
    console.warn('⚠️ expo-notifications not available, skipping push notification registration');
    return null;
  }

  try {
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications only work on physical devices');
      return null;
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get push token from Expo
    let token: string | null = null;

    try {
      // Try to get project ID from multiple sources
      let projectId: string | undefined = undefined;

      // Try from environment variable
      if (process.env.EXPO_PUBLIC_EAS_PROJECT_ID) {
        projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      }
      // Try from Constants (expo-constants)
      else if (Constants && Constants.expoConfig?.extra?.eas?.projectId) {
        projectId = Constants.expoConfig.extra.eas.projectId;
      }
      // Try from Constants directly
      else if (Constants && Constants.executionEnvironment === 'standalone') {
        // For standalone builds, try to get from manifest
        projectId = Constants.manifest?.extra?.eas?.projectId;
      }

      // For Android, we can try without projectId first
      if (Platform.OS === 'android' && !projectId) {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          token = tokenData.data;
          console.log('✅ Push notification token (Android without projectId):', token);
        } catch (androidError: any) {
          console.warn('⚠️ Android push token failed without projectId, will try with projectId if available');
          // Continue to try with projectId if available
        }
      }

      // If we still don't have a token, try with projectId if available
      if (!token) {
        if (projectId) {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
          });
          token = tokenData.data;
          console.log('✅ Push notification token:', token);
        } else {
          // Last attempt: try without projectId (for development/standalone)
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            token = tokenData.data;
            console.log('✅ Push notification token (without projectId):', token);
          } catch (finalError: any) {
            console.warn('⚠️ Push token fetch failed. This is normal if EAS Project ID is not set.');
            console.warn('⚠️ To enable push notifications, create an EAS project: npx eas init');
            throw finalError; // Re-throw to be caught by outer catch
          }
        }
      }

      if (!token) {
        console.warn('⚠️ Failed to get push notification token');
        return null;
      }
    } catch (tokenError: any) {
      // Silently handle the error - push notifications are optional
      console.warn('⚠️ Push notification registration skipped:', tokenError.message || tokenError);
      console.warn('⚠️ App will continue normally. Notifications will work in-app only.');
      return null;
    }

    if (!token) {
      return null;
    }

    // Store token locally
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    } catch (storageError) {
      console.warn('⚠️ Failed to store push token locally:', storageError);
      // Continue anyway
    }

    // Send token to backend (non-blocking)
    sendTokenToBackend(token, userType).catch((error) => {
      console.warn('⚠️ Failed to send push token to backend (non-critical):', error);
    });

    return token;
  } catch (error: any) {
    console.error('❌ Error registering for push notifications:', error);

    // Don't break the app - just log the error
    if (error.message?.includes('projectId') || error.message?.includes('project')) {
      console.warn('⚠️ Push notifications require EAS Project ID setup.');
      console.warn('⚠️ To enable push notifications, set EXPO_PUBLIC_EAS_PROJECT_ID in .env file');
      console.warn('⚠️ For now, notifications will work in-app only. App continues normally.');
    } else {
      console.warn('⚠️ Push notification registration failed. App continues normally.');
      console.warn('⚠️ Notifications will still work in-app through the notification screen.');
    }

    return null;
  }
}

/**
 * Send push token to backend
 */
async function sendTokenToBackend(token: string, userType: 'doctor' | 'hospital' = 'doctor'): Promise<void> {
  try {
    let authToken: string | null = null;

    if (userType === 'doctor') {
      authToken = await getDoctorToken();
    } else {
      // For hospital, get token from AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      authToken = await AsyncStorage.getItem('hospitalToken');
    }

    if (!authToken) {
      console.warn(`⚠️ No ${userType} token found, skipping push token registration`);
      return;
    }

    const endpoint = userType === 'doctor'
      ? '/doctor/register-push-token'
      : '/hospital/register-push-token';

    try {
      await API.post(endpoint, {
        push_token: token,
        device_type: Platform.OS,
      });

      console.log(`✅ Push token registered with backend for ${userType}`);
    } catch (apiError: any) {
      // Handle 404/401 errors gracefully (backend endpoints might not exist yet)
      if (apiError.response?.status === 404 || apiError.response?.status === 401) {
        console.warn(`⚠️ Push token endpoint not available yet (${endpoint}). Backend implementation needed.`);
      } else {
        console.error(`❌ Error sending push token to backend:`, apiError.response?.data || apiError.message);
      }
      // Don't throw - allow app to continue
    }
  } catch (error: any) {
    console.error('❌ Error in sendTokenToBackend:', error);
    // Don't throw - we can retry later
  }
}

/**
 * Get stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch (error) {
    console.error('❌ Error getting stored push token:', error);
    return null;
  }
}

/**
 * Handle notification tap navigation
 */
export function handleNotificationNavigation(data: any) {
  if (!router) {
    console.warn('⚠️ Router not available for notification navigation');
    return;
  }

  try {
    const notificationType = data?.type;
    const userType = data?.user_type || 'doctor'; // Default to doctor

    console.log('🧭 Navigating from notification:', { type: notificationType, userType, data });

    // Small delay to ensure app is ready
    setTimeout(() => {
      if (userType === 'doctor') {
        // Doctor notifications
        switch (notificationType) {
          case 'job_approved':
          case 'application_approved':
            // Navigate to notifications screen or home
            router.push('/(tabs)');
            break;

          case 'application_rejected':
            // Navigate to notifications screen
            router.push('/notifications');
            break;

          case 'new_job_posting':
            // Navigate to home to see new openings
            router.push('/(tabs)');
            break;

          default:
            // Default: go to notifications screen
            router.push('/notifications');
        }
      } else if (userType === 'hospital') {
        // Hospital notifications
        switch (notificationType) {
          case 'new_application':
            // Navigate to applications for the job requirement
            if (data?.job_requirement_id) {
              router.push({
                pathname: '/hospital/applications/[requirementId]',
                params: { requirementId: data.job_requirement_id.toString() }
              });
            } else {
              // Fallback to dashboard
              router.push('/hospital/dashboard');
            }
            break;

          default:
            // Default: go to notifications screen
            router.push('/hospital/notifications');
        }
      }
    }, 500); // Small delay to ensure navigation is ready
  } catch (error) {
    console.error('❌ Error handling notification navigation:', error);
  }
}

/**
 * Initialize notification listeners
 */
export function setupNotificationListeners() {
  if (!Notifications) {
    console.warn('⚠️ expo-notifications not available, skipping listener setup');
    return;
  }

  try {
    // Handle notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('📬 Notification received (foreground):', notification);
    });

    // Handle notification taps (when user taps on notification in tray)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data;

      // Handle navigation based on notification data
      handleNotificationNavigation(data);
    });

    // Also handle initial notification if app was opened from notification
    // Note: getLastNotificationResponseAsync is not available on Android
    if (Platform.OS === 'ios') {
      Notifications.getLastNotificationResponseAsync()
        .then((response: any) => {
          if (response) {
            console.log('📱 App opened from notification:', response);
            const data = response.notification.request.content.data;
            handleNotificationNavigation(data);
          }
        })
        .catch((error: any) => {
          console.warn('⚠️ Error getting last notification:', error);
        });
    }

    // Return cleanup function
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    console.error('❌ Error setting up notification listeners:', error);
  }
}

/**
 * Check if notification with this ID has already been shown
 */
async function hasNotificationBeenShown(notificationId: number): Promise<boolean> {
  try {
    const shownSetJson = await AsyncStorage.getItem(SHOWN_NOTIFICATIONS_SET_KEY);
    if (!shownSetJson) {
      return false;
    }

    const shownSet: Set<number> = new Set(JSON.parse(shownSetJson));
    return shownSet.has(notificationId);
  } catch (error) {
    console.warn('⚠️ Error checking shown notifications:', error);
    return false;
  }
}

/**
 * Mark notification as shown
 */
async function markNotificationAsShown(notificationId: number): Promise<void> {
  try {
    const shownSetJson = await AsyncStorage.getItem(SHOWN_NOTIFICATIONS_SET_KEY);
    const shownSet: Set<number> = shownSetJson ? new Set(JSON.parse(shownSetJson)) : new Set();

    shownSet.add(notificationId);

    // Keep only last 50 notification IDs to prevent storage bloat
    if (shownSet.size > 50) {
      const idsArray = Array.from(shownSet);
      const recentIds = idsArray.slice(-50);
      shownSet.clear();
      recentIds.forEach(id => shownSet.add(id));
    }

    await AsyncStorage.setItem(SHOWN_NOTIFICATIONS_SET_KEY, JSON.stringify(Array.from(shownSet)));
    await AsyncStorage.setItem(LAST_SHOWN_NOTIFICATION_KEY, notificationId.toString());
  } catch (error) {
    console.warn('⚠️ Error marking notification as shown:', error);
  }
}

/**
 * Schedule a local notification (for testing or immediate display)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  notificationId?: number
): Promise<boolean> {
  // Skip on web - notifications not supported
  if (Platform.OS === 'web') {
    console.log('📬 Local notification (web):', title, body);
    return false;
  }

  if (!Notifications) {
    console.warn('⚠️ expo-notifications not available, cannot schedule notification');
    return false;
  }

  try {
    // Check if this notification has already been shown
    if (notificationId) {
      const alreadyShown = await hasNotificationBeenShown(notificationId);
      if (alreadyShown) {
        console.log('⏭️ Notification already shown, skipping:', notificationId);
        return false;
      }
    }

    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('⚠️ Notification permissions not granted, cannot show notification');
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        badge: 1,
      },
      trigger: null, // Show immediately
    });

    // Mark as shown if notificationId provided
    if (notificationId) {
      await markNotificationAsShown(notificationId);
    }

    console.log('✅ Local notification scheduled:', title);
    return true;
  } catch (error) {
    console.error('❌ Error scheduling local notification:', error);
    return false;
  }
}

/**
 * Show notification when new notification is created (called by app)
 */
export async function showNotificationFromData(notification: {
  title: string;
  message: string;
  type?: string;
  user_type?: 'doctor' | 'hospital';
  data?: any;
}): Promise<void> {
  try {
    await scheduleLocalNotification(
      notification.title,
      notification.message,
      {
        type: notification.type,
        user_type: notification.user_type || 'doctor',
        ...notification.data,
      }
    );
  } catch (error) {
    console.error('❌ Error showing notification:', error);
  }
}

