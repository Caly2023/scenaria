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

    const discoveryExtractionSchema = z.object({
      isReady: z.boolean().describe('True if sufficient context has been gathered to define the core project components.'),
      metadata: MetadataSchema.optional(),
      logline: z.string().optional(),
      synopsis: z.string().optional(),
      productionNotes: z.string().optional()
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
      discoveryExtraction: discoveryExtractionSchema,
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
    const systemPrompt = `Tu es un agent de découverte professionnel pour ScénarIA. 
Ton but est de transformer l'idée initiale de l'utilisateur en un concept de court-métrage de haute qualité, prêt pour la production par IA.

${Prompts.SHORT_FILM_QUALITY_FRAMEWORK}
${Prompts.STORY_DEVELOPMENT_BLUEPRINT}

MISSION :
1.  **Analyser et Déduire** : Étudie l'histoire de l'utilisateur. Déduis-en autant que possible (genre, ton, personnages potentiels, lieux) sans demander.
2.  **Approfondir** : Pose seulement 1 ou 2 questions à fort impact par tour. Concentre-toi sur le cœur émotionnel, le "pourquoi" du personnage, ou l'atmosphère visuelle.
3.  **Langage Accessible** : N'utilise PAS de jargon technique (comme "incident déclencheur" ou "arc de personnage") sans l'expliquer. Utilise un langage simple et quotidien.
4.  **Approche Pédagogique** : Explique brièvement *pourquoi* tu poses une question. (ex: "Connaître le style d'éclairage aide l'IA à créer la bonne ambiance pour votre scène").
5.  **Capture d'Information** : Tu dois finir par connaître :
    *   **Métadonnées** : Format, Genre, Ton.
    *   **Détails Noyau** : Personnages, Lieux, Atmosphère, Colorimétrie et Ton.
    *   **Narratif** : Une Logline percutante et un Synopsis détaillé.

RÈGLE D'OR : Réponds TOUJOURS en français.

Dès que tu as assez d'informations pour définir ces éléments, utilise l'outil 'extractProjectData'. Tu DOIS fournir un objet JSON complet contenant :
    *   **metadata** : Format, Genre, Ton.
    *   **logline** : Une seule phrase puissante.
    *   **synopsis** : Un résumé narratif détaillé.
    *   **productionNotes** : Notes techniques et intentions visuelles complètes.
    
Les données que tu extrais seront utilisées pour initialiser tout le pipeline de production, assure-toi qu'elles sont riches, détaillées et évocatrices.

Contexte actuel (Idée Initiale) : ${context}`;

    const extractTool = ai.defineTool({
      name: 'extractProjectData',
      description: 'Call this when you have gathered enough information to define the core project components (Metadata, Logline, Synopsis, Production Notes).',
      inputSchema: z.object({
        metadata: MetadataSchema,
        logline: z.string().describe('A concise and powerful one-sentence summary of the film.'),
        synopsis: z.string().describe('A detailed narrative summary (approx. 300-500 words) focusing on characters and emotional arc.'),
        productionNotes: z.string().describe('Comprehensive notes on visual style, atmosphere, colorimetry, character details, location descriptions, and technical intent for AI generation.')
      }),
      outputSchema: z.object({ success: z.boolean() })
    }, async (input) => {
      return { success: true };
    });

    const response = await ai.generate({
      model: gemini3Flash,
      system: systemPrompt,
      messages,
      tools: [extractTool],
      returnToolRequests: true,
      config: { 
        temperature: 0.7,
        maxOutputTokens: 8192
      },
      use: [
        retry({ maxRetries: 1 }),
        fallback(ai, { models: [gemini31FlashLite] })
      ],
    });

    const parts = response.message?.content || [];
    const textPart = response.text || '';
    
    // Safety check: ensure we always return something to prevent client-side hanging
    if (parts.length === 0 && !textPart) {
      return {
        parts: [{ text: "J'analyse votre idée... Pouvons-nous approfondir certains aspects ?" }],
        text: "J'analyse votre idée... Pouvons-nous approfondir certains aspects ?",
        message: response.message
      };
    }

    return {
      parts,
      text: textPart,
      message: response.message
    };
  }),
};

export type FlowName = keyof typeof flows;
