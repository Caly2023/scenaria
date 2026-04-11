export type ErrorType = 'NetworkError' | 'AuthError' | 'QuotaError' | 'ValidationError' | 'UnknownError';

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  canRetry: boolean;
  retryDelay?: number;
  userMessage: string;
}

export function classifyError(error: any): ClassifiedError {
  const message = (error?.message || error?.toString() || '').toLowerCase();
  const statusCode = error?.status || error?.code;

  // Authentication Errors
  if (message.includes('auth') || statusCode === 'auth/unauthorized' || message.includes('permission_denied')) {
    return {
      type: 'AuthError',
      message: error?.message || 'Authentication failed',
      canRetry: false,
      userMessage: 'Your session has expired. Please sign in again.'
    };
  }

  // Quota & Rate Limiting (Firebase & Gemini)
  if (message.includes('quota') || statusCode === 429 || message.includes('rate limit') || statusCode === 'resource-exhausted') {
    return {
      type: 'QuotaError',
      message: error?.message || 'Quota exceeded',
      canRetry: true,
      retryDelay: 30000,
      userMessage: 'API quota exceeded. The AI Architect is taking a brief rest. Please try again in a few moments.'
    };
  }

  // Network & Connectivity Errors
  if (message.includes('network') || message.includes('failed to fetch') || message.includes('offline') || message.includes('timeout') || statusCode === 'unavailable') {
    return {
      type: 'NetworkError',
      message: error?.message || 'Network connection failed',
      canRetry: true,
      retryDelay: 5000,
      userMessage: 'Connection lost. Please check your network and try again.'
    };
  }

  // Validation Errors
  if (message.includes('validation') || statusCode === 'invalid-argument') {
    return {
      type: 'ValidationError',
      message: error?.message || 'Invalid input provided',
      canRetry: false,
      userMessage: 'Please check your input for errors and try again.'
    };
  }

  // Generic/Unknown Errors
  return {
    type: 'UnknownError',
    message: error?.message || 'An unknown error occurred',
    canRetry: true,
    retryDelay: 5000,
    userMessage: 'An unexpected error occurred. Please try again.'
  };
}
