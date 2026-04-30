import * as Prompts from "./ai/prompts";
import type { StageInsight } from "../types";
import { callGenericGemini, callGenkitFlow } from "./ai/core";
import { characterService } from "./ai/characterService";
import { scriptService } from "./ai/scriptService";

export const geminiService = {
  ...characterService,
  ...scriptService,

  async scriptDoctorAgent(messages: any[], context: string, activeStage: string, complexity: 'simple' | 'moderate' | 'complex' = 'moderate', idMapContext: string = '') {
    return callGenkitFlow<any>('scriptDoctor', {
      messages,
      context,
      activeStage,
      complexity,
      idMapContext
    });
  },

  async generateLoglineDraft(context: string): Promise<string> {
    if (!context || context.trim().length < 20) return "Based on your brainstorming, I will draft a logline here once you provide more details.";

    return callGenericGemini<string>({
      prompt: `Synthesize a professional 1-2 sentence logline from this project context:\n\n${context}`,
      systemPrompt: 'You are a professional screenwriter. Focus on protagonist, goal, and conflict.'
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

  // Redundant but kept for compatibility
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
};

