import { aiQuotaState, aiQuotaNoticeConsumed } from "./serviceState";
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

/**
 * STREAMING GENKIT FLOW HELPER
 * Calls a Genkit flow and yields chunks of text as they arrive.
 */
async function* streamGenkitFlow<T>(flowName: string, input: any): AsyncGenerator<{ chunk?: string, final?: any }> {
  const url = `/api/genkit/${flowName}`;
  console.log(`[GeminiService] Streaming ${url}...`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream' 
      },
      body: JSON.stringify({ ...input, stream: true }),
    });
  } catch (error: any) {
    console.error(`[GeminiService] Stream connection failed for ${flowName}:`, error);
    if (error?.message === 'Failed to fetch') {
      throw new Error(`Connection failed: The AI server at ${url} is unreachable (network/CORS/deployment issue).`);
    }
    throw error;
  }

  if (!response.ok) {
    let errorMsg = `Stream Error (${flowName}): ${response.status} ${response.statusText}`;
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
    } catch {
      // Fallback
    }
    console.error(`[GeminiService] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error('No body in response');

  // pendingBuffer: only keeps a small tail to detect [DONE] split across network chunks.
  // This is intentionally separate from the yielded chunks — the caller accumulates those.
  let pendingBuffer = '';
  // The max length of '[DONE]' is 6 chars, so keeping the last 10 chars is always enough
  // to detect a split across two reads.
  const DONE_MARKER = '[DONE]';
  const TAIL_SIZE = DONE_MARKER.length + 4; // safe margin
  let isDoneSeen = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      pendingBuffer += text;

      if (!isDoneSeen) {
        // Check if we have a full [DONE] marker
        if (pendingBuffer.includes(DONE_MARKER)) {
          isDoneSeen = true;
          const parts = pendingBuffer.split(DONE_MARKER);
          
          // Everything before [DONE] (or multiples if they happen) are chunks
          for (let i = 0; i < parts.length - 1; i++) {
            if (parts[i]) yield { chunk: parts[i] };
          }
          // The remainder is the JSON that follows [DONE]
          pendingBuffer = parts[parts.length - 1];
        } else {
          // [DONE] not yet seen — yield a safe portion
          if (pendingBuffer.length > TAIL_SIZE) {
            const safeChunk = pendingBuffer.slice(0, pendingBuffer.length - TAIL_SIZE);
            yield { chunk: safeChunk };
            pendingBuffer = pendingBuffer.slice(pendingBuffer.length - TAIL_SIZE);
          }
        }
      }

      // If we've seen [DONE], everything now is part of the final JSON payload
      if (isDoneSeen) {
        if (pendingBuffer.trim()) {
          try {
            const finalResult = JSON.parse(pendingBuffer.trim());
            yield { final: finalResult };
            pendingBuffer = ''; // Fully processed
            break;
          } catch (e) {
            // It's partial JSON, keep it in buffer in case more network chunks arrive
            continue; 
          }
        }
      }
    }

    // Flush any remaining buffer if stream ended unexpectedly
    if (!isDoneSeen && pendingBuffer && !pendingBuffer.includes(DONE_MARKER)) {
      yield { chunk: pendingBuffer };
    } else if (isDoneSeen && pendingBuffer.trim()) {
      try {
        const finalResult = JSON.parse(pendingBuffer.trim());
        yield { final: finalResult };
      } catch (e) {
        console.warn('[GeminiService] Failed to parse final result after stream ended:', e, 'Raw:', pendingBuffer);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * GENERIC STREAM HELPER
 */
function streamGenericGemini(prompt: string, systemPrompt?: string) {
  return streamGenkitFlow<any>('genericGemini', { prompt, systemPrompt });
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
  async scriptDoctorAgent(messages: any[], context: string, activeStage: string, complexity: 'simple' | 'moderate' | 'complex' = 'moderate', idMapContext: string = '') {
    return callGenkitFlow<any>('scriptDoctor', {
      messages,
      context,
      activeStage,
      complexity,
      idMapContext
    });
  },

  streamScriptDoctorAgent(messages: any[], context: string, activeStage: string, complexity: 'simple' | 'moderate' | 'complex' = 'moderate', idMapContext: string = '') {
    return streamGenkitFlow<any>('scriptDoctor', {
      messages,
      context,
      activeStage,
      complexity,
      idMapContext
    });
  },


  async analyzeScript(content: string, stage: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Analyze the following content for the "${stage}" stage of screenwriting. Provide expert feedback on structure, dialogue, and character development.\n\nContent:\n${content}`,
      systemPrompt: 'You are a professional script doctor.'
    });
  },

  analyzeScriptStream(content: string, stage: string) {
    return streamGenkitFlow<any>('genericGemini', {
      prompt: `Analyze the following content for the "${stage}" stage of screenwriting. Provide expert feedback on structure, dialogue, and character development.\n\nContent:\n${content}`,
      systemPrompt: 'You are a professional script doctor.'
    });
  },


  async rewriteSequence(content: string, instruction: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Rewrite the following script sequence based on this instruction: "${instruction}". Maintain the tone and style of the original.\n\nOriginal:\n${content}`
    });
  },

  rewriteSequenceStream(content: string, instruction: string) {
    return streamGenkitFlow<any>('genericGemini', {
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

    return callGenkitFlow<any>('genericGemini', {
      prompt,
      jsonMode: true,
      structuredOutput: 'sequenceArray',
    });
  },


  async brainstormFeedback(content: string) {
    if (!content || content.trim().length < 10) return "Please provide more details for brainstorming analysis.";
    
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Help organize chaotic thoughts, identify core themes, and suggest interesting directions for these ideas:\n\n${content}`,
      systemPrompt: 'You are a professional screenwriting consultant and sounding board.'
    });
  },


  async generateLoglineDraft(brainstorming: string) {
    if (!brainstorming || brainstorming.trim().length < 20) return "Based on your brainstorming, I will draft a logline here once you provide more details.";

    return callGenkitFlow<any>('genericGemini', {
      prompt: `Synthesize a professional 1-2 sentence logline from this brainstorming session:\n\n${brainstorming}`,
      systemPrompt: 'You are a professional screenwriter. Focus on protagonist, goal, and conflict.'
    });
  },


  async generateSynopsis(brainstorming: string, structure: string) {
    if (!brainstorming || brainstorming.trim().length < 20) return "Once the story is more developed, I will generate a full synopsis here.";
    return callGenkitFlow<any>('generateSynopsis', { brainstorming, structure });
  },

  async extractCharactersAndSettings(brainstorming: string) {
    return callGenkitFlow<any>('extractCharacters', { brainstorming });
  },

  async generate3ActStructure(brainstorming: string, logline: string) {
    return callGenkitFlow<any>('generate3ActStructure', { brainstorming, logline });
  },

  async refine3ActStructure(currentStructure: string, feedback: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Refine the following 8-beat 3-Act Structure based on this feedback: "${feedback}". Maintain the 8-beat framework. Output in JSON format.\n\nCurrent Structure:\n${currentStructure}`,
      jsonMode: true,
      structuredOutput: 'threeActStructure',
    });
  },

  async generateTreatment(context: string) {
    return callGenkitFlow<any>('genericGemini', { 
      prompt: Prompts.TREATMENT_PROMPT(context),
      jsonMode: true,
      structuredOutput: 'sequenceArray',
    });
  },

  async generateFullScript(scriptCtx: Prompts.ScriptGenerationContext) {
    return callGenkitFlow<any>('generateFullScript', scriptCtx);
  },

  async generateStepOutline(treatment: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Convert the following treatment into a professional Step Outline (Séquencier). Provide scene-by-scene breakdown including Sluglines (INT/EXT - LOCATION - TIME).\n\nOutput a JSON array:\n\nTreatment:\n${treatment}`,
      jsonMode: true,
      structuredOutput: 'sequenceArray',
    });
  },

  async rewriteSequenceWithContext(prompt: string) {
    return callGenkitFlow<any>('genericGemini', { prompt });
  },

  async generateScriptWithContext(prompt: string) {
    return callGenkitFlow<any>('genericGemini', { prompt });
  },

  async refineLoglineDraft(currentLogline: string, feedback: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Refine the following logline draft based on this feedback: "${feedback}".\n\nCurrent Logline:\n${currentLogline}`,
      systemPrompt: 'The logline must strictly be a 1-2 sentence description that hooks the audience, focusing on the protagonist, their goal, and the central conflict.'
    });
  },

  async extractMetadata(text: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Analyze the following story idea and extract project metadata. If a field is not explicitly mentioned, infer the most likely value based on the context.\n\nStory Idea:\n${text}`,
      jsonMode: true,
      structuredOutput: 'metadata',
    });
  },

  async initializeProjectAgent(storyDraft: string, format?: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `INITIAL STORY IDEA: ${storyDraft}${format ? `\nSELECTED FORMAT: ${format}` : ''}\n\nAnalyze this idea and generate the core project metadata and initial critique. Evaluate if GOOD TO GO or NEEDS WORK.`,
      jsonMode: true,
      structuredOutput: 'initialProject',
    });
  },

  async brainstormDual(userInput: string, currentStory: string, currentMetadata: any) {
    const safeInput = userInput.replace(/(ignore\s+(all\s+)?(previous\s+)?(instructions|rules|prompts)|override\s+system|system\s+prompt|bypass\s+rules)/gi, '[REDACTED]');
    return callGenkitFlow<any>('genericGemini', {
      prompt: `User Input: ${safeInput}\n\nCurrent Story: ${currentStory}\n\nCurrent Metadata: ${JSON.stringify(currentMetadata)}`,
      systemPrompt: 'You are a professional screenwriting consultant and pitch doctor. Provide critique and final pitch.',
      jsonMode: true,
      structuredOutput: 'brainstormDual',
    });
  },

  async suggestProjectTitle(storyDump: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Based on this story dump, suggest a short, catchy, professional title. Return ONLY the title.\n\nStory Dump:\n${storyDump}`
    });
  },

  async generateCharacterViews(description: string) {
    // Character views might need specialized handling or just generic for now
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Generate 4 consistent views (Front, Profile, Back, Full-shot) of a character based on this description: "${description}".`
    });
  },

  async deepDevelopCharacter(character: any, masterStory: string, otherCharacters: any[]) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Deeply develop character ${character.name} based on the Master Story: ${masterStory}. Other characters: ${JSON.stringify(otherCharacters.map(c => c.name))}`,
      jsonMode: true,
      structuredOutput: 'deepCharacter',
    });
  },

  async deepDevelopLocation(location: any, masterStory: string) {
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Deeply develop location ${location.name} based on the master story: ${masterStory}.`
    });
  },

  async generateStageInsight(stage: string, content: string, projectContext: string) {
    if (!content || content.trim().length < 5) return { content: "Please start writing to generate insight.", isReady: false };
    return callGenkitFlow<any>('genericGemini', {
      prompt: `Analyze the current state of "${stage}". Context: ${projectContext}\n\nContent: ${content}`,
      jsonMode: true,
      structuredOutput: 'stageInsight',
    });
  }

};
