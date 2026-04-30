import { callGenericGemini, callGenkitFlow } from './core';
import * as Prompts from './prompts';

export const scriptService = {
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

  async generateSynopsis(context: string): Promise<any> {
    if (!context || typeof context !== 'string' || context.trim().length < 50) return "Once the story is more developed, I will generate a full synopsis here.";
    return callGenkitFlow<any>('generateSynopsis', { context });
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
};
