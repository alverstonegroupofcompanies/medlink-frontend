import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ErrorLogData {
  error_source: 'frontend';
  error_type: 'console' | 'api' | 'exception' | 'network' | 'other';
  message: string;
  code?: string;
  file?: string;
  line?: number;
  trace?: string;
  console_log?: string;
  endpoint?: string;
  method?: string;
  device_info?: string;
  platform?: string;
  app_version?: string;
  user_type?: string;
}

let errorQueue: ErrorLogData[] = [];
let isSending = false;
let lastErrorTime = 0;
const ERROR_LOG_COOLDOWN = 2000; // 2 seconds between error logs
const MAX_ERRORS_PER_MINUTE = 10;
let errorCount = 0;
let errorCountResetTime = Date.now();

/**
 * Get device information
 */
async function getDeviceInfo(): Promise<string> {
  try {
    const deviceInfo = {
      model: Device.modelName || 'Unknown',
      os: Platform.OS,
      osVersion: Platform.Version,
      brand: Device.brand || 'Unknown',
    };
    return JSON.stringify(deviceInfo);
  } catch (e) {
    return 'Unknown device';
  }
}

/**
 * Get app version
 */
function getAppVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

/**
 * Get user type from storage
 */
async function getUserType(): Promise<string | undefined> {
  try {
    const doctorToken = await AsyncStorage.getItem('doctorToken');
    const hospitalToken = await AsyncStorage.getItem('hospitalToken');
    
    if (doctorToken) return 'doctor';
    if (hospitalToken) return 'hospital';
    return undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Send error to backend using a separate axios instance to avoid interceptors
 * This prevents infinite loops where error logging triggers more error logging
 */
async function sendError(errorData: ErrorLogData) {
  try {
    // Skip sending network errors entirely - if there's a network error,
    // the backend is clearly unreachable, so logging would fail anyway
    if (errorData.error_type === 'network') {
      return; // Don't try to log network errors - prevents error cascade
    }
    
    // Use a separate axios instance without interceptors to prevent loops
    const errorLogger = axios.create({
      baseURL: API_BASE_URL,
      timeout: 5000, // Short timeout to prevent hanging
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    await errorLogger.post('/error-logs', errorData);
  } catch (e) {
    // Silently fail - don't log errors about logging errors
    // This prevents infinite loops
  }
}

/**
 * Process error queue
 */
async function processQueue() {
  if (isSending || errorQueue.length === 0) return;
  
  isSending = true;
  const errors = [...errorQueue];
  errorQueue = [];
  
  for (const error of errors) {
    await sendError(error);
    // Small delay between sends
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isSending = false;
  
  // Process any new errors that were added while sending
  if (errorQueue.length > 0) {
    setTimeout(processQueue, 1000);
  }
}

/**
 * Log console error with rate limiting to prevent infinite loops
 */
export async function logConsoleError(
  error: Error | string,
  errorType: 'console' | 'api' | 'exception' | 'network' | 'other' = 'console',
  additionalData?: {
    endpoint?: string;
    method?: string;
    trace?: string;
    file?: string;
    line?: number;
  }
) {
  try {
    // Rate limiting: prevent too many error logs
    const now = Date.now();
    
    // Reset counter every minute
    if (now - errorCountResetTime > 60000) {
      errorCount = 0;
      errorCountResetTime = now;
    }
    
    // Skip if too many errors in the last minute
    if (errorCount >= MAX_ERRORS_PER_MINUTE) {
      return;
    }
    
    // Skip if same error was logged recently (cooldown)
    // For network errors, use longer cooldown to prevent spam
    const cooldown = errorType === 'network' ? ERROR_LOG_COOLDOWN * 2 : ERROR_LOG_COOLDOWN;
    if (now - lastErrorTime < cooldown && (errorType === 'api' || errorType === 'network')) {
      return;
    }
    
    // Skip if this is an error about the error-logs endpoint itself
    const message = typeof error === 'string' ? error : error.message;
    if (message && additionalData?.endpoint?.includes('/error-logs')) {
      return; // Don't log errors about error logging
    }
    
    // Skip all network error logging when backend is unreachable
    // This prevents error cascades when backend is down
    if (errorType === 'network') {
      // Skip duplicate network error messages (already logged in api.js)
      if (message?.includes('Network Error: Cannot connect') ||
          message?.includes('Cannot reach backend') ||
          message?.includes('ERR_NETWORK') ||
          message?.includes('ECONNREFUSED')) {
        return; // Don't log network errors - backend is unreachable anyway
      }
    }
    
    const stack = typeof error === 'string' ? undefined : error.stack;
    
    const errorData: ErrorLogData = {
      error_source: 'frontend',
      error_type: errorType,
      message: message || 'Unknown error',
      code: additionalData?.endpoint ? 'API_ERROR' : undefined,
      file: additionalData?.file,
      line: additionalData?.line,
      trace: additionalData?.trace || stack,
      console_log: typeof error === 'string' ? error : JSON.stringify(error),
      endpoint: additionalData?.endpoint,
      method: additionalData?.method,
      device_info: await getDeviceInfo(),
      platform: Platform.OS,
      app_version: getAppVersion(),
      user_type: await getUserType(),
    };
    
    // Update rate limiting counters
    lastErrorTime = now;
    errorCount++;
    
    // Add to queue
    errorQueue.push(errorData);
    
    // Process queue (with debounce)
    setTimeout(processQueue, 500);
  } catch (e) {
    // Silently fail - don't log errors about logging errors
  }
}

/**
 * Setup global error handlers
 */
export function setupErrorHandlers() {
  // Capture console.error
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError(...args);
    
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');
    
    // Skip logging network errors that are already handled by API interceptor
    // These are already logged with full context in api.js
    if (message.includes('NETWORK ERROR: Cannot connect to backend') ||
        message.includes('Network Error: Cannot connect') ||
        message.includes('ERR_NETWORK') ||
        (message.includes('Network Error') && message.includes('Base URL'))) {
      return; // Already logged in api.js with full context
    }
    
    // Skip logging 401/session expired errors - API interceptor handles them silently
    if (message.includes('session has expired') ||
        message.includes('Your session has expired') ||
        message.includes('Unauthenticated') ||
        message.includes('Error loading') && (message.includes('session has expired') || message.includes('Unauthenticated'))) {
      return; // API interceptor handles these and redirects to login
    }
    
    logConsoleError(message, 'console');
  };
  
  // Capture console.warn (optional - can be filtered)
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    originalConsoleWarn(...args);
    
    // Only log warnings that look like errors
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');
    
    if (message.toLowerCase().includes('error') || 
        message.toLowerCase().includes('failed') ||
        message.toLowerCase().includes('exception')) {
      logConsoleError(message, 'console');
    }
  };
  
  // Capture unhandled promise rejections
  if (typeof (global as any).onunhandledrejection !== 'undefined') {
    const originalUnhandledRejection = (global as any).onunhandledrejection;
    (global as any).onunhandledrejection = (event: any) => {
      if (originalUnhandledRejection) {
        originalUnhandledRejection(event);
      }
      
      const error = event?.reason || event;
      logConsoleError(
        error instanceof Error ? error : String(error),
        'exception',
        { trace: error?.stack }
      );
    };
  }
  
  // Capture React errors (if ErrorBoundary is not catching them)
  if (typeof (global as any).ErrorUtils !== 'undefined') {
    const ErrorUtils = (global as any).ErrorUtils;
    const originalGlobalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      logConsoleError(error, 'exception', {
        trace: error.stack,
      });
      
      if (originalGlobalHandler) {
        originalGlobalHandler(error, isFatal);
      }
    });
  }
}

