/**
 * User-friendly error message utilities
 * Converts technical errors into clear, understandable messages for users
 */

/**
 * Convert field names to user-friendly labels
 */
export const getFieldLabel = (field: string): string => {
  const fieldMap: { [key: string]: string } = {
    'email': 'Email address',
    'email_id': 'Email address',
    'password': 'Password',
    'full_name': 'Full name',
    'name': 'Name',
    'phone_number': 'Phone number',
    'phoneNumber': 'Phone number',
    'profile_photo': 'Profile photo',
    'department_id': 'Department',
    'specialization': 'Specialization',
    'qualifications': 'Qualifications',
    'experience': 'Experience',
    'current_location': 'Location',
    'otp': 'OTP code',
  };

  // Convert snake_case to Title Case if not in map
  if (fieldMap[field]) {
    return fieldMap[field];
  }

  return field
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Convert technical error messages to user-friendly messages
 */
export const getUserFriendlyError = (error: any): string => {
  // Network errors (no response from server)
  if (!error.response) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';
    
    // SSL/Certificate errors
    if (
      errorMessage.includes('certificate') || 
      errorMessage.includes('ssl') || 
      errorMessage.includes('tls') ||
      errorCode === 'CERT_HAS_EXPIRED' || 
      errorCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
      errorCode === 'CERT_SIGNATURE_FAILURE' ||
      errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT'
    ) {
      return 'Unable to verify server certificate. Please contact support if this persists.';
    }
    
    // Network connectivity errors (most common in production)
    if (
      errorMessage.includes('network') || 
      errorMessage.includes('network request failed') ||
      errorMessage.includes('networkerror') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('fetch failed') ||
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'ERR_NETWORK'
    ) {
      // In dev, when calling a local IP, hint at --host=0.0.0.0
      const url = (typeof __DEV__ !== 'undefined' && __DEV__ && error?.config?.baseURL) ? error.config.baseURL : '';
      const isLocalIp = /(192\.168\.|10\.)/.test(url);
      if (typeof __DEV__ !== 'undefined' && __DEV__ && isLocalIp) {
        return 'Cannot reach backend. Run: php artisan serve --host=0.0.0.0 --port=8000 (or .\\serve-mobile.ps1). Phone and PC must be on same WiFi.';
      }
      return 'Unable to connect. Please check your internet connection and try again.';
    }
    
    // Timeout errors
    if (
      errorMessage.includes('timeout') || 
      errorCode === 'ETIMEDOUT' || 
      errorCode === 'ECONNABORTED' ||
      errorCode === 'TIMEOUT'
    ) {
      return 'Request took too long. Please check your connection and try again.';
    }
    
    // Connection refused (server not running or unreachable)
    if (
      errorCode === 'ECONNREFUSED' || 
      errorMessage.includes('failed to connect') || 
      errorMessage.includes('connection refused') ||
      errorMessage.includes('connection reset') ||
      errorCode === 'ERR_CONNECTION_REFUSED'
    ) {
      return 'Cannot connect to server. Please try again later.';
    }
    
    // DNS errors (domain not found)
    if (
      errorCode === 'ENOTFOUND' || 
      errorMessage.includes('getaddrinfo') ||
      errorMessage.includes('dns') ||
      errorCode === 'ERR_NAME_NOT_RESOLVED'
    ) {
      return 'Unable to reach server. Please check your internet connection.';
    }
    
    // Connection closed/aborted
    if (
      errorCode === 'ECONNRESET' ||
      errorMessage.includes('connection closed') ||
      errorMessage.includes('socket hang up')
    ) {
      return 'Connection was interrupted. Please try again.';
    }
    
    // Generic network error fallback
    return 'Unable to connect to server. Please check your internet connection and try again.';
  }

  // Server errors (4xx, 5xx)
  const status = error.response?.status;
  const data = error.response?.data;

  // Validation errors (422)
  if (status === 422) {
    // Handle simple message format (e.g., OTP validation)
    if (data?.message && !data?.errors) {
      return data.message;
    }
    
    // Handle errors object format (field validation)
    if (data?.errors) {
      const errors = data.errors;
      const errorMessages: string[] = [];

      Object.entries(errors).forEach(([field, messages]: [string, any]) => {
        const fieldLabel = getFieldLabel(field);
        const messageArray = Array.isArray(messages) ? messages : [messages];
        
        messageArray.forEach((msg: string) => {
          // Convert technical validation messages to user-friendly
          let friendlyMsg = msg;
          
          if (msg.includes('required')) {
            friendlyMsg = `${fieldLabel} is required`;
          } else if (msg.includes('invalid') || msg.includes('must be')) {
            friendlyMsg = `${fieldLabel}: ${msg}`;
          } else if (msg.includes('already been taken') || msg.includes('already exists')) {
            friendlyMsg = `This ${fieldLabel.toLowerCase()} is already in use`;
          } else if (msg.includes('must be at least')) {
            friendlyMsg = `${fieldLabel} ${msg}`;
          } else if (msg.includes('must not exceed')) {
            friendlyMsg = `${fieldLabel} ${msg}`;
          } else if (msg.includes('format is invalid')) {
            friendlyMsg = `Please enter a valid ${fieldLabel.toLowerCase()}`;
          }
          
          errorMessages.push(friendlyMsg);
        });
      });

      return errorMessages.length > 0 ? errorMessages.join('\n') : 'Please check the form and try again.';
    }
    
    // Default 422 message
    return 'Please check your input and try again.';
  }

  // Unauthorized (401)
  if (status === 401) {
    // Check if it's a login endpoint (different message)
    const endpoint = error.config?.url || '';
    if (endpoint.includes('/login') || endpoint.includes('/register')) {
      return data?.message || 'Invalid email or password. Please try again.';
    }
    // For other endpoints, it's likely token expired
    return 'Your session has expired. Please log in again.';
  }

  // Forbidden (403)
  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }

  // Not Found (404)
  if (status === 404) {
    return 'The requested information could not be found.';
  }

  // Service Unavailable (503) - e.g. payment gateway not configured
  if (status === 503 && data?.message) {
    return data.message;
  }

  // Server Error (500) - prefer backend message when it is user-facing (e.g. Payment system configuration error)
  if (status >= 500) {
    if (data?.message && !String(data.message).includes('SQLSTATE') && !String(data.message).includes('Exception'))
      return data.message;
    return 'Server error occurred. Please try again in a moment.';
  }

  // Custom error message from backend
  if (data?.message) {
    // Make backend messages more user-friendly
    let message = data.message;
    
    // Common technical phrases to replace
    message = message.replace(/SQLSTATE/i, 'Database');
    message = message.replace(/Integrity constraint violation/i, 'This information is already in use');
    message = message.replace(/Duplicate entry/i, 'This information already exists');
    message = message.replace(/Column.*cannot be null/i, 'Some required information is missing');
    
    return message;
  }

  return 'Something went wrong. Please try again.';
};

/**
 * Format validation errors for display in forms
 */
export const formatValidationErrors = (errors: { [key: string]: string | string[] }): { [key: string]: string } => {
  const formatted: { [key: string]: string } = {};
  
  Object.entries(errors).forEach(([field, messages]) => {
    const messageArray = Array.isArray(messages) ? messages : [messages];
    const fieldLabel = getFieldLabel(field);
    
    messageArray.forEach((msg: string) => {
      let friendlyMsg = msg;
      
      if (msg.includes('required')) {
        friendlyMsg = 'This field is required';
      } else if (msg.includes('invalid format') || msg.includes('must be')) {
        friendlyMsg = msg;
      }
      
      // Use the first message for each field
      if (!formatted[field]) {
        formatted[field] = friendlyMsg;
      }
    });
  });
  
  return formatted;
};

/**
 * Get a simple, friendly error message for common scenarios
 */
export const getSimpleError = (error: any): string => {
  // Network issues
  if (!error.response) {
    return 'Connection problem. Please check your internet and try again.';
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // Login/Auth errors
  if (status === 401) {
    return 'Incorrect email or password. Please try again.';
  }

  // Validation errors
  if (status === 422 && data?.errors) {
    const firstError = Object.values(data.errors)[0];
    const errorMsg = Array.isArray(firstError) ? firstError[0] : firstError;
    return typeof errorMsg === 'string' ? errorMsg : 'Please check your input and try again.';
  }

  // Server errors
  if (status >= 500) {
    return 'Server error. Please try again in a moment.';
  }

  // Default
  return data?.message || 'Something went wrong. Please try again.';
};




