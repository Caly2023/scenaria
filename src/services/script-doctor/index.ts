import { ToolHandler } from "./toolTypes";
import { fetchProjectState, syncMetadata } from "./projectTools";
import { getStageStructure, researchContext, restructureStage } from "./structureTools";
import { fetchCharacterDetails, searchProjectContent } from "./contentTools";
import { proposePatch, executeMultiStageFix, addPrimitive, deletePrimitive } from "./primitiveTools";
import { updateAgentStatus, setSuggestedActions } from "./uiTools";

export const scriptDoctorToolHandlers: Record<string, ToolHandler> = {
  fetch_project_state: fetchProjectState,
  sync_metadata: syncMetadata,
  get_stage_structure: getStageStructure,
  research_context: researchContext,
  restructure_stage: restructureStage,
  fetch_character_details: fetchCharacterDetails,
  search_project_content: searchProjectContent,
  propose_patch: proposePatch,
  execute_multi_stage_fix: executeMultiStageFix,
  add_primitive: addPrimitive,
  delete_primitive: deletePrimitive,
  update_agent_status: updateAgentStatus,
  set_suggested_actions: setSuggestedActions,
};

export * from "./toolTypes";
