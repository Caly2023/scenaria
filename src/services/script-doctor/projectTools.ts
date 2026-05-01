import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgRecord } from "../../utils/scriptDoctorUtils";
import { stageRegistry } from "../../config/stageRegistry";

export const fetchProjectState: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations } = context;
  telemetryService.setStatus("fetch_project_state", "🧠", "Loading full project state...");
  const idMapSnapshot = telemetryService.getIdMapSnapshot();
  
  const allStages = stageRegistry.getAllIds();
  const stagesCount: Record<string, number> = {};
  
  allStages.forEach(stage => {
    if (stage === "Character Bible") {
      stagesCount[stage] = characters.length;
    } else if (stage === "Location Bible") {
      stagesCount[stage] = locations.length;
    } else if (stage === "Project Metadata") {
        stagesCount[stage] = currentProject.metadata ? 1 : 0;
    } else if (stage === "Initial Draft" || stage === "Brainstorming" || stage === "Logline" || stage === "3-Act Structure" || stage === "8-Beat Structure" || stage === "Synopsis" || stage === "Treatment" || stage === "Step Outline" || stage === "Script" || stage === "Global Script Doctoring" || stage === "Technical Breakdown" || stage === "Visual Assets" || stage === "AI Previs" || stage === "Production Export") {
        stagesCount[stage] = currentProject.stageStates?.[stage] !== "empty" ? (stageContents[stage] || []).length || 1 : 0;
    } else {
         stagesCount[stage] = (stageContents[stage] || []).length;
    }
  });

  return {
    success: true,
    data: {
      metadata: currentProject.metadata,
      stages: stagesCount,
      id_map: idMapSnapshot,
    },
  };
};

export const syncMetadata: ToolHandler = async (args, context) => {
  const { currentProject, addToast } = context;
  const metadata = getArgRecord(args, "metadata") ?? {};
  telemetryService.setStatus("sync_metadata", "🧬", `Recalibrating project DNA...`);
  
  const { store } = await import("../../store");
  const { firebaseService } = await import("../../services/firebaseService");

  try {
    await store.dispatch(
      firebaseService.endpoints.updateProjectMetadata.initiate({
        id: currentProject.id,
        metadata: { ...currentProject.metadata, ...metadata }
      })
    ).unwrap();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
  
  addToast(context.t("common.metadataSynced"), "success");
  telemetryService.setStatus("sync_metadata", "✅", `Metadata synchronization complete.`);
  return { success: true };
};
