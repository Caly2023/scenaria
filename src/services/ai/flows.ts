import { z } from 'zod';
import { ai, gemini31FlashLite, gemini3Flash, gemini25Flash, gemini25FlashLite } from '../../lib/genkit';
import { retry, fallback } from 'genkit/model/middleware';
import * as Prompts from './prompts';

/**
 * GENKIT FLOWS
 * Server-side AI workflows for ScénarIA.
 *
 * ARCHITECTURE NOTE — Script Doctor tool execution:
 * The Script Doctor uses the Gemini REST API directly (not Genkit's ai.generate with tools)
 * so that the CLIENT owns the full agentic loop. Tool declarations live as plain objects
 * in SCRIPT_DOCTOR_FUNCTION_DECLARATIONS below; actual execution is in useScriptDoctorTools.ts.
 */

// ── Shared Schemas ────────────────────────────────────────────────────────────

const PrimitiveSchema = z.object({
  primitive_id: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  type: z.string().optional(),
}).passthrough();

const MetadataSchema = z.object({
  title: z.string().optional(),
  format: z.string().optional(),
  genre: z.string().optional(),
  tone: z.string().optional(),
  logline: z.string().optional(),
  languages: z.array(z.string()).optional(),
  targetDuration: z.string().optional(),
}).passthrough();

// ── Script Doctor: REST API Function Declarations ─────────────────────────────
// Plain objects consumed by the Gemini REST API inside scriptDoctorFlow.
// The client (useScriptDoctorTools.ts) executes every tool call.

const SCRIPT_DOCTOR_FUNCTION_DECLARATIONS = [
  { name: 'fetch_project_state',     description: 'Retrieves the complete list of stages, their primitive counts, and the full ID-MAP.',                                                parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_stage_structure',     description: 'Retrieve the complete structure of any stage with all primitive IDs, titles, order indices, and content previews.',                  parameters: { type: 'OBJECT', properties: { stage_id:    { type: 'STRING', description: 'The stage identifier' } },            required: ['stage_id'] } },
  { name: 'research_context',        description: 'Pull full content from any previous stage for coherence checks. Returns data with primitive_ids.',                                   parameters: { type: 'OBJECT', properties: { stageName:   { type: 'STRING', description: 'The stage name to research' } },        required: ['stageName'] } },
  { name: 'fetch_character_details', description: 'Retrieve full details for a specific character using its primitive_id.',                                                             parameters: { type: 'OBJECT', properties: { characterId: { type: 'STRING', description: 'The character primitive_id' } },        required: ['characterId'] } },
  { name: 'search_project_content',  description: 'Search across all project primitives and stages for a keyword or query.',                                                            parameters: { type: 'OBJECT', properties: { query:       { type: 'STRING', description: 'The search keyword' } },                 required: ['query'] } },
  { name: 'propose_patch',           description: 'Submit a modification for a specific primitive. The ID MUST be a valid primitive_id from the ID-MAP.',                              parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' }, updates: { type: 'OBJECT' } },                                                         required: ['id', 'stage', 'updates'] } },
  { name: 'execute_multi_stage_fix', description: 'Coordinate changes across multiple related stages using their primitive_ids.',                                                       parameters: { type: 'OBJECT', properties: { fixes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' }, updates: { type: 'OBJECT' } } } } }, required: ['fixes'] } },
  { name: 'sync_metadata',           description: "Ensure the project's DNA (title, tone, genre, etc.) is always up to date.",                                                         parameters: { type: 'OBJECT', properties: { metadata: { type: 'OBJECT' } }, required: ['metadata'] } },
  { name: 'add_primitive',           description: 'Adds a new structural element (primitive) to a production stage.',                                                                   parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, primitive: { type: 'OBJECT' }, position: { type: 'NUMBER' } }, required: ['stage', 'primitive'] } },
  { name: 'delete_primitive',        description: 'Removes a specific element from production using its primitive_id.',                                                                 parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' } },                                                                                         required: ['id', 'stage'] } },
  { name: 'restructure_stage',       description: 'Replaces all primitives in a stage with a new set. Use with caution.',                                                              parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, primitives: { type: 'ARRAY', items: { type: 'OBJECT' } } },                                                      required: ['stage', 'primitives'] } },
  { name: 'update_stage_insight',    description: 'Provides a professional analysis (insight) of the current step state and readiness.',                                               parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, insight: { type: 'OBJECT', properties: { content: { type: 'STRING' }, isReady: { type: 'BOOLEAN' }, suggestions: { type: 'ARRAY', items: { type: 'STRING' } }, score: { type: 'NUMBER' } } } }, required: ['stage', 'insight'] } },
  { name: 'update_agent_status',     description: 'Updates the clinical status of the Script Doctor.',                                                                                  parameters: { type: 'OBJECT', properties: { status: { type: 'STRING' }, thinking: { type: 'STRING' } },                                                                                   required: ['status'] } },
  { name: 'set_suggested_actions',   description: 'Sets the contextual action chips for the user.',                                                                                     parameters: { type: 'OBJECT', properties: { actions: { type: 'ARRAY', items: { type: 'STRING' } } },                                                                                     required: ['actions'] } },
];

/** Maps a Genkit model reference string to its Gemini REST API model name. */
function getModelRestName(modelId: string): string {
  const map: Record<string, string> = {
    'googleai/gemini-3.1-flash-lite-preview': 'gemini-3.1-flash-lite-preview',
    'googleai/gemini-3-flash-preview':        'gemini-2.5-flash',
    'googleai/gemini-2.5-flash':              'gemini-2.5-flash',
    'googleai/gemini-2.5-flash-lite':         'gemini-2.5-flash-lite',
  };
  return map[modelId] || 'gemini-2.5-flash-lite';
}

// ── Flows ─────────────────────────────────────────────────────────────────────

// 1. Script Doctor Flow
// Uses the Gemini REST API directly so Genkit's tool-execution loop does NOT
// intercept the functionCall parts. The client owns the full agentic loop.
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
  async (input) => {
    const { messages, context, activeStage, idMapContext = '' } = input;
    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback order: primary → 2.5-flash → Genkit resolved name
    const uniqueModels = Array.from(new Set([
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash',
      getModelRestName(gemini31FlashLite),
    ]));

    if (!messages || messages.length === 0) {
      throw new Error('Message history is empty. Please provide a prompt.');
    }

    let lastError: Error | null = null;
    let data: any = null;

    for (const currentModel of uniqueModels) {
      try {
        const systemInstruction = Prompts.SCRIPT_DOCTOR_SYSTEM_PROMPT(idMapContext, context, activeStage, currentModel);

        const requestBody = {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: messages,
          tools: [{ function_declarations: SCRIPT_DOCTOR_FUNCTION_DECLARATIONS }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        };

        console.log(`[scriptDoctorFlow] Calling ${currentModel} with ${messages.length} turns`);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
        );

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 429 || res.status >= 500) {
            console.warn(`[scriptDoctorFlow] Model ${currentModel} failed with ${res.status}. Falling back...`);
            lastError = new Error(`Gemini API error ${res.status}: ${errText}`);
            continue;
          }
          throw new Error(`Gemini API error ${res.status}: ${errText}`);
        }

        data = await res.json();
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[scriptDoctorFlow] Fetch error with model ${currentModel}:`, err.message);
      }
    }

    if (!data) throw lastError || new Error('All fallback models failed.');

    const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p: any) => p.text)?.text || '';

    return {
      candidates: data.candidates,
      parts,
      text: textPart,
      message: { content: parts },
      reasoning: null,
    };
  }
);

// 2. 3-Act Structure Flow
export const generate3ActStructureFlow = ai.defineFlow(
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
export const generateSynopsisFlow = ai.defineFlow(
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
export const extractCharactersFlow = ai.defineFlow(
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
export const generateFullScriptFlow = ai.defineFlow(
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

// 6. Generic Gemini Flow — handles miscellaneous structured/unstructured requests
export const genericGeminiFlow = ai.defineFlow(
  {
    name: 'genericGeminiFlow',
    inputSchema: z.object({
      prompt: z.string(),
      jsonMode: z.boolean().optional(),
      systemPrompt: z.string().optional(),
      structuredOutput: z.enum([
        'object', 'array', 'stageInsight', 'sequenceArray', 'metadata',
        'initialProject', 'brainstormDual', 'deepCharacter', 'threeActStructure',
      ]).optional(),
    }) as any,
    outputSchema: z.any() as any,
  },
  async (input, { sendChunk }) => {
    const { prompt, jsonMode = false, systemPrompt, structuredOutput } = input;

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
      model: gemini31FlashLite,
      prompt,
      system: systemPrompt,
      output: structuredSchema
        ? { schema: structuredSchema }
        : jsonMode ? { format: 'json' } : undefined,
      use: [retry({ maxRetries: 2 }), fallback(ai, { models: [gemini25FlashLite] })],
      onChunk: (chunk) => { if (sendChunk && chunk.text && !jsonMode) sendChunk(chunk.text); },
    });

    return jsonMode || structuredSchema ? response.output : response.text;
  }
);

// ── Flow Registry ─────────────────────────────────────────────────────────────

export const flows = {
  scriptDoctor:        scriptDoctorFlow,
  generate3ActStructure: generate3ActStructureFlow,
  generateSynopsis:    generateSynopsisFlow,
  extractCharacters:   extractCharactersFlow,
  generateFullScript:  generateFullScriptFlow,
  genericGemini:       genericGeminiFlow,
};

export type FlowName = keyof typeof flows;
