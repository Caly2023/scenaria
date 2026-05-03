import { withRetry } from "@/utils/retryUtils";
import { classifyError } from "@/lib/errorClassifier";

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
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `API Error (${flowName}): ${response.status} ${response.statusText}`;
      
      const classified = classifyError({ status: response.status, message: errorMsg });
      console.error(`[GeminiService] ${classified.type}: ${errorMsg}`);
      
      // If it's a fatal error (like Auth or Not Found), don't retry in withRetry
      if (!classified.canRetry) {
        throw new FatalError(errorMsg);
      }
      
      throw new Error(errorMsg);
    }

    return response.json();
  }, {
    maxRetries: 2,
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
