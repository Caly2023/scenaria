import { Project, WorkflowStage } from "./index";

type ScriptDoctorRole = "user" | "assistant" | "tool" | "model";

export interface ScriptDoctorMessage {
  id: string;
  role: ScriptDoctorRole;
  content: string;
  status?: string;
  thinking?: string;
  reasoning?: string;
  suggested_actions?: string[];
  active_tool?: string;
  timestamp: number;
  /** Preserves Genkit/Gemini raw parts for multi-turn consistency (including thoughts and signatures) */
  content_parts?: any[];
}

export interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  ref?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  error_code?: number;
  [key: string]: unknown;
}

export interface UseScriptDoctorProps {
  currentProject: Project | null;
  activeStage: WorkflowStage;
  stageContents: Record<string, import("./stageContract").ContentPrimitive[]>;
  addToast: (msg: string, type: "error" | "info" | "success") => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId?: (id: string | null) => void;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
}

export type GeminiPart = Record<string, unknown>;
export type GeminiHistoryEntry = { role: string; parts: GeminiPart[] };
