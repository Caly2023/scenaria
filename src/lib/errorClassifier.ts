type ErrorType = 'NetworkError' | 'AuthError' | 'QuotaError' | 'ValidationError' | 'NotFoundError' | 'UnknownError';

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  canRetry: boolean;
  retryDelay?: number;
  userMessage: string;
  action?: 'REPORT' | 'RESYNC_AND_RETRY' | 'MODEL_FALLBACK_RETRY' | 'RETRY';
}

type ErrorWithDetails = {
  message?: string;
  status?: number | string;
  code?: number | string;
  toString?: () => string;
};

export function classifyError(error: unknown): ClassifiedError {
  const errorDetails =
    error !== null && typeof error === 'object' ? (error as ErrorWithDetails) : undefined;
  
  const rawMessage = (errorDetails?.message || errorDetails?.toString?.() || '').toLowerCase();
  const errorCode = (errorDetails?.code || errorDetails?.status || '').toString().toLowerCase();

  // Authentication & Permission Errors
  if (
    errorCode === 'permission-denied' ||
    errorCode === '403' ||
    rawMessage.includes('auth') || 
    rawMessage.includes('permission_denied') ||
    rawMessage.includes('insufficient permissions')
  ) {
    return {
      type: 'AuthError',
      message: errorDetails?.message || 'Authentication failed',
      canRetry: false,
      userMessage: 'Security block: You do not have permission to perform this action or your session has expired.',
      action: 'REPORT'
    };
  }

  // Not Found Errors
  if (
    errorCode === 'not-found' ||
    errorCode === '404' ||
    rawMessage.includes('not_found') ||
    rawMessage.includes('no document to update')
  ) {
    return {
      type: 'NotFoundError',
      message: errorDetails?.message || 'Resource not found',
      canRetry: true,
      userMessage: 'The requested document was not found. We are attempting to resync.',
      action: 'RESYNC_AND_RETRY'
    };
  }

  // Quota & Rate Limiting (Firebase & Gemini)
  if (
    rawMessage.includes('quota') || 
    errorCode === '429' || 
    rawMessage.includes('rate limit') || 
    rawMessage.includes('exhausted') ||
    errorCode === 'resource-exhausted'
  ) {
    return {
      type: 'QuotaError',
      message: errorDetails?.message || 'Quota exceeded',
      canRetry: true,
      retryDelay: 30000,
      userMessage: 'The AI Architect is taking a brief rest (API Quota hit). We are attempting to switch models...',
      action: 'MODEL_FALLBACK_RETRY'
    };
  }

  // Network & Connectivity Errors
  if (
    rawMessage.includes('network') || 
    rawMessage.includes('failed to fetch') || 
    rawMessage.includes('offline') || 
    rawMessage.includes('timeout') || 
    rawMessage.includes('deadline exceeded') ||
    errorCode === 'unavailable' ||
    errorCode === 'internal' ||
    errorCode === '503' ||
    errorCode === '504'
  ) {
    return {
      type: 'NetworkError',
      message: errorDetails?.message || 'Network connection failed',
      canRetry: true,
      retryDelay: 5000,
      userMessage: 'Connection lost or server busy. Re-establishing link to AI Core...',
      action: 'RETRY'
    };
  }

  // Validation Errors
  if (rawMessage.includes('validation') || errorCode === 'invalid-argument') {
    return {
      type: 'ValidationError',
      message: errorDetails?.message || 'Invalid input provided',
      canRetry: false,
      userMessage: 'Please check your input for errors and try again.',
      action: 'REPORT'
    };
  }

  // Generic/Unknown Errors
  return {
    type: 'UnknownError',
    message: errorDetails?.message || 'An unknown error occurred',
    canRetry: true,
    retryDelay: 5000,
    userMessage: 'An unexpected error occurred. Please try again.',
    action: 'REPORT'
  };
}

/** Extracts a human-readable message from any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
