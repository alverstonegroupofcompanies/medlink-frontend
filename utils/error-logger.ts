import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import API from '../app/api';
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
 * Send error to backend
 */
async function sendError(errorData: ErrorLogData) {
  try {
    await API.post('/error-logs', errorData);
  } catch (e) {
    // Silently fail - don't log errors about logging errors
    console.warn('Failed to send error log to backend');
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
 * Log console error
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
    const message = typeof error === 'string' ? error : error.message;
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
    
    // Add to queue
    errorQueue.push(errorData);
    
    // Process queue (with debounce)
    setTimeout(processQueue, 500);
  } catch (e) {
    // Silently fail
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

