import { z } from 'zod';
import { ai, gemini31FlashLite, gemini3Flash, gemini25Flash, gemini25FlashLite } from '../../lib/genkit';
import { retry, fallback } from 'genkit/model/middleware';
import * as Prompts from './prompts';
// Note: retry/fallback still used in other flows (generateSynopsisFlow, etc.)
// gemini3Flash, gemini25Flash, gemini25FlashLite still used in those flows too.

/**
 * GENKIT FLOWS
 * Defining server-side AI workflows.
 */

// Shared schema for story elements (primitives) to ensure Gemini API compliance
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

// --- SCRIPT DOCTOR TOOLS ---
// These are declared in Genkit so the model knows it can call them. 
// The actual execution is handled by the client-side loop in useScriptDoctor.ts,
// but declaring them here ensures the model outputs proper functionCall parts.

export const fetchProjectStateTool = ai.defineTool(
  {
    name: 'fetch_project_state',
    description: 'Retrieves the complete list of stages, their primitive counts, and the full ID-MAP.',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const getStageStructureTool = ai.defineTool(
  {
    name: 'get_stage_structure',
    description: 'Retrieve the complete structure of any stage with all primitive IDs, titles, order indices, and content previews.',
    inputSchema: z.object({ stage_id: z.string() }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const researchContextTool = ai.defineTool(
  {
    name: 'research_context',
    description: 'Pull full content from any previous stage for coherence checks. Returns data with primitive_ids.',
    inputSchema: z.object({ stageName: z.string() }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const fetchCharacterDetailsTool = ai.defineTool(
  {
    name: 'fetch_character_details',
    description: 'Retrieve full details for a specific character using its primitive_id.',
    inputSchema: z.object({ characterId: z.string() }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const searchProjectContentTool = ai.defineTool(
  {
    name: 'search_project_content',
    description: 'Search across all project primitives and stages for a specific keyword or query.',
    inputSchema: z.object({ query: z.string() }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const proposePatchTool = ai.defineTool(
  {
    name: 'propose_patch',
    description: 'Submit a modification for a specific primitive. Returns the updated document snapshot or an error object. The ID MUST be a valid primitive_id from the ID-MAP.',
    inputSchema: z.object({
      id: z.string(),
      stage: z.string(),
      updates: z.record(z.any()),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const executeMultiStageFixTool = ai.defineTool(
  {
    name: 'execute_multi_stage_fix',
    description: 'Coordinate changes across multiple related stages using their primitive_ids.',
    inputSchema: z.object({
      fixes: z.array(z.object({
        id: z.string(),
        stage: z.string(),
        updates: PrimitiveSchema.partial(),
      }).passthrough()),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const syncMetadataTool = ai.defineTool(
  {
    name: 'sync_metadata',
    description: "Ensure the project's DNA (title, tone, genre, etc.) is always up to date.",
    inputSchema: z.object({ metadata: MetadataSchema }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const addPrimitiveTool = ai.defineTool(
  {
    name: 'add_primitive',
    description: 'Adds a new structural element (primitive) to a production stage.',
    inputSchema: z.object({
      stage: z.string(),
      primitive: PrimitiveSchema,
      position: z.number().optional(),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const deletePrimitiveTool = ai.defineTool(
  {
    name: 'delete_primitive',
    description: 'Removes a specific element from production using its primitive_id.',
    inputSchema: z.object({
      id: z.string(),
      stage: z.string(),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const restructureStageTool = ai.defineTool(
  {
    name: 'restructure_stage',
    description: 'Replaces all primitives in a stage with a new set. Use with caution.',
    inputSchema: z.object({
      stage: z.string(),
      primitives: z.array(PrimitiveSchema),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const updateStageInsightTool = ai.defineTool(
  {
    name: 'update_stage_insight',
    description: 'Provides a professional analysis (insight) of the current step state and readiness.',
    inputSchema: z.object({
      stage: z.string(),
      insight: z.object({
        content: z.string(),
        isReady: z.boolean(),
        suggestions: z.array(z.string()).optional(),
        score: z.number().optional(),
      }).passthrough(),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const updateAgentStatusTool = ai.defineTool(
  {
    name: 'update_agent_status',
    description: 'Updates the clinical status and internal thinking of the Script Doctor.',
    inputSchema: z.object({
      status: z.string().describe('Emoji + Short status (e.g., "🧠 Analyzing...")'),
      thinking: z.string().optional().describe('Internal reasoning'),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

export const setSuggestedActionsTool = ai.defineTool(
  {
    name: 'set_suggested_actions',
    description: 'Sets the contextual action chips for the user.',
    inputSchema: z.object({
      actions: z.array(z.string()).describe('List of 2-3 action labels'),
    }).passthrough(),
    outputSchema: z.any(),
  },
  async () => ({ 
    status: "client_execution_required",
    message: "This tool must be executed on the client. Please stop and wait for the client result."
  })
);

const scriptDoctorTools = [
  fetchProjectStateTool,
  getStageStructureTool,
  researchContextTool,
  fetchCharacterDetailsTool,
  searchProjectContentTool,
  proposePatchTool,
  executeMultiStageFixTool,
  syncMetadataTool,
  addPrimitiveTool,
  deletePrimitiveTool,
  restructureStageTool,
  updateStageInsightTool,
  updateAgentStatusTool,
  setSuggestedActionsTool,
];

// --- SCRIPT DOCTOR FUNCTION DECLARATIONS (Gemini REST API native format) ---
// Declared separately so we bypass Genkit's internal tool-execution loop.
// The client (useScriptDoctor.ts) handles all tool execution.
const SCRIPT_DOCTOR_FUNCTION_DECLARATIONS = [
  { name: 'fetch_project_state', description: 'Retrieves the complete list of stages, their primitive counts, and the full ID-MAP.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_stage_structure', description: 'Retrieve the complete structure of any stage with all primitive IDs, titles, order indices, and content previews.', parameters: { type: 'OBJECT', properties: { stage_id: { type: 'STRING', description: 'The stage identifier' } }, required: ['stage_id'] } },
  { name: 'research_context', description: 'Pull full content from any previous stage for coherence checks. Returns data with primitive_ids.', parameters: { type: 'OBJECT', properties: { stageName: { type: 'STRING', description: 'The stage name to research' } }, required: ['stageName'] } },
  { name: 'fetch_character_details', description: 'Retrieve full details for a specific character using its primitive_id.', parameters: { type: 'OBJECT', properties: { characterId: { type: 'STRING', description: 'The character primitive_id' } }, required: ['characterId'] } },
  { name: 'search_project_content', description: 'Search across all project primitives and stages for a keyword or query.', parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'The search keyword' } }, required: ['query'] } },
  { name: 'propose_patch', description: 'Submit a modification for a specific primitive. The ID MUST be a valid primitive_id from the ID-MAP.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' }, updates: { type: 'OBJECT' } }, required: ['id', 'stage', 'updates'] } },
  { name: 'execute_multi_stage_fix', description: 'Coordinate changes across multiple related stages using their primitive_ids.', parameters: { type: 'OBJECT', properties: { fixes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' }, updates: { type: 'OBJECT' } } } } }, required: ['fixes'] } },
  { name: 'sync_metadata', description: "Ensure the project's DNA (title, tone, genre, etc.) is always up to date.", parameters: { type: 'OBJECT', properties: { metadata: { type: 'OBJECT' } }, required: ['metadata'] } },
  { name: 'add_primitive', description: 'Adds a new structural element (primitive) to a production stage.', parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, primitive: { type: 'OBJECT' }, position: { type: 'NUMBER' } }, required: ['stage', 'primitive'] } },
  { name: 'delete_primitive', description: 'Removes a specific element from production using its primitive_id.', parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' } }, required: ['id', 'stage'] } },
  { name: 'restructure_stage', description: 'Replaces all primitives in a stage with a new set. Use with caution.', parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, primitives: { type: 'ARRAY', items: { type: 'OBJECT' } } }, required: ['stage', 'primitives'] } },
  { name: 'update_stage_insight', description: 'Provides a professional analysis (insight) of the current step state and readiness.', parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, insight: { type: 'OBJECT', properties: { content: { type: 'STRING' }, isReady: { type: 'BOOLEAN' }, suggestions: { type: 'ARRAY', items: { type: 'STRING' } }, score: { type: 'NUMBER' } } } }, required: ['stage', 'insight'] } },
  { name: 'update_agent_status', description: 'Updates the clinical status of the Script Doctor.', parameters: { type: 'OBJECT', properties: { status: { type: 'STRING' }, thinking: { type: 'STRING' } }, required: ['status'] } },
  { name: 'set_suggested_actions', description: 'Sets the contextual action chips for the user.', parameters: { type: 'OBJECT', properties: { actions: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['actions'] } },
];

// Helper: pick the right model name for the REST API
function getModelRestName(modelId: string): string {
  const map: Record<string, string> = {
    'googleai/gemini-3.1-flash-lite-preview': 'gemini-2.5-flash-lite',
    'googleai/gemini-3-flash-preview': 'gemini-2.5-flash',
    'googleai/gemini-2.5-flash': 'gemini-2.5-flash',
    'googleai/gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
  };
  return map[modelId] || 'gemini-2.5-flash-lite';
}

// 1. Script Doctor Flow
// NOTE: We use the Gemini REST API directly (not ai.generate() with tools) so that
// Genkit's internal tool-execution loop does NOT consume the functionCall parts.
// The client (useScriptDoctor.ts) is responsible for the full agentic loop.
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

    // Fallback order as requested: default 3-flash-lite-preview fallback 2.5-flash
    const modelsToTry = [
      'gemini-3.0-flash-lite-preview',
      'gemini-2.5-flash',
      getModelRestName(gemini31FlashLite)
    ];

    let lastError: Error | null = null;
    let data: any = null;

    // Deduplicate models to try
    const uniqueModels = Array.from(new Set(modelsToTry));

    for (const currentModel of uniqueModels) {
      try {
        const systemInstruction = Prompts.SCRIPT_DOCTOR_SYSTEM_PROMPT(idMapContext, context, activeStage, currentModel);
        
        const requestBody = {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: messages,
          tools: [{ function_declarations: SCRIPT_DOCTOR_FUNCTION_DECLARATIONS }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
        );

        if (!res.ok) {
          const errText = await res.text();
          // Fallback on quota (429) or server errors (500, 503)
          if (res.status === 429 || res.status >= 500) {
            console.warn(`[scriptDoctorFlow] Model ${currentModel} failed with ${res.status}. Falling back...`);
            lastError = new Error(`Gemini API error ${res.status}: ${errText}`);
            continue;
          }
          // Do not fallback for bad request (e.g. 400 structure errors)
          throw new Error(`Gemini API error ${res.status}: ${errText}`);
        }

        data = await res.json();
        break; // Success! Break out of fallback loop
      } catch (err: any) {
        lastError = err;
        console.warn(`[scriptDoctorFlow] Fetch error with model ${currentModel}:`, err.message);
      }
    }

    if (!data) {
      throw lastError || new Error("All fallback models failed.");
    }
    const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p: any) => p.text)?.text || '';

    // Return a normalized response the client can parse
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
    inputSchema: z.object({
      context: z.string(),
    }) as any,
    outputSchema: z.any() as any,
  },
  async (input) => {
    const { context } = input;
    const response = await ai.generate({
      model: gemini31FlashLite,
      prompt: Prompts.THREE_ACT_STRUCTURE_PROMPT(context),
      output: { format: 'json' },
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, {
          models: [gemini25Flash],
        }),
      ],
    });
    return response.output;
  }
);

// 3. Synopsis Flow
export const generateSynopsisFlow = ai.defineFlow(
  {
    name: 'generateSynopsisFlow',
    inputSchema: z.object({
      context: z.string(),
    }) as any,
    outputSchema: z.string() as any,
  },
  async (input, { sendChunk }) => {
    const { context } = input;
    const response = await ai.generate({
      model: gemini3Flash, // Use regular Flash for depth in Synopsis
      prompt: Prompts.SYNOPSIS_PROMPT(context),
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, {
          models: [gemini31FlashLite, gemini25Flash],
        }),
      ],
      onChunk: (chunk) => {
        if (sendChunk && chunk.text) sendChunk(chunk.text);
      },

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
    }) as any,
    outputSchema: z.any() as any,
  },
  async (input) => {
    const { brainstorming } = input;
    const response = await ai.generate({
      model: gemini31FlashLite,
      prompt: Prompts.CHARACTER_EXTRACTION_PROMPT(brainstorming),
      output: { format: 'json' },
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, {
          models: [gemini25FlashLite],
        }),
      ],
    });
    return response.output;
  }
);

// 5. Script Generation Flow
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
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, {
          models: [gemini3Flash, gemini25Flash],
        }),
      ],
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
      structuredOutput: z.enum([
        'object',
        'array',
        'stageInsight',
        'sequenceArray',
        'metadata',
        'initialProject',
        'brainstormDual',
        'deepCharacter',
        'threeActStructure',
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
      blocks: z.array(
        z.object({
          id: z.string().optional(),
          title: z.string(),
          content: z.string(),
          visualPrompt: z.string().optional(),
        })
      ),
      next_step_ready: z.boolean().optional(),
    });

    const structuredSchemaMap = {
      object: z.object({}).passthrough(),
      array: z.array(z.any()),
      stageInsight: stageInsightSchema,
      sequenceArray: z.array(sequenceItemSchema),
      metadata: MetadataSchema,
      initialProject: z.object({
        metadata: MetadataSchema,
        pitch: z.string(),
        critique: z.string().optional(),
        validation: z.object({
          status: z.enum(['GOOD TO GO', 'NEEDS WORK']),
          feedback: z.string().optional(),
        }).optional(),
        suggestedPrompt: z.string().optional(),
      }),
      brainstormDual: z.object({
        pitch: z.string(),
        metadataUpdates: MetadataSchema.partial().optional(),
        critique: z.string().optional(),
        suggestedActions: z.array(z.string()).optional(),
      }),
      deepCharacter: z.object({
        nowStory: z.object({
          tags: z.array(z.string()),
          physical: z.string(),
          wantsNeeds: z.string(),
        }),
        backStory: z.string(),
        forwardStory: z.string(),
        relationshipMap: z.string(),
      }),
      threeActStructure: threeActStructureSchema,
    };

    const structuredSchema = structuredOutput 
      ? (structuredSchemaMap as Record<string, z.ZodTypeAny>)[structuredOutput] 
      : undefined;

    const response = await ai.generate({
      model: gemini31FlashLite,
      prompt,
      system: systemPrompt,
      output: structuredSchema
        ? { schema: structuredSchema }
        : jsonMode
          ? { format: 'json' }
          : undefined,
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, {
          models: [gemini25FlashLite],
        }),
      ],
      onChunk: (chunk) => {
        if (sendChunk && chunk.text && !jsonMode) sendChunk(chunk.text);
      }
    });

    return jsonMode || structuredSchema ? response.output : response.text;
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
