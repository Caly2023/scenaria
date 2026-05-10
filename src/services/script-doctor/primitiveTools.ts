import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { contextAssembler } from "../context";
import { getArgString, getArgRecord, getArgArray, getArgNumber } from "../../utils/scriptDoctorUtils";
import { mapPrimitiveToDb, stripUndefined } from "../../utils/primitiveUtils";
import { WorkflowStage } from "../../types";
import { registerUndoableAction } from "./safetyTools";

export const updatePrimitives: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, setRefiningBlockId, handleStageAnalyze, setLastUpdatedPrimitiveId, addToast, t } = context;
  const stage = getArgString(args, "stage") ?? "";
  const updatesArray = getArgArray(args, "updates") ?? [];
  
  telemetryService.setStatus("update_primitives", "📡", `Synchronizing structural updates for ${stage}...`);
  
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: `Invalid stage: ${stage}` };

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  const updatedIds: string[] = [];
  try {
    for (const item of updatesArray as { id: string, fields: Record<string, unknown> }[]) {
      const { id, fields } = item;
      if (!id || !fields) continue;
      
      setRefiningBlockId(id);
      const previousItem = (stageContents[stage] || []).find(p => p.id === id);
      const safeUpdates = stripUndefined(mapPrimitiveToDb(stage, fields));
      
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
        previousData: previousItem as Record<string, unknown> | undefined
      });
      updatedIds.push(id);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    setRefiningBlockId(null);
    return { success: false, error: message };
  }
  
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  if (updatedIds.length > 0) {
    setLastUpdatedPrimitiveId?.(updatedIds[updatedIds.length - 1]);
  }
  setRefiningBlockId(null);
  addToast(t("common.primitiveUpdated"), "success");
  telemetryService.setStatus("update_primitives", "✅", `Updates confirmed for ${stage}.`);
  return { success: true, primitive_ids: updatedIds };
};

export const executeMultiStageFix: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, handleStageAnalyze, addToast, t } = context;
  const fixes = getArgArray(args, "fixes") ?? [];
  telemetryService.setStatus("execute_multi_stage_fix", "🔗", `Coordinating multi-stage architectural fix...`);
  
  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    for (const fix of fixes as { id: string, stage: string, updates: Record<string, unknown> }[]) {
      const sub = subcollectionMap[fix.stage];
      if (!sub) continue;
      const safe = stripUndefined(mapPrimitiveToDb(fix.stage, fix.updates));
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
  
  const uniqueStages = [...new Set(fixes.map(f => (f as { stage: string }).stage))] as WorkflowStage[];
  await Promise.all(uniqueStages.map(s => contextAssembler.getStageStructure(currentProject.id, s)));
  await Promise.all(uniqueStages.map(s => handleStageAnalyze(s)));
  
  addToast(t("common.multiStageFixApplied"), "success");
  telemetryService.setStatus("execute_multi_stage_fix", "✅", `Multi-stage fix successfully propagated.`);
  return { success: true };
};

export const addPrimitives: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, handleStageAnalyze, addToast, t } = context;
  const stage = getArgString(args, "stage") ?? "";
  const primitivesArray = getArgArray(args, "primitives") ?? [];
  
  telemetryService.setStatus("add_primitives", "➕", `Injecting new structural elements into ${stage}...`);
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  const newDocIds: string[] = [];
  try {
    for (const primitive of primitivesArray as Record<string, unknown>[]) {
      const safeData = stripUndefined(mapPrimitiveToDb(stage, {
        title: (primitive.title as string) || (primitive.name as string) || "Untitled",
        content: (primitive.content as string) || (primitive.description as string) || "",
        order: (primitive.order as number) ?? 0,
        ...primitive,
      }));
      
      const newDocId = await store.dispatch(
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
      newDocIds.push(newDocId);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
  
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  addToast(t("common.primitiveAdded"), "success");
  telemetryService.setStatus("add_primitives", "✅", `New elements successfully integrated.`);
  return { success: true, primitive_ids: newDocIds };
};

export const deletePrimitives: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, stageContents, handleStageAnalyze, addToast, t } = context;
  const ids = getArgArray(args, "ids") ?? [];
  const stage = getArgString(args, "stage") ?? "";
  
  telemetryService.setStatus("delete_primitives", "🗑️", `Excising elements from ${stage}...`);
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    for (const id of ids as string[]) {
      const previousItem = (stageContents[stage] || []).find(p => p.id === id);
      
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
        previousData: previousItem as Record<string, unknown> | undefined
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
  
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  addToast(t("common.primitiveDeleted"), "info");
  telemetryService.setStatus("delete_primitives", "✅", `Elements removed from production.`);
  return { success: true };
};
