import type { Character, Location, Sequence, WorkflowStage } from '../types';
import type { ContentPrimitive } from '../types/stageContract';
import { stageRegistry } from '../config/stageRegistry';

/**
 * Raw Firestore data keyed by collection name.
 * useProjectData passes this directly — no aliasing required.
 */
export type RawCollections = Record<string, (Sequence | Character | Location)[]>;

// ── Primitive mappers ─────────────────────────────────────────────────────────

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

/**
 * Maps a single stage's raw Firestore documents to typed ContentPrimitives.
 *
 * The registry provides `collectionName` and `primitiveTypes[0]` for each stage.
 * Two special cases — Character Bible and Location Bible — use domain-specific mappers
 * because their documents have a different shape from the generic Sequence type.
 */
export function getStageContentPrimitives(
  stage: WorkflowStage,
  rawCollections: RawCollections,
): ContentPrimitive[] {
  const def = stageRegistry.get(stage);
  const items = rawCollections[def.collectionName] ?? [];
  const primitiveType = def.primitiveTypes[0] ?? 'unknown';

  if (stage === 'Character Bible') {
    return (items as Character[]).map(mapCharacterPrimitive);
  }
  if (stage === 'Location Bible') {
    return (items as Location[]).map(mapLocationPrimitive);
  }

  return (items as Sequence[]).map((item) => mapSequencePrimitive(item, primitiveType));
}

/**
 * Builds the full stage → ContentPrimitive[] map for all registered stages.
 * Automatically stays in sync when stages are added/removed from the registry.
 */
export function buildStageContentsMap(rawCollections: RawCollections): Record<string, ContentPrimitive[]> {
  return Object.fromEntries(
    stageRegistry.getAllIds().map((stage) => [stage, getStageContentPrimitives(stage, rawCollections)]),
  );
}
