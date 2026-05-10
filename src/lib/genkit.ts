import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';


/**
 * GEMINI MODEL CONSTANTS (2026 Suite)
 */
export const gemini31Pro = 'googleai/gemini-3.1-pro-preview';
export const gemini31FlashLite = 'googleai/gemini-3.1-flash-lite-preview';
export const gemini3Flash = 'googleai/gemini-3-flash-preview';
export const gemini25Flash = 'googleai/gemini-2.5-flash';
export const gemini25FlashLite = 'googleai/gemini-2.5-flash-lite';

/**
 * NANO BANANA IMAGE GENERATION MODELS
 * Source: https://ai.google.dev/gemini-api/docs/image-generation
 *
 * - geminiImageGen       → Nano Banana   : gemini-2.5-flash-image (speed & efficiency)
 * - geminiImageGen2      → Nano Banana 2 : gemini-3.1-flash-image-preview (high-volume)
 * - geminiImageGenPro    → Nano Banana Pro: gemini-3-pro-image-preview (pro / high-fidelity)
 */
/** Nano Banana — fast, efficient image generation */
export const geminiImageGen = 'googleai/gemini-2.5-flash-image';
/** Nano Banana 2 — high-efficiency, high-volume image generation */
export const geminiImageGen2 = 'googleai/gemini-3.1-flash-image-preview';
/** Nano Banana Pro — professional asset production with advanced reasoning */
export const geminiImageGenPro = 'googleai/gemini-3-pro-image-preview';

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
