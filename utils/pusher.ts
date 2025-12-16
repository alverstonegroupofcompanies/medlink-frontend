/**
 * Pusher WebSocket Service for React Native
 * Handles Pusher initialization with proper React Native support
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

let PusherClass: any = null;
let pusherInitialized = false;
let initializationError: Error | null = null;

// Try to initialize Pusher with better error handling
function initializePusher() {
  if (pusherInitialized) {
    return PusherClass;
  }

  // Only try once
  pusherInitialized = true;

  try {
    // For React Native, try the web version which is more stable
    // The react-native entry point has known bundling issues
    const PusherModule = require('pusher-js');
    
    // Handle different export formats
    if (PusherModule && PusherModule.default) {
      PusherClass = PusherModule.default;
    } else if (PusherModule) {
      PusherClass = PusherModule;
    } else {
      throw new Error('Pusher module is empty or undefined');
    }

    // Verify it's a constructor
    if (typeof PusherClass !== 'function') {
      throw new Error('Pusher is not a constructor function');
    }

    return PusherClass;
  } catch (error: any) {
    initializationError = error;
    console.warn('[Pusher] Failed to initialize:', error?.message || error);
    PusherClass = null;
    return null;
  }
}

// Get Pusher class
export function getPusher() {
  if (PusherClass === null && !pusherInitialized) {
    return initializePusher();
  }
  return PusherClass;
}

// Create Pusher instance
export function createPusherInstance(key: string, options: any) {
  const Pusher = getPusher();
  if (!Pusher) {
    const errorMsg = initializationError 
      ? `Pusher initialization failed: ${initializationError.message}`
      : 'Pusher is not available. Make sure pusher-js is installed and @react-native-community/netinfo is installed.';
    throw new Error(errorMsg);
  }
  
  // Enable debug logging in development if available
  if (typeof __DEV__ !== 'undefined' && __DEV__ && Pusher.logToConsole !== undefined) {
    try {
      Pusher.logToConsole = true;
    } catch (e) {
      // Ignore if logToConsole is not available
    }
  }
  
  try {
    return new Pusher(key, options);
  } catch (error: any) {
    throw new Error(`Failed to create Pusher instance: ${error?.message || error}`);
  }
}

// Check if Pusher is available
export function isPusherAvailable(): boolean {
  try {
    return getPusher() !== null;
  } catch {
    return false;
  }
}

// Get Pusher configuration from environment
export function getPusherConfig() {
  const extra = (Constants.expoConfig?.extra ??
    (Constants as any)?.manifest?.extra ??
    {}) as Record<string, any>;

  return {
    key: extra?.EXPO_PUBLIC_PUSHER_KEY,
    cluster: extra?.EXPO_PUBLIC_PUSHER_CLUSTER,
    host: extra?.EXPO_PUBLIC_PUSHER_HOST,
    port: extra?.EXPO_PUBLIC_PUSHER_PORT,
    forceTLS: extra?.EXPO_PUBLIC_PUSHER_FORCE_TLS,
  };
}

