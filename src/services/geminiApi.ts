import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { geminiService } from './geminiService';
import type { ScriptGenerationContext } from './ai/prompts';

export const geminiApi = createApi({
  reducerPath: 'geminiApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    generateLoglineDraft: builder.mutation<string, string>({
      queryFn: async (brainstorming) => {
        try {
          const result = await geminiService.generateLoglineDraft(brainstorming);
          return { data: result as string };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),
    generate3ActStructure: builder.mutation<string, { brainstorming: string; logline: string }>({
      queryFn: async ({ brainstorming, logline }) => {
        try {
          const context = `Brainstorming:\n${brainstorming}\n\nLogline:\n${logline}`;
          const result = await geminiService.generate3ActStructure(context);
          return { data: result as string };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),
    generateSynopsis: builder.mutation<string, { brainstorming: string; structure: string }>({
      queryFn: async ({ brainstorming, structure }) => {
        try {
          const context = `Brainstorming:\n${brainstorming}\n\n3-Act Structure:\n${structure}`;
          const result = await geminiService.generateSynopsis(context);
          return { data: result as string };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),
    extractCharactersAndSettings: builder.mutation<{ characters: any[]; settings: any[] }, string>({
      queryFn: async (brainstorming) => {
        try {
          const result = await geminiService.extractCharactersAndSettings(brainstorming);
          return { data: result as { characters: any[]; settings: any[] } };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),
    generateTreatment: builder.mutation<string, string>({
      queryFn: async (prompt) => {
        try {
          const result = await geminiService.generateTreatment(prompt);
          return { data: result as string };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),
    generateInitialSequences: builder.mutation<any[], { treatmentText: string; format: string; characters: any[]; locations: any[] }>({
      queryFn: async ({ treatmentText, format, characters, locations }) => {
        try {
          const result = await geminiService.generateInitialSequences(treatmentText, format, characters, locations);
          return { data: result as any[] };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),
    generateFullScript: builder.mutation<string, ScriptGenerationContext>({
      queryFn: async (scriptCtx) => {
        try {
          const result = await geminiService.generateFullScript(scriptCtx);
          return { data: result as string };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    })
  })
});

export const {
  useGenerateLoglineDraftMutation,
  useGenerate3ActStructureMutation,
  useGenerateSynopsisMutation,
  useExtractCharactersAndSettingsMutation,
  useGenerateTreatmentMutation,
  useGenerateInitialSequencesMutation,
  useGenerateFullScriptMutation
} = geminiApi;
