import { withRetry } from "../utils/retryUtils";
import { classifyError } from "../lib/errorClassifier";
import * as Prompts from "./ai/prompts";
import type { StageInsight } from "../types";

/**
 * GENKIT FLOW HELPER
 * Calls the server-side Genkit API routes with built-in retry and error classification.
 */
async function callGenkitFlow<T>(flowName: string, input: any): Promise<T> {
  const url = `/api/genkit/${flowName}`;
  
  return withRetry(async () => {
    console.log(`[GeminiService] Calling ${url}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `API Error (${flowName}): ${response.status} ${response.statusText}`;
      
      const classified = classifyError({ status: response.status, message: errorMsg });
      console.error(`[GeminiService] ${classified.type}: ${errorMsg}`);
      
      // If it's a fatal error (like Auth or Not Found), don't retry in withRetry
      if (!classified.canRetry) {
        const error = new Error(errorMsg) as any;
        error.isFatal = true;
        throw error;
      }
      
      throw new Error(errorMsg);
    }

    return response.json();
  }, {
    maxRetries: 2,
    retryOn: (error) => !error.isFatal,
  });
}

/** Redacts potentially harmful or instruction-overriding strings. */
function sanitizeInput(input: string): string {
  return input.replace(/(ignore\s+(all\s+)?(previous\s+)?(instructions|rules|prompts)|override\s+system|system\s+prompt|bypass\s+rules)/gi, '[REDACTED]');
}

type GeminiOptions = {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  structuredOutput?: string;
};

async function callGenericGemini<T>(options: GeminiOptions): Promise<T> {
  return callGenkitFlow<T>('genericGemini', {
    ...options,
    prompt: sanitizeInput(options.prompt)
  });
}

export const geminiService = {
  async scriptDoctorAgent(messages: any[], context: string, activeStage: string, complexity: 'simple' | 'moderate' | 'complex' = 'moderate', idMapContext: string = '') {
    return callGenkitFlow<any>('scriptDoctor', {
      messages,
      context,
      activeStage,
      complexity,
      idMapContext
    });
  },

  async rewriteSequence(content: string, instruction: string): Promise<string> {
    return callGenericGemini<string>({
      prompt: `Rewrite the following script sequence based on this instruction: "${instruction}". Maintain the tone and style of the original.\n\nOriginal:\n${content}`
    });
  },

  async generateInitialSequences(storyDump: string, format: string, availableCharacters: any[], availableLocations: any[]): Promise<any> {
    const prompt = `You are a professional screenwriter. Based on this story dump, generate 3-5 initial sequences for a ${format}. 
    Ensure the content follows professional screenwriting standards (sluglines, action, dialogue).
    
    For each sequence, identify which characters and locations from the provided lists are present.
    
    MANDATORY STRUCTURE: Return a JSON array representing exactly ONE (1) primitive per sequence. Each primitive MUST have a 'title' and 'content' formatted in Markdown.

    Available Characters:
    ${JSON.stringify(availableCharacters.map(c => ({ id: c.id, name: c.name })), null, 2)}
    
    Available Locations:
    ${JSON.stringify(availableLocations.map(l => ({ id: l.id, name: l.name })), null, 2)}
    
    Story Dump:
    ${storyDump}`;

    return callGenericGemini({
      prompt,
      jsonMode: true,
      structuredOutput: 'sequenceArray',
    });
  },

  async generateLoglineDraft(context: string): Promise<string> {
    if (!context || context.trim().length < 20) return "Based on your brainstorming, I will draft a logline here once you provide more details.";

    return callGenericGemini<string>({
      prompt: `Synthesize a professional 1-2 sentence logline from this project context:\n\n${context}`,
      systemPrompt: 'You are a professional screenwriter. Focus on protagonist, goal, and conflict.'
    });
  },

  async generateSynopsis(context: string): Promise<any> {
    if (!context || context.trim().length < 50) return "Once the story is more developed, I will generate a full synopsis here.";
    return callGenkitFlow<any>('generateSynopsis', { context });
  },

  async extractCharactersAndSettings(context: string): Promise<any> {
    return callGenkitFlow<any>('extractCharacters', { brainstorming: context });
  },

  async generate3ActStructure(context: string): Promise<any> {
    return callGenkitFlow<any>('generate3ActStructure', { context });
  },

  async refine3ActStructure(currentStructure: string, feedback: string): Promise<any> {
    return callGenericGemini<any>({
      prompt: `Refine the following 8-beat 3-Act Structure based on this feedback: "${feedback}". Maintain the 8-beat framework. Output in JSON format.\n\nCurrent Structure:\n${currentStructure}`,
      jsonMode: true,
      structuredOutput: 'threeActStructure',
    });
  },

  async generateTreatment(context: string): Promise<any> {
    return callGenericGemini<any>({ 
      prompt: Prompts.TREATMENT_PROMPT(context),
      jsonMode: true,
      structuredOutput: 'sequenceArray',
    });
  },

  async generateFullScript(scriptCtx: Prompts.ScriptGenerationContext) {
    return callGenkitFlow<any>('generateFullScript', scriptCtx);
  },

  async rewriteSequenceWithContext(prompt: string): Promise<string> {
    return callGenericGemini<string>({ prompt });
  },

  async generateScriptWithContext(prompt: string): Promise<string> {
    return callGenericGemini<string>({ prompt });
  },

  async refineLoglineDraft(currentLogline: string, feedback: string): Promise<string> {
    return callGenericGemini<string>({
      prompt: `Refine the following logline draft based on this feedback: "${feedback}".\n\nCurrent Logline:\n${currentLogline}`,
      systemPrompt: 'The logline must strictly be a 1-2 sentence description that hooks the audience, focusing on the protagonist, their goal, and the central conflict.'
    });
  },

  async initializeProjectAgent(storyDraft: string, format?: string): Promise<any> {
    return callGenericGemini<any>({
      prompt: `INITIAL STORY IDEA: ${storyDraft}${format ? `\nSELECTED FORMAT: ${format}` : ''}\n\nAnalyze this idea and generate the core project metadata and initial critique. Evaluate if GOOD TO GO or NEEDS WORK.`,
      jsonMode: true,
      structuredOutput: 'initialProject',
    });
  },

  async brainstormDual(userInput: string, currentStory: string, currentMetadata: any): Promise<any> {
    return callGenericGemini<any>({
      prompt: `User Input: ${userInput}\n\nCurrent Story: ${currentStory}\n\nCurrent Metadata: ${JSON.stringify(currentMetadata)}`,
      systemPrompt: 'You are a professional screenwriting consultant and pitch doctor. Provide critique and final pitch.',
      jsonMode: true,
      structuredOutput: 'brainstormDual',
    });
  },

  async generateCharacterViews(description: string): Promise<any> {
    return callGenericGemini<any>({
      prompt: `Generate 4 consistent views (Front, Profile, Back, Full-shot) of a character based on this description: "${description}".`
    });
  },

  async deepDevelopCharacter(character: any, masterStory: string, otherCharacters: any[]): Promise<any> {
    return callGenericGemini<any>({
      prompt: `Deeply develop character ${character.name} based on the Master Story: ${masterStory}. Other characters: ${JSON.stringify(otherCharacters.map(c => c.name))}`,
      jsonMode: true,
      structuredOutput: 'deepCharacter',
    });
  },

  async deepDevelopLocation(location: any, masterStory: string): Promise<any> {
    return callGenericGemini<any>({
      prompt: `Deeply develop location ${location.name} based on the master story: ${masterStory}.`
    });
  },

  async generateStageInsight(stage: string, content: string, context: string): Promise<StageInsight> {
    if (!content || content.trim().length < 5) return { content: "Please start writing to generate insight.", isReady: false };
    return callGenericGemini({
      prompt: Prompts.STAGE_INSIGHT_PROMPT(stage, content, context),
      jsonMode: true,
      structuredOutput: 'stageInsight',
    });
  },

  async generateStageContent(stage: string, prompt: string, context: string): Promise<string> {
    return callGenericGemini<string>({
      prompt: `Stage: ${stage}\nContext: ${context}\n\nTask: ${prompt}`,
    });
  },
};

