import React from "react";
import { WorkflowStage } from "../../types";
import { ScriptDoctorMessage, ToolResult } from "../../types/scriptDoctor";
import { ContentPrimitive } from "../../types/stageContract";
import { Project } from "../../types";

export interface ScriptDoctorToolContext {
  currentProject: Project;
  stageContents: Record<string, ContentPrimitive[]>;
  characters: ContentPrimitive[];
  locations: ContentPrimitive[];
  subcollectionMap: Record<string, string>;
  addToast: (msg: string, type: "error" | "info" | "success") => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId?: (id: string | null) => void;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
  setAiStatus: (status: string | null) => void;
  setDoctorMessages: React.Dispatch<React.SetStateAction<ScriptDoctorMessage[]>>;
  botMsgId?: string | null;
  t: (key: string, options?: Record<string, unknown>) => string;
  handleStageChange?: (stage: WorkflowStage) => void;
  triggerStageGeneration?: (stage: WorkflowStage) => Promise<void>;
}

/** All tool handlers receive strongly-typed args — no `any` allowed. */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: ScriptDoctorToolContext
) => Promise<ToolResult>;
