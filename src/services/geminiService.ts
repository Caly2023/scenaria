import * as Prompts from "./ai/prompts";

/**
 * GENKIT FLOW HELPER
 * Calls the server-side Genkit API routes.
 */
async function callGenkitFlow<T>(flowName: string, input: any): Promise<T> {
  const url = `/api/genkit/${flowName}`;
  console.log(`[GeminiService] Calling ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      let errorMsg = `API Error (${flowName}): ${response.status} ${response.statusText}`;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch {
        // Fallback to status text
      }
      console.error(`[GeminiService] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error(`[GeminiService] Network Error: Could not reach ${url}. Ensure the server is running.`);
      throw new Error(`Failed to connect to the AI service at ${url}. Please check your connection.`);
    }
    throw error;
  }
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

  async rewriteSequence(content: string, instruction: string) {
    return callGenericGemini({
      prompt: `Rewrite the following script sequence based on this instruction: "${instruction}". Maintain the tone and style of the original.\n\nOriginal:\n${content}`
    });
  },

  async generateInitialSequences(storyDump: string, format: string, availableCharacters: any[], availableLocations: any[]) {
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

  async generateLoglineDraft(context: string) {
    if (!context || context.trim().length < 20) return "Based on your brainstorming, I will draft a logline here once you provide more details.";

    return callGenericGemini({
      prompt: `Synthesize a professional 1-2 sentence logline from this project context:\n\n${context}`,
      systemPrompt: 'You are a professional screenwriter. Focus on protagonist, goal, and conflict.'
    });
  },

  async generateSynopsis(context: string) {
    if (!context || context.trim().length < 50) return "Once the story is more developed, I will generate a full synopsis here.";
    return callGenkitFlow<any>('generateSynopsis', { context });
  },

  async extractCharactersAndSettings(context: string) {
    return callGenkitFlow<any>('extractCharacters', { brainstorming: context });
  },

  async generate3ActStructure(context: string) {
    return callGenkitFlow<any>('generate3ActStructure', { context });
  },

  async refine3ActStructure(currentStructure: string, feedback: string) {
    return callGenericGemini({
      prompt: `Refine the following 8-beat 3-Act Structure based on this feedback: "${feedback}". Maintain the 8-beat framework. Output in JSON format.\n\nCurrent Structure:\n${currentStructure}`,
      jsonMode: true,
      structuredOutput: 'threeActStructure',
    });
  },

  async generateTreatment(context: string) {
    return callGenericGemini({ 
      prompt: Prompts.TREATMENT_PROMPT(context),
      jsonMode: true,
      structuredOutput: 'sequenceArray',
    });
  },

  async generateFullScript(scriptCtx: Prompts.ScriptGenerationContext) {
    return callGenkitFlow<any>('generateFullScript', scriptCtx);
  },

  async rewriteSequenceWithContext(prompt: string) {
    return callGenericGemini({ prompt });
  },

  async generateScriptWithContext(prompt: string) {
    return callGenericGemini({ prompt });
  },

  async refineLoglineDraft(currentLogline: string, feedback: string) {
    return callGenericGemini({
      prompt: `Refine the following logline draft based on this feedback: "${feedback}".\n\nCurrent Logline:\n${currentLogline}`,
      systemPrompt: 'The logline must strictly be a 1-2 sentence description that hooks the audience, focusing on the protagonist, their goal, and the central conflict.'
    });
  },

  async initializeProjectAgent(storyDraft: string, format?: string) {
    return callGenericGemini({
      prompt: `INITIAL STORY IDEA: ${storyDraft}${format ? `\nSELECTED FORMAT: ${format}` : ''}\n\nAnalyze this idea and generate the core project metadata and initial critique. Evaluate if GOOD TO GO or NEEDS WORK.`,
      jsonMode: true,
      structuredOutput: 'initialProject',
    });
  },

  async brainstormDual(userInput: string, currentStory: string, currentMetadata: any) {
    return callGenericGemini({
      prompt: `User Input: ${userInput}\n\nCurrent Story: ${currentStory}\n\nCurrent Metadata: ${JSON.stringify(currentMetadata)}`,
      systemPrompt: 'You are a professional screenwriting consultant and pitch doctor. Provide critique and final pitch.',
      jsonMode: true,
      structuredOutput: 'brainstormDual',
    });
  },

  async generateCharacterViews(description: string) {
    return callGenericGemini({
      prompt: `Generate 4 consistent views (Front, Profile, Back, Full-shot) of a character based on this description: "${description}".`
    });
  },

  async deepDevelopCharacter(character: any, masterStory: string, otherCharacters: any[]) {
    return callGenericGemini({
      prompt: `Deeply develop character ${character.name} based on the Master Story: ${masterStory}. Other characters: ${JSON.stringify(otherCharacters.map(c => c.name))}`,
      jsonMode: true,
      structuredOutput: 'deepCharacter',
    });
  },

  async deepDevelopLocation(location: any, masterStory: string) {
    return callGenericGemini({
      prompt: `Deeply develop location ${location.name} based on the master story: ${masterStory}.`
    });
  },

  async generateStageInsight(stage: string, content: string, context: string) {
    if (!content || content.trim().length < 5) return { content: "Please start writing to generate insight.", isReady: false };
    return callGenericGemini({
      prompt: Prompts.STAGE_INSIGHT_PROMPT(stage, content, context),
      jsonMode: true,
      structuredOutput: 'stageInsight',
    });
  }

};

