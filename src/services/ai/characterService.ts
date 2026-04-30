import { callGenericGemini, callGenkitFlow } from './core';

export const characterService = {
  async extractCharactersAndSettings(context: string): Promise<any> {
    return callGenkitFlow<any>('extractCharacters', { brainstorming: context });
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
};
