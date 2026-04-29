import { WorkflowStage } from '../types';

/**
 * STAGE REGISTRY — Single Source of Truth for all stage definitions.
 */

export type StageCategory = 'METADATA' | 'DRAFT' | 'FOUNDATION' | 'BIBLE' | 'NARRATIVE' | 'PRODUCTION';

export interface StageDefinition {
  id: WorkflowStage;
  /** Display name key for i18n */
  name: string;
  order: number;
  category: StageCategory;
  collectionName: string;
  agentId: string;
  primitiveTypes: string[];
  /** Description key for i18n */
  description: string;
  hydrationLabel?: string;
  requires: WorkflowStage[];
  triggers?: WorkflowStage;
  orderField: string;
  isCustom?: boolean;
}

const STAGES: StageDefinition[] = [
  {
    id: 'Project Metadata',
    name: 'Project Metadata',
    order: 0,
    category: 'METADATA',
    collectionName: 'metadata_primitives',
    agentId: 'metadata',
    primitiveTypes: ['metadata'],
    description: 'Define the core parameters of your project.',
    hydrationLabel: 'Syncing project DNA...',
    requires: [],
    triggers: 'Initial Draft',
    orderField: 'order',
    isCustom: true
  },
  {
    id: 'Initial Draft',
    name: 'Initial Draft',
    order: 1,
    category: 'DRAFT',
    collectionName: 'draft_primitives',
    agentId: 'draft',
    primitiveTypes: ['draft'],
    description: 'Paste your initial idea or premise here.',
    hydrationLabel: 'Initializing Spark...',
    requires: ['Project Metadata'],
    triggers: 'Brainstorming',
    orderField: 'order',
  },
  {
    id: 'Brainstorming',
    name: 'Brainstorming',
    order: 2,
    category: 'FOUNDATION',
    collectionName: 'pitch_primitives',
    agentId: 'brainstorming',
    primitiveTypes: ['brainstorming_result'],
    description: 'Explore narrative and thematic possibilities.',
    hydrationLabel: 'Brainstorming possibilities...',
    requires: ['Initial Draft'],
    triggers: 'Logline',
    orderField: 'order',
  },
  {
    id: 'Logline',
    name: 'Logline',
    order: 3,
    category: 'FOUNDATION',
    collectionName: 'logline_primitives',
    agentId: 'logline',
    primitiveTypes: ['logline'],
    description: 'Summarize your story in one punchy sentence.',
    hydrationLabel: 'Synthesizing Logline...',
    requires: ['Brainstorming'],
    triggers: '3-Act Structure',
    orderField: 'order',
  },
  {
    id: '3-Act Structure',
    name: '3-Act Structure',
    order: 4,
    category: 'FOUNDATION',
    collectionName: 'structure_primitives',
    agentId: 'structure',
    primitiveTypes: ['beat'],
    description: 'Define the dramatic backbone of your story.',
    hydrationLabel: 'Architecting 3-Act Structure...',
    requires: ['Logline'],
    triggers: '8-Beat Structure',
    orderField: 'order',
  },
  {
    id: '8-Beat Structure',
    name: '8-Beat Structure',
    order: 5,
    category: 'FOUNDATION',
    collectionName: 'structure_primitives',
    agentId: 'structure',
    primitiveTypes: ['beat'],
    description: 'Break down your story into eight essential moments.',
    hydrationLabel: 'Developing 8 dramatic beats...',
    requires: ['3-Act Structure'],
    triggers: 'Synopsis',
    orderField: 'order',
  },
  {
    id: 'Synopsis',
    name: 'Synopsis',
    order: 6,
    category: 'FOUNDATION',
    collectionName: 'synopsis_primitives',
    agentId: 'synopsis',
    primitiveTypes: ['synopsis'],
    description: 'A detailed summary of your story arc and themes.',
    hydrationLabel: 'Expanding into full Synopsis...',
    requires: ['8-Beat Structure'],
    triggers: 'Character Bible',
    orderField: 'order',
  },
  {
    id: 'Character Bible',
    name: 'Character Bible',
    order: 7,
    category: 'BIBLE',
    collectionName: 'characters',
    agentId: 'character_bible',
    primitiveTypes: ['character'],
    description: 'Define your characters and their visual identity.',
    hydrationLabel: 'Extracting Characters & Locations...',
    requires: ['Synopsis'],
    triggers: 'Location Bible',
    orderField: 'order',
    isCustom: true
  },
  {
    id: 'Location Bible',
    name: 'Location Bible',
    order: 8,
    category: 'BIBLE',
    collectionName: 'locations',
    agentId: 'location_bible',
    primitiveTypes: ['location'],
    description: 'Define your locations and their atmosphere.',
    hydrationLabel: 'Extracting Characters & Locations...',
    requires: ['Character Bible'],
    triggers: 'Treatment',
    orderField: 'order',
    isCustom: true
  },
  {
    id: 'Treatment',
    name: 'Treatment',
    order: 9,
    category: 'NARRATIVE',
    collectionName: 'treatment_primitives',
    agentId: 'treatment',
    primitiveTypes: ['treatment'],
    description: 'A detailed narrative version of your screenplay.',
    hydrationLabel: 'Generating Cinematic Treatment...',
    requires: ['Location Bible'],
    triggers: 'Step Outline',
    orderField: 'order',
  },
  {
    id: 'Step Outline',
    name: 'Step Outline',
    order: 10,
    category: 'NARRATIVE',
    collectionName: 'sequences',
    agentId: 'step_outline',
    primitiveTypes: ['sequence'],
    description: 'Scene-by-scene breakdown of your story.',
    hydrationLabel: 'Sequencing the narrative...',
    requires: ['Treatment'],
    triggers: 'Script',
    orderField: 'order',
    isCustom: true
  },
  {
    id: 'Script',
    name: 'Script',
    order: 11,
    category: 'NARRATIVE',
    collectionName: 'script_primitives',
    agentId: 'script',
    primitiveTypes: ['script_scene'],
    description: 'Professional formatting and dialogue.',
    hydrationLabel: 'Writing Full Script...',
    requires: ['Step Outline'],
    triggers: 'Global Script Doctoring',
    orderField: 'order',
  },
  {
    id: 'Global Script Doctoring',
    name: 'Global Script Doctoring',
    order: 12,
    category: 'PRODUCTION',
    collectionName: 'script_primitives',
    agentId: 'script',
    primitiveTypes: ['script_scene'],
    description: 'Full screenplay review for consistency and quality.',
    hydrationLabel: 'Analyzing Script Integrity...',
    requires: ['Script'],
    triggers: 'Technical Breakdown',
    orderField: 'order',
  },
  {
    id: 'Technical Breakdown',
    name: 'Technical Breakdown',
    order: 13,
    category: 'PRODUCTION',
    collectionName: 'breakdown_primitives',
    agentId: 'script',
    primitiveTypes: ['breakdown'],
    description: 'Transform scenes into technical shots.',
    hydrationLabel: 'Generating Production Breakdown...',
    requires: ['Global Script Doctoring'],
    triggers: 'Visual Assets',
    orderField: 'order',
  },
  {
    id: 'Visual Assets',
    name: 'Visual Assets',
    order: 14,
    category: 'PRODUCTION',
    collectionName: 'asset_primitives',
    agentId: 'character_bible',
    primitiveTypes: ['asset'],
    description: 'Generate multi-angle characters and environments.',
    hydrationLabel: 'Generating Cinematic Assets...',
    requires: ['Technical Breakdown'],
    triggers: 'AI Previs',
    orderField: 'order',
  },
  {
    id: 'AI Previs',
    name: 'AI Previs',
    order: 15,
    category: 'PRODUCTION',
    collectionName: 'previs_primitives',
    agentId: 'logline',
    primitiveTypes: ['previs'],
    description: 'Preview your script with AI-generated storyboards.',
    hydrationLabel: 'Generating AI Previs...',
    requires: ['Visual Assets'],
    triggers: 'Production Export',
    orderField: 'order',
  },
  {
    id: 'Production Export',
    name: 'Production Export',
    order: 16,
    category: 'PRODUCTION',
    collectionName: 'export_primitives',
    agentId: 'logline',
    primitiveTypes: ['export'],
    description: 'Download finalized script and assets.',
    hydrationLabel: 'Preparing Production Export...',
    requires: ['AI Previs'],
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

  /** Get the category for a stage */
  getCategory(stageId: WorkflowStage | string): StageCategory {
    return this.get(stageId).category;
  }

  /** Get all stages that use a given collection name */
  getByCollection(collectionName: string): StageDefinition | undefined {
    return this._ordered.find(s => s.collectionName === collectionName);
  }

  /** Get unique collection names for all stages */
  getAllCollectionNames(): string[] {
    return Array.from(new Set(this._ordered.map(s => s.collectionName)));
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
export const STAGE_LIST = stageRegistry.getAll();
