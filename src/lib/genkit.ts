import { genkit } from 'genkit';
import { googleAI, gemini15Flash, gemini15Pro } from '@genkit-ai/google-genai';

/**
 * GENKIT CONFIGURATION
 * Initializing Genkit with the Google AI plugin.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini15Flash, // Default model
});

// Export models for use in other files
export { gemini15Flash, gemini15Pro };
