import { z } from 'zod';
import { MessageData } from 'genkit';
import { ai, gemini31Pro, gemini31FlashLite, gemini3Flash, gemini25Flash, gemini25FlashLite, geminiImageGen } from '../../lib/genkit';
import { retry, fallback } from 'genkit/model/middleware';
import * as Prompts from './prompts';
import { 
  MetadataSchema, 
  SCRIPT_DOCTOR_FUNCTION_DECLARATIONS,
  ShotListSchema,
} from './schemas';

/**
 * GENKIT FLOWS
 * Server-side AI workflows for ScénarIA.
 */

// ── Types & Schemas ──────────────────────────────────────────────────────────

const PartSchema = z.object({
  text: z.string().optional(),
  media: z.object({
    url: z.string(),
    contentType: z.string().optional(),
  }).optional(),
  toolRequest: z.object({
    name: z.string(),
    input: z.unknown().optional(),
    ref: z.string().optional(),
  }).optional(),
  toolResponse: z.object({
    name: z.string(),
    output: z.unknown().optional(),
    ref: z.string().optional(),
  }).optional(),
}).passthrough();

const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'model', 'tool']),
  content: z.array(PartSchema),
});


// ── Flows ─────────────────────────────────────────────────────────────────────

// 1. Script Doctor Flow
const scriptDoctorFlow = ai.defineFlow(
  {
    name: 'scriptDoctorFlow',
    inputSchema: z.object({
      messages: z.array(MessageSchema),
      context: z.string(),
      activeStage: z.string(),
      complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
      idMapContext: z.string().optional(),
    }),
    outputSchema: z.unknown(),
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
      messages: messages as MessageData[],
      tools: SCRIPT_DOCTOR_FUNCTION_DECLARATIONS.map(d => {
        const buildZodSchema = (props: Record<string, unknown>, required: string[] = []): z.ZodTypeAny => {
          const getTypeSchema = (val: Record<string, unknown>): z.ZodTypeAny => {
            if (val.type === 'ARRAY') {
              return z.array(val.items ? getTypeSchema(val.items as Record<string, unknown>) : z.unknown());
            } else if (val.type === 'OBJECT') {
              return val.properties 
                ? buildZodSchema(val.properties as Record<string, unknown>, (val.required as string[]) || [])
                : z.record(z.unknown());
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
            let schema = getTypeSchema(v as Record<string, unknown>);

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
            ? buildZodSchema(d.parameters.properties as Record<string, unknown>, d.parameters.required || [])
            : z.unknown(), 
          outputSchema: z.unknown(),
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
    outputSchema: z.unknown(),
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
    outputSchema: z.unknown(),
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
    inputSchema: z.unknown(),
    outputSchema: z.unknown(),
  },
  async (ctx) => {
    const response = await ai.generate({
      model: gemini31FlashLite,
      prompt: Prompts.SCRIPT_PROMPT(ctx as Parameters<typeof Prompts.SCRIPT_PROMPT>[0]),
      output: { format: 'json' },
      use: [retry({ maxRetries: 2 }), fallback(ai, { models: [gemini3Flash, gemini25Flash] })],
    });
    return response.output;
  }
);

// 6. Technical Breakdown Flow — Découpage Technique par scène
const generateTechnicalBreakdownFlow = ai.defineFlow(
  {
    name: 'generateTechnicalBreakdownFlow',
    inputSchema: z.object({
      /** Slugline / title of the parent dialogue scene */
      sceneTitle:   z.string(),
      /** Full screenplay content of the scene to break down */
      sceneContent: z.string(),
      /** Unified project context string built by contextAssembler */
      context:      z.string(),
    }),
    outputSchema: ShotListSchema,
  },
  async (input) => {
    const { sceneTitle, sceneContent, context } = input;

    const response = await ai.generate({
      model: gemini25Flash,
      prompt: Prompts.TECHNICAL_BREAKDOWN_PROMPT(sceneTitle, sceneContent, context),
      output: { schema: ShotListSchema },
      config: {
        temperature: 0.4,          // Lower = more consistent technical values
        maxOutputTokens: 8192,
      },
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, { models: [gemini3Flash, gemini31FlashLite] }),
      ],
    });

    // Validate & return — Genkit guarantees schema conformance
    const shots = response.output;
    if (!Array.isArray(shots) || shots.length === 0) {
      throw new Error('[generateTechnicalBreakdownFlow] No shots generated for scene: ' + sceneTitle);
    }
    return shots;
  }
);

// 7. Generic Gemini Flow
const genericGeminiFlow = ai.defineFlow(
  {
    name: 'genericGeminiFlow',
    inputSchema: z.object({
      prompt: z.string(),
      jsonMode: z.boolean().optional(),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
      structuredOutput: z.enum([
        'object', 'array', 'stageInsight', 'sequenceArray', 'shotList', 'metadata',
        'initialProject', 'brainstormDual', 'deepCharacter', 'threeActStructure', 'discoveryExtraction'
      ]).optional(),
    }),
    outputSchema: z.unknown(),
  },
  async (input: Record<string, unknown>, { sendChunk }) => {
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
      emotionalShift: z.string().optional(),
      conflict: z.string().optional(),
      visualFocus: z.string().optional(),
      characterIds: z.array(z.string()).optional(),
      locationIds: z.array(z.string()).optional(),
      type: z.string().optional(),
    });

    // Inline shot schema reuse for genericGeminiFlow structured output
    const shotItemSchema = z.object({
      title:          z.string(),
      content:        z.string(),
      shotType:       z.string(),
      angle:          z.string(),
      cameraMovement: z.string(),
      lens:           z.string().optional(),
      frameRate:      z.string().optional(),
      lighting:       z.string().optional(),
      soundDesign:    z.string().optional(),
      duration:       z.string().optional(),
      notes:          z.string().optional(),
      characterIds:   z.array(z.string()).optional(),
      locationId:     z.string().optional(),
      sceneTitle:     z.string().optional(),
      parentSceneId:  z.string().optional(),
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
      array:              z.array(z.unknown()),
      stageInsight:       stageInsightSchema,
      sequenceArray:      z.array(sequenceItemSchema),
      shotList:           z.array(shotItemSchema),
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

    const structuredSchema = structuredOutput ? structuredSchemaMap[structuredOutput as string] : undefined;

    const response = await ai.generate({
      model: (modelOverride || gemini31FlashLite) as typeof gemini31FlashLite,
      prompt: prompt as string,
      system: systemPrompt as string | undefined,
      output: structuredSchema
        ? { schema: structuredSchema }
        : jsonMode ? { format: 'json' } : undefined,
      use: [
        retry({ maxRetries: 2 }), 
        fallback(ai, { models: [gemini3Flash, gemini31FlashLite, gemini25Flash, gemini25FlashLite] })
      ],
      onChunk: (chunk: { text?: string }) => { if (sendChunk && chunk.text && !jsonMode) sendChunk(chunk.text); },
    });

    return jsonMode || structuredSchema ? response.output : response.text;
  }
);

// 8. Image Generation Flow (Cinematic Genkit Engine)
const generateCharacterImageFlow = ai.defineFlow(
  {
    name: 'generateCharacterImageFlow',
    inputSchema: z.object({ prompt: z.string(), referenceImageUrl: z.string().optional() }),
    outputSchema: z.array(z.string()),
  },
  async (input) => {
    try {
      const messages: MessageData[] = [
        {
          role: 'user',
          content: [
            { text: `Generate a high quality cinematic image: ${input.prompt}` },
            ...(input.referenceImageUrl ? [{ media: { url: input.referenceImageUrl, contentType: 'image/jpeg' } }] : [])
          ]
        }
      ];
      
      const response = await ai.generate({
        model: geminiImageGen,
        messages,
        // responseModalities must be in config, NOT output (output is a Genkit-level field)
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
        output: { format: 'media' },
      });
      // Extract media URLs from response
      const parts = response.message?.content || [];
      const images = parts.filter(p => p.media).map(p => p.media?.url).filter(Boolean) as string[];
      return images;
    } catch (e) {
      console.error('Image generation failed:', e);
      throw new Error(`Failed to generate cinematic image: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
);

export const flows = {
  scriptDoctor:        scriptDoctorFlow,
  generate3ActStructure: generate3ActStructureFlow,
  generateSynopsis:    generateSynopsisFlow,
  extractCharacters:   extractCharactersFlow,
  generateFullScript:  generateFullScriptFlow,
  genericGemini:       genericGeminiFlow,
  generateCharacterImage: generateCharacterImageFlow,
  generateTechnicalBreakdown: generateTechnicalBreakdownFlow,
  discoveryChat:       ai.defineFlow({
    name: 'discoveryChatFlow',
    inputSchema: z.object({
      messages: z.array(MessageSchema),
      context: z.string()
    }),
    outputSchema: z.unknown()
  }, async (input) => {
    const { messages, context } = input;
    const systemPrompt = `Tu es le Directeur du Développement (Showrunner/Scénariste expert) de ScénarIA. 
Ton but exclusif est de transformer la graine d'idée initiale de l'utilisateur en un concept de court-métrage au potentiel de chef-d'œuvre, d'une profondeur inouïe, capable de captiver intensément les téléspectateurs finaux et de viser un standard "Oscar/Palme d'Or". 

${Prompts.SHORT_FILM_QUALITY_FRAMEWORK}
${Prompts.STORY_DEVELOPMENT_BLUEPRINT}

MISSION ABSOLUE :
1.  **Analyse Ultra-Profonde** : Ne te contente jamais de la surface. Scrutte les non-dits, les thèmes sous-jacents, et les conflits psychologiques latents dans l'idée de l'utilisateur. Déduis-en autant que possible sans demander l'évidence.
2.  **Interrogation Chirurgicale** : Pose toutes les questions nécessaires et essentielles. Explore l'âme des personnages (leurs traumas, leurs désirs contradictoires, leurs dilemmes moraux insolubles). Pose des questions puissantes pour forcer le créateur à creuser le cœur émotionnel, le "pourquoi", et l'atmosphère viscérale.
3.  **Standards d'Excellence** : N'accepte pas les clichés ou les idées simplistes. Pousse l'utilisateur à créer de l'ironie dramatique, du sous-texte, un monde riche et des enjeux poignants.
4.  **Langage et Pédagogie** : Parle en termes simples mais profonds, sans jargon technique inutile. Explique pourquoi tu poses ces questions (ex: "Comprendre la blessure secrète du personnage va nous permettre de donner un sens tragique à sa décision finale").
5.  **Critère de Validation (Extrêmement Strict)** : Tu NE DOIS déclencher l'outil d'extraction ('extractProjectData') QUE SI, ET SEULEMENT SI, tu es convaincu que la fondation narrative est devenue incroyablement riche, nuancée, et émotionnellement puissante au point d'être digne d'un chef-d'œuvre. Si l'histoire n'est pas encore assez profonde pour captiver les téléspectateurs, CONTINUE de poser des questions et de creuser. Ne valide pas une idée banale.
6.  **Passage à l'Étape Suivante** : Quand tu appelles l'outil 'extractProjectData', l'interface présentera automatiquement un bouton permettant à l'utilisateur de valider la création du projet et de passer à l'étape suivante. N'hésite pas à lui dire explicitement qu'un bouton apparaîtra pour qu'il puisse valider son projet.

RÈGLE D'OR : Réponds TOUJOURS en français, de manière inspirante et exigeante.

Lors de l'extraction finale via 'extractProjectData', tu dois fournir :
    *   **metadata** : Titre, Format, Genre, Ton, Langues, Durée (précis et spécifiques).
    *   **logline** : Une seule phrase au cordeau, évoquant le personnage, son but et le conflit central de manière magnétique.
    *   **synopsis** : Un résumé narratif détaillé (incluant la catharsis émotionnelle et les arcs de transformation).
    *   **productionNotes** : Des notes exhaustives (intentions visuelles, atmosphère sonore, métaphores visuelles, colorimétrie, références cinématographiques).

Cette étape est cruciale : la qualité du film final dépend de la profondeur absolue atteinte ici.

Contexte actuel (Idée Initiale) : ${context}`;

    const extractTool = ai.defineTool({
      name: 'extractProjectData',
      description: 'Call this when you have gathered enough information to define the core project components (Metadata, Logline, Synopsis, Production Notes).',
      inputSchema: z.object({
        metadata: z.object({
          title: z.string().describe("Project title"),
          format: z.string().describe("Project format (e.g. Short Film, Feature)"),
          genre: z.string().describe("Main genre"),
          tone: z.string().describe("Overall tone"),
          languages: z.array(z.string()).describe("Languages used"),
          targetDuration: z.string().describe("Target duration")
        }).passthrough(),
        logline: z.string().describe('A concise and powerful one-sentence summary of the film.'),
        synopsis: z.string().describe('A detailed narrative summary (approx. 300-500 words) focusing on characters and emotional arc.'),
        productionNotes: z.string().describe('Comprehensive notes on visual style, atmosphere, colorimetry, character details, location descriptions, and technical intent for AI generation.')
      }),
      outputSchema: z.object({ success: z.boolean() })
    }, async (input) => {
      return { success: true };
    });

    const response = await ai.generate({
      model: gemini25Flash,
      system: systemPrompt,
      messages: messages as MessageData[],
      tools: [extractTool],
      returnToolRequests: true,
      config: { 
        temperature: 0.7,
        maxOutputTokens: 8192
      },
      use: [
        retry({ maxRetries: 2 }),
        fallback(ai, { models: [gemini31Pro, gemini3Flash, gemini31FlashLite] })
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
