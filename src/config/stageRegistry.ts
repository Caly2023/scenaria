import { WorkflowStage } from '../types';

/**
 * STAGE REGISTRY — Single Source of Truth for all stage definitions.
 */

type StageCategory = 'METADATA' | 'DRAFT' | 'FOUNDATION' | 'BIBLE' | 'NARRATIVE' | 'PRODUCTION';

export interface StageDefinition {
  id: WorkflowStage;
  /** Display name key for i18n */
  name: string;
  order: number;
  category: StageCategory;
  collectionName: string;
  primitiveTypes: string[];
  /** Description key for i18n */
  description: string;
  /** Lucide icon component */
  icon: any;
  /** Estimated time to complete (e.g. '5m', '1h') */
  estTime: string;
  hydrationLabel?: string;
  requires: WorkflowStage[];
  triggers?: WorkflowStage;
  orderField: string;
  isCustom?: boolean;
  displayMode?: 'list' | 'gallery' | 'canvas';
  prompts?: {
    magic?: string;
    generate?: string;
    refine?: string;
  };
}

import { 
  Zap, 
  LayoutGrid, 
  BookOpen, 
  FileText, 
  ListOrdered, 
  PenTool, 
  ImageIcon,
  Info,
  Edit3,
  Layers,
  MapPin,
  Bot,
  Cpu,
  Film,
  Share,
  Lightbulb
} from 'lucide-react';

const STAGES: StageDefinition[] = [
  {
    id: 'Discovery',
    name: 'Project Discovery',
    order: 0,
    category: 'METADATA',
    collectionName: 'discovery_primitives',
    primitiveTypes: ['discovery'],
    description: 'Conversational project intake and discovery.',
    icon: Lightbulb,
    estTime: '15m',
    hydrationLabel: 'Discovering project DNA...',
    requires: [],
    triggers: 'Project Brief',
    orderField: 'order',
    isCustom: true,
    displayMode: 'canvas',
    prompts: {
      magic: 'Refine the core project discovery context.',
      generate: 'Discover and extract core project metadata from conversation.'
    }
  },
  {
    id: 'Project Brief',
    name: 'Project Brief',
    order: 1,
    category: 'METADATA',
    collectionName: 'brief_primitives',
    primitiveTypes: ['metadata', 'logline', 'synopsis', 'production_notes'],
    description: 'The canonical source of truth for your project.',
    icon: FileText,
    estTime: '10m',
    hydrationLabel: 'Synthesizing Project Brief...',
    requires: ['Discovery'],
    triggers: 'Story Bible',
    orderField: 'order',
    prompts: {
      magic: 'Sharpen the project brief, ensuring consistency between logline, synopsis, and intent.',
      generate: 'Synthesize the discovery conversation into a professional project brief.'
    }
  },
  {
    id: 'Story Bible',
    name: 'Story Bible',
    order: 2,
    category: 'BIBLE',
    collectionName: 'bible_primitives',
    primitiveTypes: ['character', 'location'],
    description: 'Characters, locations, and the world of your story.',
    icon: BookOpen,
    estTime: '1h',
    hydrationLabel: 'Architecting the Story Bible...',
    requires: ['Project Brief'],
    triggers: 'Treatment',
    orderField: 'order',
    displayMode: 'gallery',
    prompts: {
      magic: 'Deepen character motivations and enrich the atmospheric details of your locations.',
      generate: 'Extract and develop the characters and locations from the project brief.'
    }
  },
  {
    id: 'Treatment',
    name: 'Treatment',
    order: 3,
    category: 'NARRATIVE',
    collectionName: 'treatment_primitives',
    primitiveTypes: ['treatment'],
    description: 'A detailed narrative version of your screenplay.',
    icon: PenTool,
    estTime: '2h',
    hydrationLabel: 'Generating Cinematic Treatment...',
    requires: ['Story Bible'],
    triggers: 'Sequencer',
    orderField: 'order',
    prompts: {
      magic: 'Refine the cinematic prose to better capture the tone and emotional flow.',
      generate: 'Generate a professional cinematic treatment that expands the brief into narrative prose.'
    }
  },
  {
    id: 'Sequencer',
    name: 'Sequencer',
    order: 4,
    category: 'NARRATIVE',
    collectionName: 'sequencer_primitives',
    primitiveTypes: ['sequence'],
    description: 'Scene-by-scene breakdown of your story.',
    icon: ListOrdered,
    estTime: '2h',
    hydrationLabel: 'Sequencing the narrative...',
    requires: ['Treatment'],
    triggers: 'Dialogue Continuity',
    orderField: 'order',
    displayMode: 'canvas',
    prompts: {
      magic: 'Rewrite this scene to be more dramatic and cinematic. Maintain continuity.'
    }
  },
  {
    id: 'Dialogue Continuity',
    name: 'Dialogue Continuity',
    order: 5,
    category: 'NARRATIVE',
    collectionName: 'dialogue_primitives',
    primitiveTypes: ['script_scene'],
    description: 'Full script with dialogues and formatting.',
    icon: Layers,
    estTime: 'Days',
    hydrationLabel: 'Writing Dialogue Continuity...',
    requires: ['Sequencer'],
    triggers: 'Final Screenplay',
    orderField: 'order',
    prompts: {
      magic: 'Polish the dialogue, pacing, and subtext to achieve professional standards.',
      generate: 'Convert the sequencer into a full continuity dialoguée with professional formatting.'
    }
  },
  {
    id: 'Final Screenplay',
    name: 'Final Screenplay',
    order: 6,
    category: 'NARRATIVE',
    collectionName: 'screenplay_primitives',
    primitiveTypes: ['script_scene'],
    description: 'The polished, production-ready screenplay.',
    icon: Film,
    estTime: '1h',
    hydrationLabel: 'Polishing Final Screenplay...',
    requires: ['Dialogue Continuity'],
    triggers: 'Technical Breakdown',
    orderField: 'order',
    prompts: {
      magic: 'Final polish of the screenplay for production readiness.',
      generate: 'Perform a comprehensive final polish of the dialogue continuity.'
    }
  },
  {
    id: 'Technical Breakdown',
    name: 'Technical Breakdown',
    order: 7,
    category: 'PRODUCTION',
    collectionName: 'breakdown_primitives',
    primitiveTypes: ['breakdown'],
    description: 'Transform scenes into technical shots.',
    icon: Cpu,
    estTime: '3h',
    hydrationLabel: 'Generating Production Breakdown...',
    requires: ['Final Screenplay'],
    orderField: 'order',
    prompts: {
      magic: 'Optimize shot composition and technical feasibility for every scene.',
      generate: 'Transform the screenplay into a technical shot list for production.'
    }
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

  /** Check if a stage exists */
  has(stageId: string): boolean {
    return this._stages.has(stageId as WorkflowStage);
  }

  /** Get definition for a stage by ID. Throws if unknown. */
  get(stageId: WorkflowStage | string): StageDefinition {
    let def = this._stages.get(stageId as WorkflowStage);
    
    if (!def) {
      // Fallback for AI occasionally using French translations or kebab-case instead of exact IDs
      const normalized = String(stageId).toLowerCase();
      if (normalized.includes('project brief') || normalized.includes('brief') || normalized.includes('metadata') || normalized.includes('logline') || normalized.includes('synopsis')) def = this._stages.get('Project Brief');
      else if (normalized.includes('story bible') || normalized.includes('bible') || normalized.includes('character') || normalized.includes('location')) def = this._stages.get('Story Bible');
      else if (normalized.includes('traitement') || normalized.includes('treatment')) def = this._stages.get('Treatment');
      else if (normalized.includes('sequencer') || normalized.includes('séquencier') || normalized.includes('step outline')) def = this._stages.get('Sequencer');
      else if (normalized.includes('dialogue continuity') || normalized.includes('continuity') || normalized.includes('dialogue') || normalized.includes('scénario') || normalized.includes('script')) def = this._stages.get('Dialogue Continuity');
      else if (normalized.includes('final screenplay') || normalized.includes('screenplay') || normalized.includes('polissage')) def = this._stages.get('Final Screenplay');
      else if (normalized.includes('technical breakdown') || normalized.includes('breakdown') || normalized.includes('découpage')) def = this._stages.get('Technical Breakdown');
      else if (normalized.includes('brouillon') || normalized.includes('discovery') || normalized.includes('exploration')) def = this._stages.get('Discovery');
    }

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

