import { withRetry } from "../../utils/retryUtils";
import { classifyError } from "../../lib/errorClassifier";

class FatalError extends Error {
  isFatal = true;
  constructor(message: string) {
    super(message);
    this.name = 'FatalError';
  }
}

/**
 * GENKIT FLOW HELPER
 * Calls the server-side Genkit API routes with built-in retry and error classification.
 * - QuotaErrors (429) are retried with backoff (never fatal).
 * - AuthErrors / NotFoundErrors are fatal (no retry).
 * - All other errors are retried up to maxRetries times.
 */
export async function callGenkitFlow<T>(flowName: string, input: unknown): Promise<T> {
  const url = `/api/genkit/${flowName}`;

  return withRetry(async () => {
    console.log(`[GeminiService] Calling ${url}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // ignore JSON parse failures
      }

      const errorMsg =
        (errorData.error as string | undefined) ||
        `API Error (${flowName}): ${response.status} ${response.statusText}`;

      const classified = classifyError({ status: response.status, message: errorMsg });
      console.error(`[GeminiService] ${classified.type}: ${errorMsg}`);

      // Quota errors → always retryable (the flow's own model-fallback chain runs server-side,
      // but if all models are exhausted the server throws and we should NOT retry client-side
      // immediately — surface the error cleanly instead).
      if (classified.type === 'QuotaError') {
        // Let it propagate — withRetry will back off appropriately
        throw new Error(errorMsg);
      }

      // Fatal errors (Auth, Validation) → no retry
      if (!classified.canRetry) {
        throw new FatalError(errorMsg);
      }

      throw new Error(errorMsg);
    }

    return response.json() as Promise<T>;
  }, {
    maxRetries: 1,          // Server-side already retries across 3 models; keep client retries low
    initialDelay: 3000,
    maxDelay: 30000,
    factor: 3,
    retryOn: (error) => !(error as { isFatal?: boolean })?.isFatal,
  });
}

/** Redacts potentially harmful or instruction-overriding strings. */
export function sanitizeInput(input: string): string {
  return input.replace(/(ignore\s+(all\s+)?(previous\s+)?(instructions|rules|prompts)|override\s+system|system\s+prompt|bypass\s+rules)/gi, '[REDACTED]');
}

export type GeminiOptions = {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  structuredOutput?: string;
};

export async function callGenericGemini<T>(options: GeminiOptions): Promise<T> {
  return callGenkitFlow<T>('genericGemini', {
    ...options,
    prompt: sanitizeInput(options.prompt)
  });
}
