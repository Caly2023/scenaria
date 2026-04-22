/**
 * STAGE REGISTRY — Single Source of Truth for all stage definitions.
 *
 * ALL stages use Firestore subcollections.
 * No stage stores content in a root project field anymore.
 * Root-field data is migrated to subcollections on first project load.
 */

import { WorkflowStage } from '../types';

// ─── Stage Definition ─────────────────────────────────────────────────────────

export interface StageDefinition {
  /** Unique identifier — matches the WorkflowStage union type */
  id: WorkflowStage;
  /** Display name */
  name: string;
  /** Pipeline order: 0-indexed */
  order: number;
  /** Firestore subcollection name */
  collectionName: string;

  /** Agent identifier — matches agentRegistry key */
  agentId: string;
  /** Primitive type tags expected in this stage */
  primitiveTypes: string[];
  /** Human-readable description of this stage's purpose */
  description: string;
  /** Which stages must have content before this stage can auto-generate */
  requires: WorkflowStage[];
  /** Which stage to auto-trigger generation of after this one is validated */
  triggers?: WorkflowStage;
  /** Default order field used when querying the Firestore subcollection */
  orderField: string;
}

// ─── Registry Definition ──────────────────────────────────────────────────────

const STAGES: StageDefinition[] = [
  {
    id: 'Brainstorming',
    name: 'Brainstorming',
    order: 0,
    collectionName: 'pitch_primitives',
    agentId: 'brainstorming',
    primitiveTypes: ['brainstorming_result'],
    description: 'The interactive foundation and Source of Truth for all subsequent stages.',
    requires: [],
    triggers: 'Logline',
    orderField: 'order',
  },
  {
    id: 'Logline',
    name: 'Logline',
    order: 1,
    collectionName: 'logline_primitives',

    agentId: 'logline',
    primitiveTypes: ['logline'],
    description: 'Concise 1-2 sentence description: Protagonist, Goal, Conflict.',
    requires: ['Brainstorming'],
    triggers: '3-Act Structure',
    orderField: 'order',
  },
  {
    id: '3-Act Structure',
    name: '3-Act Structure',
    order: 2,
    collectionName: 'structure_primitives',

    agentId: 'structure',
    primitiveTypes: ['beat'],
    description: '8-beat narrative framework (K.M. Weiland / StudioBinder style).',
    requires: ['Brainstorming', 'Logline', 'Character Bible'],
    triggers: 'Synopsis',
    orderField: 'order',
  },
  {
    id: 'Synopsis',
    name: 'Synopsis',
    order: 3,
    collectionName: 'synopsis_primitives',

    agentId: 'synopsis',
    primitiveTypes: ['synopsis'],
    description: 'Full narrative summary (~500 words).',
    requires: ['Brainstorming', '3-Act Structure', 'Character Bible'],
    triggers: 'Character Bible',
    orderField: 'order',
  },
  {
    id: 'Character Bible',
    name: 'Character Bible',
    order: 4,
    collectionName: 'characters',
    agentId: 'character_bible',
    primitiveTypes: ['character'],
    description: 'Extracted and developed character profiles.',
    requires: ['Brainstorming', 'Logline'],
    triggers: 'Location Bible',
    orderField: 'order',
  },
  {
    id: 'Location Bible',
    name: 'Location Bible',
    order: 5,
    collectionName: 'locations',
    agentId: 'location_bible',
    primitiveTypes: ['location'],
    description: 'Extracted and developed setting profiles.',
    requires: ['Brainstorming', 'Logline', 'Character Bible'],
    triggers: 'Treatment',
    orderField: 'order',
  },
  {
    id: 'Treatment',
    name: 'Treatment',
    order: 6,
    collectionName: 'treatment_sequences',
    agentId: 'treatment',
    primitiveTypes: ['treatment_section'],
    description: 'Dense cinematic prose narrative with high visual detail.',
    requires: ['Brainstorming', '3-Act Structure', 'Synopsis', 'Character Bible', 'Location Bible'],
    triggers: 'Step Outline',
    orderField: 'order',
  },
  {
    id: 'Step Outline',
    name: 'Step Outline',
    order: 7,
    collectionName: 'sequences',
    agentId: 'step_outline',
    primitiveTypes: ['scene_outline'],
    description: 'Technical scene-by-scene breakdown with sluglines.',
    requires: ['Treatment', 'Character Bible', 'Location Bible'],
    triggers: 'Script',
    orderField: 'order',
  },
  {
    id: 'Script',
    name: 'Script',
    order: 8,
    collectionName: 'script_scenes',
    agentId: 'script',
    primitiveTypes: ['script_scene'],
    description: 'Final professional screenplay with action and dialogue.',
    requires: ['3-Act Structure', 'Synopsis', 'Treatment', 'Character Bible', 'Location Bible'],
    triggers: 'Storyboard',
    orderField: 'order',
  },
  {
    id: 'Storyboard',
    name: 'Storyboard',
    order: 9,
    collectionName: 'storyboard_frames',
    agentId: 'storyboard',
    primitiveTypes: ['storyboard_frame'],
    description: 'Visual scene frames with image generation.',
    requires: ['Script'],
    orderField: 'order',
  },
];

// ─── Registry Class ───────────────────────────────────────────────────────────

class StageRegistry {
  private _stages: Map<WorkflowStage, StageDefinition>;
  private _ordered: StageDefinition[];

  constructor(stages: StageDefinition[]) {
    this._stages = new Map(stages.map(s => [s.id, s]));
    this._ordered = [...stages].sort((a, b) => a.order - b.order);
  }

  /** Get definition for a stage by ID. Throws if unknown. */
  get(stageId: WorkflowStage | string): StageDefinition {
    const def = this._stages.get(stageId as WorkflowStage);
    if (!def) throw new Error(`[StageRegistry] Unknown stage: "${stageId}"`);
    return def;
  }

  /** All stage definitions in pipeline order */
  getAll(): StageDefinition[] {
    return this._ordered;
  }

  /** All stage IDs in pipeline order */
  getAllIds(): WorkflowStage[] {
    return this._ordered.map(s => s.id);
  }

  /** Get the Firestore subcollection name for a stage */
  getCollectionName(stageId: WorkflowStage | string): string {
    return this.get(stageId).collectionName;
  }

  /** Get all stages that use a given collection name */
  getByCollection(collectionName: string): StageDefinition | undefined {
    return this._ordered.find(s => s.collectionName === collectionName);
  }

  /** Build the full subcollection → stageName map (e.g. for useScriptDoctor) */
  getSubcollectionMap(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const stage of this._ordered) {
      out[stage.id] = stage.collectionName;
    }
    return out;
  }

  /** Get the stage that triggers after this one */
  getTriggeredStage(stageId: WorkflowStage): WorkflowStage | undefined {
    return this.get(stageId).triggers;
  }

  /** Check if a stage's requirements are satisfied by the provided populated stages */
  requirementsMet(stageId: WorkflowStage, populatedStages: WorkflowStage[]): boolean {
    const def = this.get(stageId);
    return def.requires.every(req => populatedStages.includes(req));
  }

  /** Get the previous stage in the pipeline */
  getPrevious(stageId: WorkflowStage): StageDefinition | undefined {
    const def = this.get(stageId);
    return this._ordered.find(s => s.order === def.order - 1);
  }

  /** Get the next stage in the pipeline */
  getNext(stageId: WorkflowStage): StageDefinition | undefined {
    const def = this.get(stageId);
    return this._ordered.find(s => s.order === def.order + 1);
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const stageRegistry = new StageRegistry(STAGES);
