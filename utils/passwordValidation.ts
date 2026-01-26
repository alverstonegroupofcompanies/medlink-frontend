/**
 * Strong password rules: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol.
 * Used for both hospital and doctor registration and reset password.
 */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES_TEXT =
  'At least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol (e.g. @$!%*?&)';

// eslint-disable-next-line no-useless-escape
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one symbol (e.g. @$!%*?&)' };
  }
  return { valid: true };
}

export function isPasswordStrong(password: string): boolean {
  return STRONG_PASSWORD_REGEX.test(password);
}
