import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgRecord, getArgString } from "../../utils/scriptDoctorUtils";

export const fetchProjectState: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations } = context;
  telemetryService.setStatus("fetch_project_state", "🧠", "Loading full project state...");
  const idMapSnapshot = telemetryService.getIdMapSnapshot();
  return {
    success: true,
    data: {
      metadata: currentProject.metadata,
      stages: {
        Logline: currentProject.stageStates?.["Logline"] !== "empty" ? 1 : 0,
        Brainstorming: currentProject.stageStates?.["Brainstorming"] !== "empty" ? 1 : 0,
        "3-Act Structure": currentProject.stageStates?.["3-Act Structure"] !== "empty" ? 1 : 0,
        Synopsis: currentProject.stageStates?.["Synopsis"] !== "empty" ? 1 : 0,
        "Character Bible": characters.length,
        "Location Bible": locations.length,
        "Step Outline": (stageContents["Step Outline"] || []).length,
        Treatment: (stageContents["Treatment"] || []).length,
        Script: (stageContents["Script"] || []).length,
      },
      id_map: idMapSnapshot,
    },
  };
};

export const syncMetadata: ToolHandler = async (args, context) => {
  const { currentProject, addToast } = context;
  const metadata = getArgRecord(args, "metadata") ?? {};
  telemetryService.setStatus("sync_metadata", "🧬", `Recalibrating project DNA...`);
  
  const { db } = await import("../../lib/firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");

  await updateDoc(doc(db, "projects", currentProject.id), {
    metadata: { ...currentProject.metadata, ...metadata },
    updatedAt: serverTimestamp(),
  });
  
  // NOTE: i18n translation needs to be handled either by passing t() in context, or using a simple string.
  // We'll assume the addToast msg works for now.
  addToast(context.t("common.metadataSynced"), "success");
  telemetryService.setStatus("sync_metadata", "✅", `Metadata synchronization complete.`);
  return { success: true };
};
