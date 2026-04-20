import { z } from 'zod';
import { ai, gemini15Flash, gemini15Pro } from '../../lib/genkit';
import * as Prompts from './prompts';

/**
 * GENKIT FLOWS
 * Defining server-side AI workflows.
 */

// 1. Script Doctor Flow
export const scriptDoctorFlow = ai.defineFlow(
  {
    name: 'scriptDoctorFlow',
    inputSchema: z.object({
      messages: z.array(z.any()),
      context: z.string(),
      activeStage: z.string(),
      complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
      idMapContext: z.string().optional(),
    }),
    outputSchema: z.any(),
  },
  async (input, { sendChunk }) => {
    const { messages, context, activeStage, idMapContext = '' } = input;
    
    // Construct system instruction
    const systemInstruction = Prompts.SCRIPT_DOCTOR_SYSTEM_PROMPT(idMapContext, context, activeStage, 'gemini-1.5-flash');

    const response = await ai.generate({
      model: gemini15Flash,
      systemPrompt: systemInstruction,
      messages: messages,
      onChunk: (chunk) => {
        if (sendChunk && chunk.text) sendChunk(chunk.text);
      }
    });

    return response.text;
  }
);

// 2. 3-Act Structure Flow
export const generate3ActStructureFlow = ai.defineFlow(
  {
    name: 'generate3ActStructureFlow',
    inputSchema: z.object({
      brainstorming: z.string(),
      logline: z.string(),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const { brainstorming, logline } = input;
    const response = await ai.generate({
      model: gemini15Flash,
      prompt: Prompts.THREE_ACT_STRUCTURE_PROMPT(brainstorming, logline),
      output: { format: 'json' }
    });
    return response.output;
  }
);

// 3. Synopsis Flow
export const generateSynopsisFlow = ai.defineFlow(
  {
    name: 'generateSynopsisFlow',
    inputSchema: z.object({
      brainstorming: z.string(),
      structure: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input, { sendChunk }) => {
    const { brainstorming, structure } = input;
    const response = await ai.generate({
      model: gemini15Pro,
      prompt: Prompts.SYNOPSIS_PROMPT(brainstorming, structure),
      onChunk: (chunk) => {
        if (sendChunk && chunk.text) sendChunk(chunk.text);
      }
    });
    return response.text;
  }
);

// 4. Character Extraction Flow
export const extractCharactersFlow = ai.defineFlow(
  {
    name: 'extractCharactersFlow',
    inputSchema: z.object({
      brainstorming: z.string(),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    const { brainstorming } = input;
    const response = await ai.generate({
      model: gemini15Flash,
      prompt: Prompts.CHARACTER_EXTRACTION_PROMPT(brainstorming),
      output: { format: 'json' }
    });
    return response.output;
  }
);

// 5. Script Generation Flow
export const generateFullScriptFlow = ai.defineFlow(
  {
    name: 'generateFullScriptFlow',
    inputSchema: z.any(),
    outputSchema: z.any(),
  },
  async (ctx) => {
    const response = await ai.generate({
      model: gemini15Flash,
      prompt: Prompts.SCRIPT_PROMPT(ctx),
      output: { format: 'json' }
    });
    return response.output;
  }
);

// Generic Flow to handle miscellaneous simple requests
export const genericGeminiFlow = ai.defineFlow(
  {
    name: 'genericGeminiFlow',
    inputSchema: z.object({
      prompt: z.string(),
      jsonMode: z.boolean().optional(),
      systemPrompt: z.string().optional(),
    }),
    outputSchema: z.any(),
  },
  async (input, { sendChunk }) => {
    const { prompt, jsonMode = false, systemPrompt } = input;
    const response = await ai.generate({
      model: gemini15Flash,
      prompt,
      systemPrompt,
      output: jsonMode ? { format: 'json' } : undefined,
      onChunk: (chunk) => {
        if (sendChunk && chunk.text && !jsonMode) sendChunk(chunk.text);
      }
    });
    return jsonMode ? response.output : response.text;
  }
);

// Flow Registry for dynamic lookup in API routes
export const flows = {
  scriptDoctor: scriptDoctorFlow,
  generate3ActStructure: generate3ActStructureFlow,
  generateSynopsis: generateSynopsisFlow,
  extractCharacters: extractCharactersFlow,
  generateFullScript: generateFullScriptFlow,
  genericGemini: genericGeminiFlow,
};

export type FlowName = keyof typeof flows;
