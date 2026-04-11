export type ProjectFormat = 'Short Film' | 'Feature' | 'Series';

export type WorkflowStage = 
  | 'Brainstorming'
  | 'Logline' 
  | '3-Act Structure'
  | 'Synopsis'
  | 'Character Bible' 
  | 'Location Bible'
  | 'Treatment' 
  | 'Step Outline' 
  | 'Script' 
  | 'Storyboard';

export interface StageInsight {
  content: string;
  isReady: boolean;
  updatedAt?: number;
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
}

export interface Location {
  id: string;
  name: string;
  atmosphere: string;
  description: string;
  visualPrompt?: string;
}

export interface PrimitiveBlock {
  id: string;
  title: string;
  content: string;
  visualPrompt?: string;
}

export interface ProjectMetadata {
  title: string;
  format: string;
  genre: string;
  tone: string;
  languages: string[];
  targetDuration: string;
  logline: string;
}

export interface Project {
  id: string;
  metadata: ProjectMetadata;
  insights?: Record<string, StageInsight>;
  brainstorming_analysis?: string; // Legacy
  brainstorming_story?: string; // Legacy
  pitch_critique?: string;
  pitch_result?: string;
  pitch_validation?: {
    status: 'GOOD TO GO' | 'NEEDS WORK';
    feedback: string;
  };
  loglineDraft?: string;
  structureDraft?: string; // 8 beats JSON
  synopsisDraft?: string;
  treatmentDraft?: string; // JSON array of PrimitiveBlock
  stepOutlineDraft?: string; // JSON array of PrimitiveBlock
  scriptDraft?: string; // JSON array of PrimitiveBlock
  validatedStages: WorkflowStage[];
  collaborators: string[]; // User IDs
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
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}
