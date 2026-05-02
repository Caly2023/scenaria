import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { contextAssembler } from "../context";
import { getArgString, getArgRecord, getArgArray, getArgNumber } from "../../utils/scriptDoctorUtils";
import { mapPrimitiveToDb } from "../../utils/primitiveUtils";
import { WorkflowStage } from "../../types";
import { registerUndoableAction } from "./safetyTools";

export const proposePatch: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, setRefiningBlockId, handleStageAnalyze, setLastUpdatedPrimitiveId, addToast, t } = context;
  const id = getArgString(args, "id") ?? "";
  const stage = getArgString(args, "stage") ?? "";
  const updates = getArgRecord(args, "updates") ?? {};
  
  telemetryService.setStatus("propose_patch", "📡", `Synchronizing structural updates for ${stage}...`, id);
  setRefiningBlockId(id);
  
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: `Invalid stage: ${stage}` };

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  // Capture previous data for undo
  const previousItem = (stageContents[stage] || []).find(p => p.id === id);

  try {
    const safeUpdates = mapPrimitiveToDb(stage, updates);
    await store.dispatch(
      firebaseService.endpoints.updateSubcollectionDoc.initiate({
        projectId: currentProject.id,
        collectionName: sub,
        docId: id,
        data: safeUpdates
      })
    ).unwrap();

    registerUndoableAction(currentProject.id, "update", {
      collectionName: sub,
      docId: id,
      previousData: previousItem
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    setRefiningBlockId(null);
    return { success: false, error: message };
  }
  
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  setLastUpdatedPrimitiveId?.(id);
  setRefiningBlockId(null);
  addToast(t("common.primitiveUpdated"), "success");
  telemetryService.setStatus("propose_patch", "✅", `Update confirmed for ${stage}.`, id);
  return { success: true, primitive_id: id };
};

export const executeMultiStageFix: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, handleStageAnalyze, addToast, t } = context;
  const fixes = getArgArray(args, "fixes") ?? [];
  telemetryService.setStatus("execute_multi_stage_fix", "🔗", `Coordinating multi-stage architectural fix...`);
  
  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    for (const fix of fixes as any[]) {
      const sub = subcollectionMap[fix.stage];
      if (!sub) continue;
      const safe = mapPrimitiveToDb(fix.stage, fix.updates);
      await store.dispatch(
        firebaseService.endpoints.updateSubcollectionDoc.initiate({
          projectId: currentProject.id,
          collectionName: sub,
          docId: fix.id,
          data: safe
        })
      ).unwrap();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
  
  const uniqueStages = [...new Set(fixes.map((f: any) => f.stage))] as WorkflowStage[];
  await Promise.all(uniqueStages.map(s => contextAssembler.getStageStructure(currentProject.id, s)));
  await Promise.all(uniqueStages.map(s => handleStageAnalyze(s)));
  
  addToast(t("common.multiStageFixApplied"), "success");
  telemetryService.setStatus("execute_multi_stage_fix", "✅", `Multi-stage fix successfully propagated.`);
  return { success: true };
};

export const addPrimitive: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, handleStageAnalyze, addToast, t } = context;
  const stage = getArgString(args, "stage") ?? "";
  const primitive = getArgRecord(args, "primitive") ?? {};
  
  telemetryService.setStatus("add_primitive", "➕", `Injecting new structural element into ${stage}...`);
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  const safeData = mapPrimitiveToDb(stage, {
    title: (primitive as any).title || (primitive as any).name || "Untitled",
    content: (primitive as any).content || (primitive as any).description || "",
    order: getArgNumber(args, "position") ?? (primitive as any).order ?? 0,
    ...primitive,
  });
  
  let newDocId = "";
  try {
    newDocId = await store.dispatch(
      firebaseService.endpoints.addSubcollectionDoc.initiate({
        projectId: currentProject.id,
        collectionName: sub,
        data: safeData
      })
    ).unwrap();

    registerUndoableAction(currentProject.id, "add", {
      collectionName: sub,
      docId: newDocId
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
  
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  addToast(t("common.primitiveAdded"), "success");
  telemetryService.setStatus("add_primitive", "✅", `New element successfully integrated.`);
  return { success: true, primitive_id: newDocId };
};

export const deletePrimitive: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, handleStageAnalyze, addToast, t } = context;
  const id = getArgString(args, "id") ?? "";
  const stage = getArgString(args, "stage") ?? "";
  
  telemetryService.setStatus("delete_primitive", "🗑️", `Excising element from ${stage}...`, id);
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  const previousItem = (stageContents[stage] || []).find(p => p.id === id);

  try {
    await store.dispatch(
      firebaseService.endpoints.deleteSubcollectionDoc.initiate({
        projectId: currentProject.id,
        collectionName: sub,
        docId: id
      })
    ).unwrap();

    registerUndoableAction(currentProject.id, "delete", {
      collectionName: sub,
      docId: id,
      previousData: previousItem
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
  
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  addToast(t("common.primitiveDeleted"), "info");
  telemetryService.setStatus("delete_primitive", "✅", `Element removed from production.`);
  return { success: true };
};
