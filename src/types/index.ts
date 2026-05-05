export type ProjectFormat = 'Short Film' | 'Feature' | 'Series';

// Re-export from stageContract for convenience
export type { ContentPrimitive } from './stageContract';

export type WorkflowStage = 
  | 'Project Brief'
  | 'Story Bible'
  | 'Treatment' 
  | 'Sequencer' 
  | 'Dialogue Continuity'
  | 'Final Screenplay'
  | 'Technical Breakdown';

import type { StageAnalysis } from './stageContract';

export interface StageInsight extends StageAnalysis {
  content?: string; // Optional field for the plain text evaluation if needed by UI
}


export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  tier?: 1 | 2 | 3;
  visualPrompt?: string;
  views?: {
    front: string;
    profile: string;
    back: string;
    full: string;
  };
  deepDevelopment?: {
    nowStory: {
      tags: string[];
      physical: string;
      wantsNeeds: string;
    };
    backStory: string;
    forwardStory: string;
    relationshipMap: string;
  };
  order: number;
  primitiveType?: string;
}

export interface Location {
  id: string;
  name: string;
  atmosphere: string;
  description: string;
  visualPrompt?: string;
  order: number;
  primitiveType?: string;
}



export interface ProjectMetadata {
  title: string;
  format: string;
  genre: string;
  tone: string;
  languages: string[];
  targetDuration: string;
  logline: string;
  productionNotes?: string;
  synopsis?: string;
}

export interface Project {
  id: string;
  metadata: ProjectMetadata;
  // ── Legacy fields removed in Phase 4 ──
  validatedStages: WorkflowStage[];
  // ── NEW: Multi-agent architecture fields ──────────────────────────────────
  /** Stage quality state enum, keyed by stage name */
  stageStates?: Record<string, import('./stageContract').StageState>;
  /** Structured AI analysis for each stage, keyed by stage name */
  stageAnalyses?: Record<string, import('./stageContract').StageAnalysis>;
  // ── End new fields ────────────────────────────────────────────────────────
  collaborators: string[];
  activeStage: WorkflowStage;
  createdAt: number;
  updatedAt: number;
}

export interface Sequence {
  id: string;
  title: string;
  content: string;
  order: number;
  projectId: string;
  characterIds?: string[];
  locationIds?: string[];
  primitiveType?: string;
}

export interface HydrationState {
  isHydrating: boolean;
  hydratingStage: WorkflowStage | null;
  hydratingLabel: string | null;
  resetHydration?: (stage: WorkflowStage) => void;
}



export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
}
