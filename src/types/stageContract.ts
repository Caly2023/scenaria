/**
 * STAGE CONTRACT — Shared Types for the Multi-Agent Architecture
 *
 * Every stage must expose: analysis, content[], state.
 * Every agent must implement: generate, updatePrimitive, evaluate, computeState.
 */

// ─── Stage State Enum ─────────────────────────────────────────────────────────

export type StageState = 'empty' | 'needs_improvement' | 'good' | 'excellent';

export const STAGE_STATE_ORDER: StageState[] = [
  'empty',
  'needs_improvement',
  'good',
  'excellent',
];

export const STAGE_STATE_LABELS: Record<StageState, string> = {
  empty: 'Empty',
  needs_improvement: 'Needs Improvement',
  good: 'Good',
  excellent: 'Excellent',
};

export const STAGE_STATE_ICONS: Record<StageState, string> = {
  empty: '○',
  needs_improvement: '◐',
  good: '●',
  excellent: '★',
};

// ─── Analysis Primitive ───────────────────────────────────────────────────────

export interface StageAnalysis {
  evaluation: string;        // Professional AI narrative evaluation (markdown)
  issues: string[];          // Identified weaknesses or gaps
  recommendations: string[]; // Actionable improvement suggestions
  updatedAt: number;
}

// ─── Content Primitive ────────────────────────────────────────────────────────

export interface ContentPrimitive {
  id: string;
  title: string;
  content: string;
  primitiveType: string;     // Stage-specific role: 'beat', 'scene', 'character', etc.
  order: number;
  agentGenerated?: boolean;
  agentVersion?: string;
  visualPrompt?: string;
  metadata?: Record<string, any>;  // Stage-specific extra fields
}

// ─── Agent Output (Strict Schema) ─────────────────────────────────────────────

export interface AgentOutput {
  analysis: StageAnalysis;
  content: ContentPrimitive[];
  state: StageState;
  metadataUpdates?: Record<string, any>;
}

// ─── Project Context passed to every agent ────────────────────────────────────

export interface ProjectContext {
  projectId: string;
  metadata: {
    title: string;
    genre: string;
    format: string;
    tone: string;
    languages: string[];
    logline: string;
  };
  /** Full content of each already-populated stage, keyed by stage name */
  stageContents: Record<string, ContentPrimitive[]>;
  /** Current stage analyses */
  stageAnalyses: Record<string, StageAnalysis>;
}

// ─── Orchestrator Decision ────────────────────────────────────────────────────

export type OrchestratorAction = 'generate' | 'update' | 'evaluate';

export interface OrchestratorDecision {
  action: OrchestratorAction;
  targetStage: string;           // Stage name, e.g. 'Logline'
  targetPrimitiveId?: string;   // For update operations
  instruction: string;           // Natural-language instruction for the agent
  requiresContext: string[];     // Which stages to pull context from
}

// ─── Agent Interface — Every stage agent MUST implement this ─────────────────

export interface IStageAgent {
  readonly stageId: string;

  /**
   * Generate content from scratch.
   * Returns a full AgentOutput with analysis + content + state.
   */
  generate(context: ProjectContext): Promise<AgentOutput>;

  /**
   * Update a specific content primitive.
   * Must re-evaluate the full stage and recompute state.
   */
  updatePrimitive(
    primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput>;

  /**
   * Evaluate the current stage content quality.
   * Returns a new analysis + updated state. Does NOT modify content.
   */
  evaluate(
    content: ContentPrimitive[],
    context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>>;

  /**
   * Compute StageState from a StageAnalysis.
   * Deterministic — no AI call needed.
   */
  computeState(analysis: StageAnalysis): StageState;
}

// ─── Persistence Result ───────────────────────────────────────────────────────

export interface PersistResult {
  success: boolean;
  primitiveIds: string[];
  error?: string;
}
