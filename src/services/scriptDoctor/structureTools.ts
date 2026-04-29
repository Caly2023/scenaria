import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { contextAssembler } from "../contextAssembler";
import { getArgString, getArgArray } from "../../utils/scriptDoctorUtils";
import { mapPrimitiveToDb } from "../../utils/primitiveUtils";
import { WorkflowStage } from "../../types";

export const getStageStructure: ToolHandler = async (args, context) => {
  const { currentProject } = context;
  const stage_id = getArgString(args, "stage_id") ?? "";
  telemetryService.setStatus("get_stage_structure", "🧠", `Mapping IDs for ${stage_id}...`);
  const structure = await contextAssembler.getStageStructure(currentProject.id, stage_id);
  return {
    success: true,
    data: {
      stage_id,
      total_count: structure.length,
      primitives: structure.map((p) => ({
        primitive_id: p.id,
        title: p.title || p.name,
        content: p.content || p.description,
        order_index: p.order,
      })),
    },
  };
};

export const researchContext: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations } = context;
  const stageName = getArgString(args, "stageName") ?? "";
  telemetryService.setStatus("research_context", "🔍", `Context search: ${stageName}...`);
  
  let items: any[] = [];
  const localDataMap: Record<string, any[]> = {
    Brainstorming: stageContents["Brainstorming"] || [],
    "Character Bible": characters,
    "Location Bible": locations,
    "Step Outline": stageContents["Step Outline"] || [],
    Treatment: stageContents["Treatment"] || [],
    Script: stageContents["Script"] || [],
  };

  if (localDataMap[stageName] && localDataMap[stageName].length > 0) {
    items = localDataMap[stageName];
  } else {
    items = await contextAssembler.getStageStructure(currentProject.id, stageName);
  }

  return {
    success: true,
    data: items.map((item: any) => ({
      primitive_id: item.id || "",
      title: item.title || item.name || "",
      content: item.content || item.description || "",
      order_index: item.order || 0,
      ...item,
    })),
  };
};

export const restructureStage: ToolHandler = async (args, context) => {
  const { currentProject, subcollectionMap, handleStageAnalyze, addToast, t } = context;
  const stage = getArgString(args, "stage") ?? "";
  const primitives = getArgArray(args, "primitives") ?? [];
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  telemetryService.setStatus("restructure_stage", "🧠", `Re-organizing ${stage}...`);

  const { db } = await import("../../lib/firebase");
  const { collection, getDocs, writeBatch, doc, serverTimestamp } = await import("firebase/firestore");

  const stageRef = collection(db, "projects", currentProject.id, sub);
  const existingSnap = await getDocs(stageRef);
  const existingDocs = existingSnap.docs;
  
  const batch = writeBatch(db);
  const newIds = new Set(primitives.map((p: any) => p.id).filter(Boolean));
  
  existingDocs.forEach(d => {
    if (!newIds.has(d.id)) {
      batch.delete(d.ref);
    }
  });

  for (let i = 0; i < primitives.length; i++) {
    const p = primitives[i] as any;
    const id = p.id || p.primitive_id;
    
    const safe = mapPrimitiveToDb(stage, {
      title: p.title || p.name || "Untitled",
      content: p.content || p.description || "",
      order: i,
      projectId: currentProject.id,
      updatedAt: serverTimestamp(),
    });

    if (id) {
      const docRef = doc(db, "projects", currentProject.id, sub, id);
      batch.set(docRef, safe, { merge: true });
    } else {
      const newDocRef = doc(collection(db, "projects", currentProject.id, sub));
      batch.set(newDocRef, { ...safe, createdAt: serverTimestamp() });
    }
  }

  await batch.commit();
  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  addToast(t("common.stageRestructured"), "success");
  return { success: true };
};
