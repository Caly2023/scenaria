import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { contextAssembler } from "../contextAssembler";
import { getArgString, getArgRecord, getArgArray, getArgNumber } from "../../utils/scriptDoctorUtils";
import { mapPrimitiveToDb } from "../../utils/primitiveUtils";
import { WorkflowStage } from "../../types";

export const proposePatch: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, setRefiningBlockId, handleStageAnalyze, setLastUpdatedPrimitiveId, addToast, t } = context;
  const id = getArgString(args, "id") ?? "";
  const stage = getArgString(args, "stage") ?? "";
  const updates = getArgRecord(args, "updates") ?? {};
  
  telemetryService.setStatus("propose_patch", "📡", `Synchronizing structural updates for ${stage}...`, id);
  setRefiningBlockId(id);
  
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: `Invalid stage: ${stage}` };

  const { db } = await import("../../lib/firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");

  const docRef = doc(db, "projects", currentProject.id, sub, id);
  const safeUpdates = mapPrimitiveToDb(stage, updates);
  await updateDoc(docRef, { ...safeUpdates, updatedAt: serverTimestamp() });
  
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  setLastUpdatedPrimitiveId?.(id);
  setRefiningBlockId(null);
  addToast(t("common.primitiveUpdated"), "success");
  telemetryService.setStatus("propose_patch", "✅", `Update confirmed for ${stage}.`, id);
  return { success: true, primitive_id: id };
};

export const executeMultiStageFix: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, handleStageAnalyze, addToast, t } = context;
  const fixes = getArgArray(args, "fixes") ?? [];
  telemetryService.setStatus("execute_multi_stage_fix", "🔗", `Coordinating multi-stage architectural fix...`);
  
  const { db } = await import("../../lib/firebase");
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");

  for (const fix of fixes as any[]) {
    const sub = subcollectionMap[fix.stage];
    if (!sub) continue;
    const safe = mapPrimitiveToDb(fix.stage, fix.updates);
    await updateDoc(doc(db, "projects", currentProject.id, sub, fix.id), { ...safe, updatedAt: serverTimestamp() });
  }
  
  const uniqueStages = [...new Set(fixes.map((f: any) => f.stage))] as WorkflowStage[];
  await Promise.all(uniqueStages.map(s => contextAssembler.getStageStructure(currentProject.id, s)));
  await Promise.all(uniqueStages.map(s => handleStageAnalyze(s)));
  
  addToast(t("common.multiStageFixApplied"), "success");
  telemetryService.setStatus("execute_multi_stage_fix", "✅", `Multi-stage fix successfully propagated.`);
  return { success: true };
};

export const addPrimitive: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, handleStageAnalyze, addToast, t } = context;
  const stage = getArgString(args, "stage") ?? "";
  const primitive = getArgRecord(args, "primitive") ?? {};
  
  telemetryService.setStatus("add_primitive", "➕", `Injecting new structural element into ${stage}...`);
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  const { db } = await import("../../lib/firebase");
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

  const safeData = mapPrimitiveToDb(stage, {
    title: primitive.title || primitive.name || "Untitled",
    content: primitive.content || primitive.description || "",
    order: getArgNumber(args, "position") ?? primitive.order ?? 0,
    projectId: currentProject.id,
    createdAt: serverTimestamp(),
    ...primitive,
  });
  
  const newDoc = await addDoc(collection(db, "projects", currentProject.id, sub), safeData);
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  addToast(t("common.primitiveAdded"), "success");
  telemetryService.setStatus("add_primitive", "✅", `New element successfully integrated.`);
  return { success: true, primitive_id: newDoc.id };
};

export const deletePrimitive: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, handleStageAnalyze, addToast, t } = context;
  const id = getArgString(args, "id") ?? "";
  const stage = getArgString(args, "stage") ?? "";
  
  telemetryService.setStatus("delete_primitive", "🗑️", `Excising element from ${stage}...`, id);
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  const { db } = await import("../../lib/firebase");
  const { doc, deleteDoc } = await import("firebase/firestore");

  await deleteDoc(doc(db, "projects", currentProject.id, sub, id));
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  
  addToast(t("common.primitiveDeleted"), "info");
  telemetryService.setStatus("delete_primitive", "✅", `Element removed from production.`);
  return { success: true };
};
