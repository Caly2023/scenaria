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
      messages,
      tools: SCRIPT_DOCTOR_FUNCTION_DECLARATIONS.map(d => {
        const buildZodSchema = (props: any, required: string[] = []): z.ZodObject<any> => {
          const getTypeSchema = (val: any): z.ZodTypeAny => {
            if (val.type === 'ARRAY') {
              return z.array(val.items ? getTypeSchema(val.items) : z.any());
            } else if (val.type === 'OBJECT') {
              return val.properties 
                ? buildZodSchema(val.properties, val.required || [])
                : z.record(z.any());
            } else if (val.type === 'NUMBER') {
              return z.number();
            } else if (val.type === 'BOOLEAN') {
              return z.boolean();
            } else {
              return z.string();
            }
          };

          const shape: Record<string, z.ZodTypeAny> = {};
          
          for (const [k, v] of Object.entries(props || {})) {
            let schema = getTypeSchema(v);

            if (!required.includes(k)) {
              schema = schema.optional();
            }
            shape[k] = schema;
          }
          
          return z.object(shape).passthrough();
        };

        return ai.defineTool({
          name: d.name,
          description: d.description,
          inputSchema: d.parameters.type === 'OBJECT' 
            ? buildZodSchema(d.parameters.properties, d.parameters.required || [])
            : z.any(), 
          outputSchema: z.any(),
        }, async () => ({
          // Tools are implemented client-side in scriptDoctorToolHandlers.
        }));
      }),
      config: { 
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
      returnToolRequests: true, // CRITICAL: Stop after model generates tool calls so client can execute them
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, { models: [gemini3Flash, gemini25Flash] })
      ],
    });

    const parts = response.message?.content || [];
    const textPart = response.text || '';

    // CRITICAL: Ensure we never return an empty response to avoid Genkit runtime errors
    if (parts.length === 0 && !textPart) {
      return {
        candidates: [{ content: { parts: [{ text: 'I am here to help, but I need a bit more context to provide a specific analysis. How can I assist you further?' }] } }],
        parts: [{ text: 'I am here to help, but I need a bit more context to provide a specific analysis. How can I assist you further?' }],
        text: 'I am here to help, but I need a bit more context to provide a specific analysis. How can I assist you further?',
        message: response.message,
        reasoning: null,
      };
    }

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
    inputSchema: z.object({ context: z.string() }),
    outputSchema: z.any(),
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
    inputSchema: z.object({ context: z.string() }),
    outputSchema: z.string(),
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
    inputSchema: z.object({ brainstorming: z.string() }),
    outputSchema: z.any(),
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
        'initialProject', 'brainstormDual', 'deepCharacter', 'threeActStructure', 'discoveryExtraction'
      ]).optional(),
    }) as z.ZodType<any>,
    outputSchema: z.any(),
  },
  async (input, { sendChunk }) => {
    const { prompt, jsonMode = false, systemPrompt, structuredOutput, model: modelOverride } = input;

    const stageInsightSchema = z.object({
      evaluation: z.string(),
      isReady: z.boolean(),
      issues: z.array(z.string()).optional(),
      recommendations: z.array(z.string()).optional(),
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
      discoveryExtraction: z.object({
        isReady: z.boolean().describe('True if sufficient context has been gathered to define the core project components.'),
        metadata: MetadataSchema.optional(),
        logline: z.string().optional(),
        synopsis: z.string().optional(),
        productionNotes: z.string().optional()
      }),
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
  discoveryChat:       ai.defineFlow({
    name: 'discoveryChatFlow',
    inputSchema: z.object({
      messages: z.array(z.any()),
      context: z.string()
    }),
    outputSchema: z.any()
  }, async (input) => {
    const { messages, context } = input;
    const systemPrompt = `You are a professional film discovery agent. Your goal is to help the user refine their initial idea into a solid short film concept. 
Be conversational, ask the fewest questions necessary (max 1 or 2 at a time), and maximize information capture. 
Strengthen the story for a short film.

You have access to a tool/function to extract data. Once you believe sufficient context has been gathered (e.g. you know the protagonist, the conflict, and the resolution), use the tool to extract the project metadata, logline, synopsis, and production notes.
If the user hasn't provided enough info, just respond naturally and ask a clarifying question.
Context so far: ${context}`;

    const extractTool = ai.defineTool({
      name: 'extractProjectData',
      description: 'Call this when you have gathered enough information to define the core project components.',
      inputSchema: z.object({
        metadata: MetadataSchema,
        logline: z.string(),
        synopsis: z.string(),
        productionNotes: z.string()
      }),
      outputSchema: z.any()
    }, async (input) => {
      return { success: true, extracted: input };
    });

    const response = await ai.generate({
      model: gemini31FlashLite,
      system: systemPrompt,
      messages,
      tools: [extractTool],
      returnToolRequests: true,
      config: { temperature: 0.7 }
    });

    const parts = response.message?.content || [];
    const textPart = response.text || '';
    
    return {
      parts,
      text: textPart,
      message: response.message
    };
  }),
};

export type FlowName = keyof typeof flows;
