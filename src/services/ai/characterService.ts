import { callGenericGemini, callGenkitFlow } from './core';

export const characterService = {
  async extractCharactersAndSettings(context: string): Promise<unknown> {
    return callGenkitFlow<unknown>('extractCharacters', { brainstorming: context });
  },

  async generateCharacterViews(description: string): Promise<string[]> {
    return callGenkitFlow<string[]>('generateCharacterImage', { prompt: description });
  },

  async deepDevelopCharacter(character: { name: string }, masterStory: string, otherCharacters: { name: string }[]): Promise<unknown> {
    return callGenericGemini<unknown>({
      prompt: `Deeply develop character ${character.name} based on the Master Story: ${masterStory}. Other characters: ${JSON.stringify(otherCharacters.map(c => c.name))}`,
      jsonMode: true,
      structuredOutput: 'deepCharacter',
    });
  },
};
