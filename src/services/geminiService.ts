import { aiQuotaState, aiQuotaNoticeConsumed } from "./serviceState";
import * as Prompts from "./ai/prompts";

/**
 * GENKIT FLOW HELPER
 * Calls the server-side Genkit API routes.
 */
async function callGenkitFlow<T>(flowName: string, input: any): Promise<T> {
  const response = await fetch(`/api/genkit/${flowName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to call flow ${flowName}`);
  }

  return response.json();
}



/** Reset quota state at the start of a new session. */
export function resetQuotaState() {
  aiQuotaState.set(false);
  aiQuotaNoticeConsumed.set(false);
}

/** Returns true only once — lets the UI show the notice exactly one time. */
export function consumeQuotaNotice(): boolean {
  if (aiQuotaState.get() && !aiQuotaNoticeConsumed.get()) {
    aiQuotaNoticeConsumed.set(true);
    return true;
  }
  return false;
}

// Unused resiliency helpers and model definitions removed in favor of Genkit server-side handling.


/**
 * Clean and parse JSON from model output, handling markdown fences.
 */
function safeJsonParse(text: string | null | undefined): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_e) {
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      console.error('[GeminiService] JSON Parse failed:', text);
      throw e2;
    }
  }
}

/**
 * Safely extract text from a model response, handling @google/genai SDK differences.
 * - v1.x: `.text` is a string property (getter), not a function.
 * - Legacy: `.text` could be a function.
 * - Always falls back to digging into candidates for robustness.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/**
 * Safely extract text from a model response.
 * (Now simpler as the server returns strings or parsed JSON)
 */
async function extractText(response: any): Promise<string> {
  if (typeof response === 'string') return response;
  if (response?.text) return response.text;
  return JSON.stringify(response);
}



export const geminiService = {
// eslint-disable-next-line @typesc  async scriptDoctorAgent(messages: any[], context: string, activeStage: string, complexity: 'simple' | 'moderate' | 'complex' = 'moderate', idMapContext: string = '') {
    return callGenkitFlow('scriptDoctor', {
      messages,
      context,
      activeStage,
      complexity,
      idMapContext
    });
  },
    }
    }

    return responseObj;
  },


  async analyzeScript(content: string, stage: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Analyze the following content for the "${stage}" stage of screenwriting. Provide expert feedback on structure, dialogue, and character development.\n\nContent:\n${content}`,
      systemPrompt: 'You are a professional script doctor.'
    });
  },


  async rewriteSequence(content: string, instruction: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Rewrite the following script sequence based on this instruction: "${instruction}". Maintain the tone and style of the original.\n\nOriginal:\n${content}`
    });
  },


  async generateInitialSequences(storyDump: string, format: string, availableCharacters: any[], availableLocations: any[]) {
    const prompt = `You are a professional screenwriter. Based on this story dump, generate 3-5 initial sequences for a ${format}. 
    Ensure the content follows professional screenwriting standards (sluglines, action, dialogue).
    
    For each sequence, identify which characters and locations from the provided lists are present.
    
    Available Characters:
    ${JSON.stringify(availableCharacters.map(c => ({ id: c.id, name: c.name })), null, 2)}
    
    Available Locations:
    ${JSON.stringify(availableLocations.map(l => ({ id: l.id, name: l.name })), null, 2)}
    
    Story Dump:
    ${storyDump}`;

    return callGenkitFlow('genericGemini', { prompt, jsonMode: true });
  },


  async brainstormFeedback(content: string) {
    if (!content || content.trim().length < 10) return "Please provide more details for brainstorming analysis.";
    
    return callGenkitFlow('genericGemini', {
      prompt: `Help organize chaotic thoughts, identify core themes, and suggest interesting directions for these ideas:\n\n${content}`,
      systemPrompt: 'You are a professional screenwriting consultant and sounding board.'
    });
  },


  async generateLoglineDraft(brainstorming: string) {
    if (!brainstorming || brainstorming.trim().length < 20) return "Based on your brainstorming, I will draft a logline here once you provide more details.";

    return callGenkitFlow('genericGemini', {
      prompt: `Synthesize a professional 1-2 sentence logline from this brainstorming session:\n\n${brainstorming}`,
      systemPrompt: 'You are a professional screenwriter. Focus on protagonist, goal, and conflict.'
    });
  },


  async generateSynopsis(brainstorming: string, structure: string) {
    if (!brainstorming || brainstorming.trim().length < 20) return "Once the story is more developed, I will generate a full synopsis here.";
    return callGenkitFlow('generateSynopsis', { brainstorming, structure });
  },

  async extractCharactersAndSettings(brainstorming: string) {
    return callGenkitFlow('extractCharacters', { brainstorming });
  },

  async generate3ActStructure(brainstorming: string, logline: string) {
    return callGenkitFlow('generate3ActStructure', { brainstorming, logline });
  },

  async refine3ActStructure(currentStructure: string, feedback: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Refine the following 8-beat 3-Act Structure based on this feedback: "${feedback}". Maintain the 8-beat framework. Output in JSON format.\n\nCurrent Structure:\n${currentStructure}`,
      jsonMode: true
    });
  },

  async generateTreatment(context: string) {
    return callGenkitFlow('genericGemini', { 
      prompt: Prompts.TREATMENT_PROMPT(context),
      jsonMode: true
    });
  },

  async generateFullScript(scriptCtx: Prompts.ScriptGenerationContext) {
    return callGenkitFlow('generateFullScript', scriptCtx);
  },

  async generateStepOutline(treatment: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Convert the following treatment into a professional Step Outline (Séquencier). Provide scene-by-scene breakdown including Sluglines (INT/EXT - LOCATION - TIME).\n\nOutput a JSON array:\n\nTreatment:\n${treatment}`,
      jsonMode: true
    });
  },

  async rewriteSequenceWithContext(prompt: string) {
    return callGenkitFlow('genericGemini', { prompt });
  },

  async generateScriptWithContext(prompt: string) {
    return callGenkitFlow('genericGemini', { prompt });
  },

  async refineLoglineDraft(currentLogline: string, feedback: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Refine the following logline draft based on this feedback: "${feedback}".\n\nCurrent Logline:\n${currentLogline}`,
      systemPrompt: 'The logline must strictly be a 1-2 sentence description that hooks the audience, focusing on the protagonist, their goal, and the central conflict.'
    });
  },

  async extractMetadata(text: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Analyze the following story idea and extract project metadata. If a field is not explicitly mentioned, infer the most likely value based on the context.\n\nStory Idea:\n${text}`,
      jsonMode: true
    });
  },

  async initializeProjectAgent(storyDraft: string, format?: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `INITIAL STORY IDEA: ${storyDraft}${format ? `\nSELECTED FORMAT: ${format}` : ''}\n\nAnalyze this idea and generate the core project metadata and initial critique. Evaluate if GOOD TO GO or NEEDS WORK.`,
      jsonMode: true
    });
  },

  async brainstormDual(userInput: string, currentStory: string, currentMetadata: any) {
    const safeInput = userInput.replace(/(ignore\s+(all\s+)?(previous\s+)?(instructions|rules|prompts)|override\s+system|system\s+prompt|bypass\s+rules)/gi, '[REDACTED]');
    return callGenkitFlow('genericGemini', {
      prompt: `User Input: ${safeInput}\n\nCurrent Story: ${currentStory}\n\nCurrent Metadata: ${JSON.stringify(currentMetadata)}`,
      systemPrompt: 'You are a professional screenwriting consultant and pitch doctor. Provide critique and final pitch.',
      jsonMode: true
    });
  },

  async suggestProjectTitle(storyDump: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Based on this story dump, suggest a short, catchy, professional title. Return ONLY the title.\n\nStory Dump:\n${storyDump}`
    });
  },

  async generateCharacterViews(description: string) {
    // Character views might need specialized handling or just generic for now
    return callGenkitFlow('genericGemini', {
      prompt: `Generate 4 consistent views (Front, Profile, Back, Full-shot) of a character based on this description: "${description}".`
    });
  },

  async deepDevelopCharacter(character: any, masterStory: string, otherCharacters: any[]) {
    return callGenkitFlow('genericGemini', {
      prompt: `Deeply develop character ${character.name} based on the Master Story: ${masterStory}. Other characters: ${JSON.stringify(otherCharacters.map(c => c.name))}`,
      jsonMode: true
    });
  },

  async deepDevelopLocation(location: any, masterStory: string) {
    return callGenkitFlow('genericGemini', {
      prompt: `Deeply develop location ${location.name} based on the master story: ${masterStory}.`
    });
  },

  async generateStageInsight(stage: string, content: string, projectContext: string) {
    if (!content || content.trim().length < 5) return { content: "Please start writing to generate insight.", isReady: false };
    return callGenkitFlow('genericGemini', {
      prompt: `Analyze the current state of "${stage}". Context: ${projectContext}\n\nContent: ${content}`,
      jsonMode: true
    });
  }

};
