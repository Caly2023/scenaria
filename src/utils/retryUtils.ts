/**
 * RETRY UTILITY
 * Implements exponential backoff with quota-aware delay extraction.
 * When a 429 RESOURCE_EXHAUSTED error includes a "Please retry in Xs" hint,
 * we honour it instead of using the default backoff.
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  retryOn?: (error: unknown) => boolean;
}

/**
 * Extracts the API-suggested retry delay (in ms) from a quota error message.
 * e.g. "Please retry in 7.82552461s." → 7826
 */
function extractApiRetryDelay(message: string): number | null {
  const match = message.match(/please retry in\s+([\d.]+)s/i);
  if (match) {
    const seconds = parseFloat(match[1]);
    // Add a 500 ms buffer on top of what the API says
    return Math.ceil(seconds * 1000) + 500;
  }
  return null;
}

/** Returns true if the error is a quota / rate-limit error. */
export function isQuotaError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('429') ||
    msg.includes('too many requests')
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    retryOn = () => true,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Honour the API-suggested delay for quota errors
      const apiDelay = extractApiRetryDelay(errorMessage);
      const waitMs = apiDelay ?? Math.min(delay * factor, maxDelay);

      console.warn(
        `[Retry] Attempt ${attempt + 1} failed. Retrying in ${waitMs}ms...`,
        errorMessage
      );

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}
