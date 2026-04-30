import { z } from 'zod';
import { ai, gemini31FlashLite, gemini3Flash, gemini25Flash, gemini25FlashLite } from '../../lib/genkit';
import { retry, fallback } from 'genkit/model/middleware';
import * as Prompts from './prompts';
import { 
  MetadataSchema, 
  SCRIPT_DOCTOR_FUNCTION_DECLARATIONS 
} from './schemas';

/**
 * GENKIT FLOWS
 * Server-side AI workflows for ScénarIA.
 */

// ── Flows ─────────────────────────────────────────────────────────────────────

// 1. Script Doctor Flow
const scriptDoctorFlow = ai.defineFlow(
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
  async (input) => {
    const { messages, context, activeStage, idMapContext = '' } = input;

    if (!messages || messages.length === 0) {
      throw new Error('Message history is empty. Please provide a prompt.');
    }

    // Use ai.generate with automatic retry and fallback
    const response = await ai.generate({
      model: gemini31FlashLite,
      system: Prompts.SCRIPT_DOCTOR_SYSTEM_PROMPT(idMapContext, context, activeStage, 'gemini-3.1-flash-lite'),
      contents: messages,
      tools: SCRIPT_DOCTOR_FUNCTION_DECLARATIONS.map(d => ({
        name: d.name,
        description: d.description,
        inputSchema: z.any(), 
        outputSchema: z.any(),
      })),
      config: { 
        temperature: 0.7,
        maxOutputTokens: 8192 
      },
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, { models: [gemini3Flash, gemini25Flash] })
      ],
    });

    const parts = response.message?.content || [];
    const textPart = response.text || '';

    return {
      candidates: [{ content: { parts } }], 
      parts,
      text: textPart,
      message: response.message,
      reasoning: null,
    };
  }
);

// 2. 3-Act Structure Flow
const generate3ActStructureFlow = ai.defineFlow(
  {
    name: 'generate3ActStructureFlow',
    inputSchema: z.object({ context: z.string() }) as any,
    outputSchema: z.any() as any,
  },
  async (input) => {
    const response = await ai.generate({
      model: gemini31FlashLite,
      prompt: Prompts.THREE_ACT_STRUCTURE_PROMPT(input.context),
      output: { format: 'json' },
      use: [retry({ maxRetries: 2 }), fallback(ai, { models: [gemini25Flash] })],
    });
    return response.output;
  }
);

// 3. Synopsis Flow
const generateSynopsisFlow = ai.defineFlow(
  {
    name: 'generateSynopsisFlow',
    inputSchema: z.object({ context: z.string() }) as any,
    outputSchema: z.string() as any,
  },
  async (input, { sendChunk }) => {
    const response = await ai.generate({
      model: gemini3Flash,
      prompt: Prompts.SYNOPSIS_PROMPT(input.context),
      use: [retry({ maxRetries: 2 }), fallback(ai, { models: [gemini31FlashLite, gemini25Flash] })],
      onChunk: (chunk) => { if (sendChunk && chunk.text) sendChunk(chunk.text); },
    });
    return response.text;
  }
);

// 4. Character Extraction Flow
const extractCharactersFlow = ai.defineFlow(
  {
    name: 'extractCharactersFlow',
    inputSchema: z.object({ brainstorming: z.string() }) as any,
    outputSchema: z.any() as any,
  },
  async (input) => {
    const response = await ai.generate({
      model: gemini31FlashLite,
      prompt: Prompts.CHARACTER_EXTRACTION_PROMPT(input.brainstorming),
      output: { format: 'json' },
      use: [retry({ maxRetries: 2 }), fallback(ai, { models: [gemini25FlashLite] })],
    });
    return response.output;
  }
);

// 5. Full Script Generation Flow
const generateFullScriptFlow = ai.defineFlow(
  {
    name: 'generateFullScriptFlow',
    inputSchema: z.any() as any,
    outputSchema: z.any() as any,
  },
  async (ctx) => {
    const response = await ai.generate({
      model: gemini31FlashLite,
      prompt: Prompts.SCRIPT_PROMPT(ctx),
      output: { format: 'json' },
      use: [retry({ maxRetries: 2 }), fallback(ai, { models: [gemini3Flash, gemini25Flash] })],
    });
    return response.output;
  }
);

// 6. Generic Gemini Flow
const genericGeminiFlow = ai.defineFlow(
  {
    name: 'genericGeminiFlow',
    inputSchema: z.object({
      prompt: z.string(),
      jsonMode: z.boolean().optional(),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
      structuredOutput: z.enum([
        'object', 'array', 'stageInsight', 'sequenceArray', 'metadata',
        'initialProject', 'brainstormDual', 'deepCharacter', 'threeActStructure',
      ]).optional(),
    }) as any,
    outputSchema: z.any() as any,
  },
  async (input, { sendChunk }) => {
    const { prompt, jsonMode = false, systemPrompt, structuredOutput, model: modelOverride } = input;

    const stageInsightSchema = z.object({
      content: z.string(),
      isReady: z.boolean(),
      suggestions: z.array(z.string()).optional(),
      suggestedPrompt: z.string().optional(),
      score: z.number().optional(),
    });

    const sequenceItemSchema = z.object({
      title: z.string(),
      content: z.string(),
      characterIds: z.array(z.string()).optional(),
      locationIds: z.array(z.string()).optional(),
      type: z.string().optional(),
    });

    const threeActStructureSchema = z.object({
      stage: z.string().optional(),
      blocks: z.array(z.object({
        id: z.string().optional(),
        title: z.string(),
        content: z.string(),
        visualPrompt: z.string().optional(),
      })),
      next_step_ready: z.boolean().optional(),
    });

    const structuredSchemaMap: Record<string, z.ZodTypeAny> = {
      object:             z.object({}).passthrough(),
      array:              z.array(z.any()),
      stageInsight:       stageInsightSchema,
      sequenceArray:      z.array(sequenceItemSchema),
      metadata:           MetadataSchema,
      initialProject:     z.object({
        metadata:         MetadataSchema,
        pitch:            z.string(),
        critique:         z.string().optional(),
        validation:       z.object({ status: z.enum(['GOOD TO GO', 'NEEDS WORK']), feedback: z.string().optional() }).optional(),
        suggestedPrompt:  z.string().optional(),
      }),
      brainstormDual:     z.object({
        pitch:            z.string(),
        metadataUpdates:  MetadataSchema.partial().optional(),
        critique:         z.string().optional(),
        suggestedActions: z.array(z.string()).optional(),
      }),
      deepCharacter:      z.object({
        nowStory:         z.object({ tags: z.array(z.string()), physical: z.string(), wantsNeeds: z.string() }),
        backStory:        z.string(),
        forwardStory:     z.string(),
        relationshipMap:  z.string(),
      }),
      threeActStructure:  threeActStructureSchema,
    };

    const structuredSchema = structuredOutput ? structuredSchemaMap[structuredOutput] : undefined;

    const response = await ai.generate({
      model: modelOverride || gemini31FlashLite,
      prompt,
      system: systemPrompt,
      output: structuredSchema
        ? { schema: structuredSchema }
        : jsonMode ? { format: 'json' } : undefined,
      use: [
        retry({ maxRetries: 2 }), 
        fallback(ai, { models: [gemini3Flash, gemini31FlashLite, gemini25Flash, gemini25FlashLite] })
      ],
      onChunk: (chunk) => { if (sendChunk && chunk.text && !jsonMode) sendChunk(chunk.text); },
    });

    return jsonMode || structuredSchema ? response.output : response.text;
  }
);

export const flows = {
  scriptDoctor:        scriptDoctorFlow,
  generate3ActStructure: generate3ActStructureFlow,
  generateSynopsis:    generateSynopsisFlow,
  extractCharacters:   extractCharactersFlow,
  generateFullScript:  generateFullScriptFlow,
  genericGemini:       genericGeminiFlow,
};

export type FlowName = keyof typeof flows;
