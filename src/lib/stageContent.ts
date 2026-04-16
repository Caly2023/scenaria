import { Character, Location, Sequence, WorkflowStage } from '../types';
import { ContentPrimitive } from '../types/stageContract';

type StageSourceCollections = {
  pitchPrimitives: Sequence[];
  loglinePrimitives: Sequence[];
  structurePrimitives: Sequence[];
  synopsisPrimitives: Sequence[];
  characters: Character[];
  locations: Location[];
  treatmentSequences: Sequence[];
  sequences: Sequence[];
  scriptScenes: Sequence[];
};

function mapSequencePrimitive(sequence: Sequence, primitiveType: string): ContentPrimitive {
  return {
    id: sequence.id,
    title: sequence.title,
    content: sequence.content,
    primitiveType,
    order: sequence.order,
    metadata: {
      projectId: sequence.projectId,
      characterIds: sequence.characterIds,
      locationIds: sequence.locationIds,
    },
  };
}

function mapCharacterPrimitive(character: Character, index: number): ContentPrimitive {
  return {
    id: character.id,
    title: character.name,
    content: character.description,
    primitiveType: 'character',
    order: index,
    visualPrompt: character.visualPrompt,
    metadata: {
      role: character.role,
      tier: character.tier,
      views: character.views,
      deepDevelopment: character.deepDevelopment,
    },
  };
}

function mapLocationPrimitive(location: Location, index: number): ContentPrimitive {
  return {
    id: location.id,
    title: location.name,
    content: location.description,
    primitiveType: 'location',
    order: index,
    visualPrompt: location.visualPrompt,
    metadata: {
      atmosphere: location.atmosphere,
    },
  };
}

export function getStageContentPrimitives(
  stage: WorkflowStage,
  collections: StageSourceCollections,
): ContentPrimitive[] {
  switch (stage) {
    case 'Brainstorming':
      return collections.pitchPrimitives.map((item) =>
        mapSequencePrimitive(item, 'brainstorming_result'),
      );
    case 'Logline':
      return collections.loglinePrimitives.map((item) => mapSequencePrimitive(item, 'logline'));
    case '3-Act Structure':
      return collections.structurePrimitives.map((item) => mapSequencePrimitive(item, 'beat'));
    case 'Synopsis':
      return collections.synopsisPrimitives.map((item) => mapSequencePrimitive(item, 'synopsis'));
    case 'Character Bible':
      return collections.characters.map(mapCharacterPrimitive);
    case 'Location Bible':
      return collections.locations.map(mapLocationPrimitive);
    case 'Treatment':
      return collections.treatmentSequences.map((item) => mapSequencePrimitive(item, 'sequence'));
    case 'Step Outline':
      return collections.sequences.map((item) => mapSequencePrimitive(item, 'sequence'));
    case 'Script':
      return collections.scriptScenes.map((item) => mapSequencePrimitive(item, 'scene'));
    case 'Storyboard':
      return [];
  }
}

export function buildStageContentsMap(collections: StageSourceCollections): Record<string, ContentPrimitive[]> {
  return {
    Brainstorming: getStageContentPrimitives('Brainstorming', collections),
    Logline: getStageContentPrimitives('Logline', collections),
    '3-Act Structure': getStageContentPrimitives('3-Act Structure', collections),
    Synopsis: getStageContentPrimitives('Synopsis', collections),
    'Character Bible': getStageContentPrimitives('Character Bible', collections),
    'Location Bible': getStageContentPrimitives('Location Bible', collections),
    Treatment: getStageContentPrimitives('Treatment', collections),
    'Step Outline': getStageContentPrimitives('Step Outline', collections),
    Script: getStageContentPrimitives('Script', collections),
  };
}
