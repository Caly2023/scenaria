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
    id: 'Project Metadata',
    name: 'Project Metadata',
    order: 0,
    collectionName: 'metadata_primitives', // Dummy or reserved
    agentId: 'metadata',
    primitiveTypes: ['metadata'],
    description: 'Set core project parameters: Title, Format, Genre, and Tone.',
    requires: [],
    triggers: 'Initial Draft',
    orderField: 'order',
  },
  {
    id: 'Initial Draft',
    name: 'Initial Draft',
    order: 1,
    collectionName: 'draft_primitives',
    agentId: 'draft',
    primitiveTypes: ['draft'],
    description: 'A raw, unfiltered starting point for the narrative.',
    requires: ['Project Metadata'],
    triggers: 'Brainstorming',
    orderField: 'order',
  },
  {
    id: 'Brainstorming',
    name: 'Brainstorming',
    order: 2,
    collectionName: 'pitch_primitives',
    agentId: 'brainstorming',
    primitiveTypes: ['brainstorming_result'],
    description: 'The interactive foundation and Source of Truth for all subsequent stages.',
    requires: ['Initial Draft'],
    triggers: 'Logline',
    orderField: 'order',
  },
  {
    id: 'Logline',
    name: 'Logline',
    order: 3,
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
    order: 4,
    collectionName: 'structure_primitives',
    agentId: 'structure',
    primitiveTypes: ['beat'],
    description: 'High-level 3-act narrative framework.',
    requires: ['Logline'],
    triggers: '8-Beat Structure',
    orderField: 'order',
  },
  {
    id: '8-Beat Structure',
    name: '8-Beat Structure',
    order: 5,
    collectionName: 'beat_primitives',
    agentId: 'beat_structure',
    primitiveTypes: ['beat'],
    description: 'Detailed 8-beat narrative framework (K.M. Weiland style).',
    requires: ['3-Act Structure'],
    triggers: 'Synopsis',
    orderField: 'order',
  },
  {
    id: 'Synopsis',
    name: 'Synopsis',
    order: 6,
    collectionName: 'synopsis_primitives',
    agentId: 'synopsis',
    primitiveTypes: ['synopsis'],
    description: 'Full narrative summary (~500 words).',
    requires: ['8-Beat Structure'],
    triggers: 'Character Bible',
    orderField: 'order',
  },
  {
    id: 'Character Bible',
    name: 'Character Bible',
    order: 7,
    collectionName: 'characters',
    agentId: 'character_bible',
    primitiveTypes: ['character'],
    description: 'Extracted and developed character profiles.',
    requires: ['Synopsis'],
    triggers: 'Location Bible',
    orderField: 'order',
  },
  {
    id: 'Location Bible',
    name: 'Location Bible',
    order: 8,
    collectionName: 'locations',
    agentId: 'location_bible',
    primitiveTypes: ['location'],
    description: 'Extracted and developed setting profiles.',
    requires: ['Character Bible'],
    triggers: 'Treatment',
    orderField: 'order',
  },
  {
    id: 'Treatment',
    name: 'Treatment',
    order: 9,
    collectionName: 'treatment_sequences',
    agentId: 'treatment',
    primitiveTypes: ['treatment_section'],
    description: 'Dense cinematic prose narrative with high visual detail.',
    requires: ['Synopsis', 'Character Bible', 'Location Bible'],
    triggers: 'Step Outline',
    orderField: 'order',
  },
  {
    id: 'Step Outline',
    name: 'Step Outline',
    order: 10,
    collectionName: 'sequences',
    agentId: 'step_outline',
    primitiveTypes: ['scene_outline'],
    description: 'Technical scene-by-scene breakdown with sluglines.',
    requires: ['Treatment'],
    triggers: 'Script',
    orderField: 'order',
  },
  {
    id: 'Script',
    name: 'Script',
    order: 11,
    collectionName: 'script_scenes',
    agentId: 'script',
    primitiveTypes: ['script_scene'],
    description: 'Final professional screenplay with action and dialogue.',
    requires: ['Step Outline'],
    triggers: 'Global Script Doctoring',
    orderField: 'order',
  },
  {
    id: 'Global Script Doctoring',
    name: 'Global Script Doctoring',
    order: 12,
    collectionName: 'doctoring_primitives',
    agentId: 'script_doctor',
    primitiveTypes: ['analysis'],
    description: 'Advanced polish and consistency check for the entire script.',
    requires: ['Script'],
    triggers: 'Technical Breakdown',
    orderField: 'order',
  },
  {
    id: 'Technical Breakdown',
    name: 'Technical Breakdown',
    order: 13,
    collectionName: 'breakdown_primitives',
    agentId: 'technical_breakdown',
    primitiveTypes: ['breakdown'],
    description: 'Identification of props, costumes, and technical requirements.',
    requires: ['Script'],
    triggers: 'Visual Assets',
    orderField: 'order',
  },
  {
    id: 'Visual Assets',
    name: 'Visual Assets',
    order: 14,
    collectionName: 'asset_primitives',
    agentId: 'visual_assets',
    primitiveTypes: ['asset'],
    description: 'Generation of character and location concept art.',
    requires: ['Character Bible', 'Location Bible'],
    triggers: 'AI Previs',
    orderField: 'order',
  },
  {
    id: 'AI Previs',
    name: 'AI Previs',
    order: 15,
    collectionName: 'previs_primitives',
    agentId: 'previs',
    primitiveTypes: ['previs_clip'],
    description: 'AI-generated visual previews of key scenes.',
    requires: ['Visual Assets', 'Step Outline'],
    triggers: 'Production Export',
    orderField: 'order',
  },
  {
    id: 'Production Export',
    name: 'Production Export',
    order: 16,
    collectionName: 'export_primitives',
    agentId: 'export',
    primitiveTypes: ['export_package'],
    description: 'Final assembly of all production-ready documents.',
    requires: ['Script', 'Technical Breakdown', 'Visual Assets'],
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
