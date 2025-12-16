/**
 * Error handling utilities and custom error classes
 */

/**
 * Custom error class for API-related errors
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Custom error class for database errors
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Maps Firebase Auth error codes to user-friendly messages
 */
export function getAuthErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak. Use at least 8 characters with uppercase, lowercase, numbers, and symbols.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many login attempts. Please try again later.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/internal-error': 'Authentication service error. Please try again later.',
  };

  return errorMessages[code] || 'An authentication error occurred. Please try again.';
}

/**
 * Maps API error codes to user-friendly messages
 */
export function getAPIErrorMessage(code: string, statusCode?: number): string {
  const errorMessages: Record<string, string> = {
    'invalid-input': 'Please check your input and try again.',
    'unauthorized': 'You are not authorized to perform this action.',
    'not-found': 'The requested resource was not found.',
    'server-error': 'Server error. Please try again later.',
    'network-error': 'Network error. Please check your connection.',
    'timeout': 'Request timed out. Please try again.',
    'rate-limited': 'Too many requests. Please wait before trying again.',
  };

  return errorMessages[code] || 'An error occurred. Please try again.';
}

/**
 * Safely extracts error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }

  return 'An unexpected error occurred.';
}

/**
 * Determines if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('fetch') ||
           error.message.includes('Network') ||
           error.message.includes('Failed to fetch');
  }

  return false;
}

/**
 * Determines if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('timeout') ||
           error.message.includes('AbortError');
  }

  return false;
}

/**
 * Safe async operation with error handling
 * Returns [data, error] tuple instead of throwing
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<[T | null, Error | null]> {
  try {
    const data = await fn();
    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}
