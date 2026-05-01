import { ToolHandler } from "./toolTypes";
import { fetchProjectState, syncMetadata, updateStageInsight, runProjectDiagnostics } from "./projectTools";
import { getStageStructure, researchContext, restructureStage } from "./structureTools";
import { fetchCharacterDetails, searchProjectContent } from "./contentTools";
import { proposePatch, executeMultiStageFix, addPrimitive, deletePrimitive } from "./primitiveTools";
import { updateAgentStatus, setSuggestedActions } from "./uiTools";
import { triggerStageGeneration, approveStage } from "./workflowTools";
import { navigateToStage, focusElement, toggleUiPanel } from "./navigationTools";
import { undoLastAction, requestUserApproval } from "./safetyTools";
import { exportProjectDocument, readUserPreferences, updateAgentMemory } from "./platformTools";

export const scriptDoctorToolHandlers: Record<string, ToolHandler> = {
  // ── Perception ────────────────────────────────────────────────────────────
  fetch_project_state: fetchProjectState,
  get_stage_structure: getStageStructure,
  research_context: researchContext,
  fetch_character_details: fetchCharacterDetails,
  search_project_content: searchProjectContent,
  run_project_diagnostics: runProjectDiagnostics,

  // ── Mutation (CRUD) ───────────────────────────────────────────────────────
  sync_metadata: syncMetadata,
  propose_patch: proposePatch,
  execute_multi_stage_fix: executeMultiStageFix,
  add_primitive: addPrimitive,
  delete_primitive: deletePrimitive,
  restructure_stage: restructureStage,

  // ── Analysis & State ──────────────────────────────────────────────────────
  update_stage_insight: updateStageInsight,

  // ── UI Feedback ───────────────────────────────────────────────────────────
  update_agent_status: updateAgentStatus,
  set_suggested_actions: setSuggestedActions,

  // ── Workflow / Orchestration ──────────────────────────────────────────────
  trigger_stage_generation: triggerStageGeneration,
  approve_stage: approveStage,

  // ── UI Navigation ─────────────────────────────────────────────────────────
  navigate_to_stage: navigateToStage,
  focus_element: focusElement,
  toggle_ui_panel: toggleUiPanel,

  // ── Safety / Versioning ───────────────────────────────────────────────────
  undo_last_action: undoLastAction,
  request_user_approval: requestUserApproval,

  // ── Platform ─────────────────────────────────────────────────────────────
  export_project_document: exportProjectDocument,
  read_user_preferences: readUserPreferences,
  update_agent_memory: updateAgentMemory,
};

export * from "./toolTypes";


