import React from "react";
import { useTranslation } from "react-i18next";
import { stageRegistry } from "../config/stageRegistry";
import { contextAssembler } from "../services/context";
import {
  Project,
  WorkflowStage,
} from "../types";
import { ScriptDoctorMessage, ToolCall, ToolResult } from "../types/scriptDoctor";

interface UseScriptDoctorToolsProps {
  currentProject: Project | null;
  stageContents: Record<string, import("../types/stageContract").ContentPrimitive[]>;
  addToast: (msg: string, type: "error" | "info" | "success") => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId?: (id: string | null) => void;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
  setActiveTool: (name: string | null) => void;
  setAiStatus: (status: string | null) => void;
  setDoctorMessages: React.Dispatch<React.SetStateAction<ScriptDoctorMessage[]>>;
  /** Optional: allows the agent to navigate the UI to a specific stage */
  handleStageChange?: (stage: WorkflowStage) => void;
  /** Optional: allows the agent to trigger AI generation for a stage */
  triggerStageGeneration?: (stage: WorkflowStage) => Promise<void>;
}

export function useScriptDoctorTools({
  currentProject,
  stageContents,
  addToast,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  handleStageAnalyze,
  setActiveTool,
  setAiStatus,
  setDoctorMessages,
  handleStageChange,
  triggerStageGeneration,
}: UseScriptDoctorToolsProps) {
  const { t } = useTranslation();
  const subcollectionMap = stageRegistry.getSubcollectionMap();
  
  const characters = stageContents["Character Bible"] || [];
  const locations = stageContents["Location Bible"] || [];

  const executeToolCall = async (
    call: ToolCall,
    retryAttempt: number = 0,
    botMsgId?: string | null,
  ): Promise<ToolResult> => {
    const { name, args = {} } = call;
    setActiveTool(name);

    if (!currentProject) {
      return { success: false, error: "No active project", error_code: 0 };
    }

    try {
      const contextPayload = {
        currentProject,
        stageContents,
        characters,
        locations,
        subcollectionMap,
        addToast,
        setRefiningBlockId,
        setLastUpdatedPrimitiveId,
        handleStageAnalyze,
        setAiStatus,
        setDoctorMessages,
        botMsgId,
        t,
        handleStageChange,
        triggerStageGeneration,
      };

      const { scriptDoctorToolHandlers } = await import("../services/script-doctor");

      if (scriptDoctorToolHandlers[name]) {
        return await scriptDoctorToolHandlers[name](args, contextPayload);
      }
      
      return { success: false, error: `Unknown tool: ${name}` };
    } catch (error: any) {
      console.error(`[ScriptDoctor] Tool ${name} failed:`, error);
      const { classifyError } = await import("../lib/errorClassifier");
      const classification = classifyError(error);
      if (retryAttempt < 1 && (classification.action === "RESYNC_AND_RETRY" || classification.type === "NotFoundError")) {
        await contextAssembler.hydrateFullIdMap(currentProject.id);
        return executeToolCall(call, retryAttempt + 1, botMsgId);
      }
      return { success: false, error: classification.userMessage, error_code: 0 };
    }
  };

  return { executeToolCall };
}

