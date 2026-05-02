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
    id: 'Project Metadata',
    name: 'Project Metadata',
    order: 0,
    category: 'METADATA',
    collectionName: 'metadata_primitives',
    primitiveTypes: ['metadata'],
    description: 'Define the core parameters of your project.',
    icon: Info,
    estTime: '5m',
    hydrationLabel: 'Syncing project DNA...',
    requires: [],
    triggers: 'Initial Draft',
    orderField: 'order',
    isCustom: true,
    displayMode: 'canvas',
    prompts: {
      magic: 'Refine the core project metadata to ensure a solid foundation for the narrative.',
      generate: 'Initialize the project with industry-standard metadata based on your vision.'
    }
  },
  {
    id: 'Initial Draft',
    name: 'Initial Draft',
    order: 1,
    category: 'DRAFT',
    collectionName: 'draft_primitives',
    primitiveTypes: ['draft'],
    description: 'Paste your initial idea or premise here.',
    icon: Edit3,
    estTime: '10m',
    hydrationLabel: 'Initializing Spark...',
    requires: ['Project Metadata'],
    triggers: 'Brainstorming',
    orderField: 'order',
    prompts: {
      magic: 'Polish the initial spark to make the premise more compelling and clear.',
      generate: 'Draft a strong initial premise that defines the protagonist and core conflict.'
    }
  },
  {
    id: 'Brainstorming',
    name: 'Brainstorming',
    order: 2,
    category: 'FOUNDATION',
    collectionName: 'pitch_primitives',
    primitiveTypes: ['brainstorming_result'],
    description: 'Explore narrative and thematic possibilities.',
    icon: Lightbulb,
    estTime: '15m',
    hydrationLabel: 'Brainstorming possibilities...',
    requires: ['Initial Draft'],
    triggers: 'Logline',
    orderField: 'order',
    prompts: {
      magic: 'Expand the narrative possibilities and deepen the thematic resonance of your story ideas.',
      generate: 'Generate multiple creative directions and story options based on the initial draft.'
    }
  },
  {
    id: 'Logline',
    name: 'Logline',
    order: 3,
    category: 'FOUNDATION',
    collectionName: 'logline_primitives',
    primitiveTypes: ['logline'],
    description: 'Summarize your story in one punchy sentence.',
    icon: Zap,
    estTime: '5m',
    hydrationLabel: 'Synthesizing Logline...',
    requires: ['Brainstorming'],
    triggers: '3-Act Structure',
    orderField: 'order',
    prompts: {
      magic: 'Sharpen the hook and ensure the logline perfectly captures the protagonist, goal, and stakes.',
      generate: 'Synthesize the brainstorming results into one punchy, professional logline.'
    }
  },
  {
    id: '3-Act Structure',
    name: '3-Act Structure',
    order: 4,
    category: 'FOUNDATION',
    collectionName: 'structure_primitives',
    primitiveTypes: ['beat'],
    description: 'Define the dramatic backbone of your story.',
    icon: LayoutGrid,
    estTime: '30m',
    hydrationLabel: 'Architecting 3-Act Structure...',
    requires: ['Logline'],
    triggers: '8-Beat Structure',
    orderField: 'order',
    prompts: {
      magic: 'Strengthen the backbone by refining the inciting incident, midpoint, and climax.',
      generate: 'Architect a solid 3-act structure to define the primary narrative arc.'
    }
  },
  {
    id: '8-Beat Structure',
    name: '8-Beat Structure',
    order: 5,
    category: 'FOUNDATION',
    collectionName: 'beat_primitives',
    primitiveTypes: ['beat'],
    description: 'Break down your story into eight essential moments.',
    icon: Layers,
    estTime: '30m',
    hydrationLabel: 'Developing 8 dramatic beats...',
    requires: ['3-Act Structure'],
    triggers: 'Synopsis',
    orderField: 'order',
    prompts: {
      magic: 'Deepen the dramatic turns and emotional beats for maximum audience impact.',
      generate: 'Develop eight essential dramatic beats to flesh out the story structure.'
    }
  },
  {
    id: 'Synopsis',
    name: 'Synopsis',
    order: 6,
    category: 'FOUNDATION',
    collectionName: 'synopsis_primitives',
    primitiveTypes: ['synopsis'],
    description: 'A detailed summary of your story arc and themes.',
    icon: FileText,
    estTime: '45m',
    hydrationLabel: 'Expanding into full Synopsis...',
    requires: ['8-Beat Structure'],
    triggers: 'Character Bible',
    orderField: 'order',
    prompts: {
      magic: 'Enrich the narrative flow and thematic depth of the full story summary.',
      generate: 'Write a detailed synopsis that captures the full emotional and dramatic journey.'
    }
  },
  {
    id: 'Character Bible',
    name: 'Character Bible',
    order: 7,
    category: 'BIBLE',
    collectionName: 'characters',
    primitiveTypes: ['character'],
    description: 'Define your characters and their visual identity.',
    icon: BookOpen,
    estTime: '1h',
    hydrationLabel: 'Extracting Characters...',
    requires: ['Synopsis'],
    triggers: 'Location Bible',
    orderField: 'order',
    displayMode: 'gallery',
    prompts: {
      magic: 'Flesh out character depth, visual appearance, and emotional arcs.',
      generate: 'Extract and develop complex characters from the current story context.'
    }
  },
  {
    id: 'Location Bible',
    name: 'Location Bible',
    order: 8,
    category: 'BIBLE',
    collectionName: 'locations',
    primitiveTypes: ['location'],
    description: 'Define your locations and their atmosphere.',
    icon: MapPin,
    estTime: '30m',
    hydrationLabel: 'Extracting Locations...',
    requires: ['Character Bible'],
    triggers: 'Treatment',
    orderField: 'order',
    displayMode: 'gallery',
    prompts: {
      magic: 'Enhance atmospheric details and visual texture of your locations.',
      generate: 'Identify and build out key locations that serve the story’s mood.'
    }
  },
  {
    id: 'Treatment',
    name: 'Treatment',
    order: 9,
    category: 'NARRATIVE',
    collectionName: 'treatment_sequences',
    primitiveTypes: ['treatment'],
    description: 'A detailed narrative version of your screenplay.',
    icon: PenTool,
    estTime: '2h',
    hydrationLabel: 'Generating Cinematic Treatment...',
    requires: ['Location Bible'],
    triggers: 'Step Outline',
    orderField: 'order',
    prompts: {
      magic: 'Refine the cinematic prose to better capture the tone and emotional flow.',
      generate: 'Generate a professional cinematic treatment that expands the synopsis into narrative prose.'
    }
  },
  {
    id: 'Step Outline',
    name: 'Step Outline',
    order: 10,
    category: 'NARRATIVE',
    collectionName: 'sequences',
    primitiveTypes: ['sequence'],
    description: 'Scene-by-scene breakdown of your story.',
    icon: ListOrdered,
    estTime: '2h',
    hydrationLabel: 'Sequencing the narrative...',
    requires: ['Treatment'],
    triggers: 'Script',
    orderField: 'order',
    displayMode: 'canvas',
    prompts: {
      magic: 'Rewrite this scene to be more dramatic and cinematic. Maintain continuity with the previous and next scenes.'
    }
  },
  {
    id: 'Script',
    name: 'Script',
    order: 11,
    category: 'NARRATIVE',
    collectionName: 'script_scenes',
    primitiveTypes: ['script_scene'],
    description: 'Professional formatting and dialogue.',
    icon: FileText,
    estTime: 'Days',
    hydrationLabel: 'Writing Full Script...',
    requires: ['Step Outline'],
    triggers: 'Global Script Doctoring',
    orderField: 'order',
    prompts: {
      magic: 'Polish the dialogue, pacing, and subtext to achieve professional screenwriting standards.',
      generate: 'Convert the step outline into a full screenplay with professional formatting and dialogue.'
    }
  },
  {
    id: 'Global Script Doctoring',
    name: 'Global Script Doctoring',
    order: 12,
    category: 'PRODUCTION',
    collectionName: 'doctoring_primitives',
    primitiveTypes: ['script_scene'],
    description: 'Full screenplay review for consistency and quality.',
    icon: Bot,
    estTime: '1h',
    hydrationLabel: 'Analyzing Script Integrity...',
    requires: ['Script'],
    triggers: 'Technical Breakdown',
    orderField: 'order',
    prompts: {
      magic: 'Fix architectural inconsistencies and strengthen the thematic unity of the full script.',
      generate: 'Perform a comprehensive audit of the script to ensure structural integrity and quality.'
    }
  },
  {
    id: 'Technical Breakdown',
    name: 'Technical Breakdown',
    order: 13,
    category: 'PRODUCTION',
    collectionName: 'breakdown_primitives',
    primitiveTypes: ['breakdown'],
    description: 'Transform scenes into technical shots.',
    icon: Cpu,
    estTime: '3h',
    hydrationLabel: 'Generating Production Breakdown...',
    requires: ['Global Script Doctoring'],
    triggers: 'Visual Assets',
    orderField: 'order',
    prompts: {
      magic: 'Optimize shot composition and technical feasibility for every scene.',
      generate: 'Transform the script scenes into a technical shot list for production.'
    }
  },
  {
    id: 'Visual Assets',
    name: 'Visual Assets',
    order: 14,
    category: 'PRODUCTION',
    collectionName: 'asset_primitives',
    primitiveTypes: ['asset'],
    description: 'Generate multi-angle characters and environments.',
    icon: ImageIcon,
    estTime: '2h',
    hydrationLabel: 'Generating Cinematic Assets...',
    requires: ['Technical Breakdown'],
    triggers: 'AI Previs',
    orderField: 'order',
    prompts: {
      magic: 'Polish the aesthetic consistency and visual detail of your cinematic assets.',
      generate: 'Generate high-fidelity visual assets for characters and environments.'
    }
  },
  {
    id: 'AI Previs',
    name: 'AI Previs',
    order: 15,
    category: 'PRODUCTION',
    collectionName: 'previs_primitives',
    primitiveTypes: ['previs'],
    description: 'Preview your script with AI-generated storyboards.',
    icon: Film,
    estTime: '2h',
    hydrationLabel: 'Generating AI Previs...',
    requires: ['Visual Assets'],
    triggers: 'Production Export',
    orderField: 'order',
    prompts: {
      magic: 'Refine visual storytelling and shot transitions in the previs sequence.',
      generate: 'Generate a comprehensive AI previs (storyboard) to visualize the script.'
    }
  },
  {
    id: 'Production Export',
    name: 'Production Export',
    order: 16,
    category: 'PRODUCTION',
    collectionName: 'export_primitives',
    primitiveTypes: ['export'],
    description: 'Download finalized script and assets.',
    icon: Share,
    estTime: '5m',
    hydrationLabel: 'Preparing Production Export...',
    requires: ['AI Previs'],
    orderField: 'order',
    prompts: {
      magic: 'Final check of all production deliverables for packaging and export.',
      generate: 'Prepare the finalized production export containing all script and visual assets.'
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
      // Fallback for AI occasionally using French translations instead of exact IDs
      const normalized = String(stageId).toLowerCase();
      if (normalized.includes('structure en 3 actes')) def = this._stages.get('3-Act Structure');
      else if (normalized.includes('structure en 8 beats')) def = this._stages.get('8-Beat Structure');
      else if (normalized.includes('bible des personnages')) def = this._stages.get('Character Bible');
      else if (normalized.includes('bible des lieux')) def = this._stages.get('Location Bible');
      else if (normalized.includes('traitement')) def = this._stages.get('Treatment');
      else if (normalized.includes('séquencier')) def = this._stages.get('Step Outline');
      else if (normalized.includes('scénario')) def = this._stages.get('Script');
      else if (normalized.includes('brouillon')) def = this._stages.get('Initial Draft');
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

