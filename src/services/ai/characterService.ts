import { callGenericGemini, callGenkitFlow } from './core';

export const characterService = {
  async extractCharactersAndSettings(context: string): Promise<unknown> {
    return callGenkitFlow<unknown>('extractCharacters', { brainstorming: context });
  },

  async generateCharacterViews(description: string): Promise<unknown> {
    return callGenericGemini<unknown>({
      prompt: `Generate 4 consistent views (Front, Profile, Back, Full-shot) of a character based on this description: "${description}".`
    });
  },

  async deepDevelopCharacter(character: { name: string }, masterStory: string, otherCharacters: { name: string }[]): Promise<unknown> {
    return callGenericGemini<unknown>({
      prompt: `Deeply develop character ${character.name} based on the Master Story: ${masterStory}. Other characters: ${JSON.stringify(otherCharacters.map(c => c.name))}`,
      jsonMode: true,
      structuredOutput: 'deepCharacter',
    });
  },
};
