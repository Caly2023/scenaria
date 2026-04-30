import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';


/**
 * GEMINI MODEL CONSTANTS (2026 Suite)
 */
export const gemini31FlashLite = 'googleai/gemini-3.1-flash-lite-preview';
export const gemini3Flash = 'googleai/gemini-3-flash-preview';
export const gemini25Flash = 'googleai/gemini-2.5-flash';
export const gemini25FlashLite = 'googleai/gemini-2.5-flash-lite';

/**
 * GENKIT CONFIGURATION
 * Initializing Genkit with the Google AI plugin and global retry logic.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
  model: gemini31FlashLite, // Default model for the suite
});

// Export all models for use in flows
export { };
