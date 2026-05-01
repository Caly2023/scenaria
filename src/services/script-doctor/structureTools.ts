import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { contextAssembler } from "../context";
import { getArgString, getArgArray } from "../../utils/scriptDoctorUtils";
import { mapPrimitiveToDb } from "../../utils/primitiveUtils";
import { WorkflowStage } from "../../types";
import { stageRegistry } from "../../config/stageRegistry";

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
      primitives: structure.map((p: any) => ({
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
  
  try {
    const sDef = stageRegistry.get(stageName);
    
    if (sDef.collectionName === "characters") {
        items = characters;
    } else if (sDef.collectionName === "locations") {
        items = locations;
    } else if (stageContents[stageName] && stageContents[stageName].length > 0) {
        items = stageContents[stageName];
    } else {
      items = await contextAssembler.getStageStructure(currentProject.id, stageName);
    }
  } catch (error) {
    console.warn(`[research_context] Stage not found or inaccessible: ${stageName}`);
    return { success: false, error: `Stage context not found: ${stageName}` };
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
  const { currentProject, stageContents, subcollectionMap, handleStageAnalyze, addToast, t } = context;
  const stage = getArgString(args, "stage") ?? "";
  const primitives = getArgArray(args, "primitives") ?? [];
  const sub = subcollectionMap[stage];
  if (!sub) return { success: false, error: "Unsupported stage" };

  telemetryService.setStatus("restructure_stage", "🧠", `Re-organizing ${stage}...`);

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    const existingItems = stageContents[stage] || [];
    const newIds = new Set(primitives.map((p: any) => p.id || p.primitive_id).filter(Boolean));

    for (const item of existingItems) {
      if (!newIds.has(item.id)) {
        await store.dispatch(
          firebaseService.endpoints.deleteSubcollectionDoc.initiate({
            projectId: currentProject.id,
            collectionName: sub,
            docId: item.id
          })
        ).unwrap();
      }
    }

    for (let i = 0; i < primitives.length; i++) {
      const p = primitives[i] as any;
      const id = p.id || p.primitive_id;
      
      const safe = mapPrimitiveToDb(stage, {
        title: p.title || p.name || "Untitled",
        content: p.content || p.description || "",
        order: i,
        ...p,
      });

      if (id) {
        await store.dispatch(
          firebaseService.endpoints.updateSubcollectionDoc.initiate({
            projectId: currentProject.id,
            collectionName: sub,
            docId: id,
            data: safe
          })
        ).unwrap();
      } else {
        await store.dispatch(
          firebaseService.endpoints.addSubcollectionDoc.initiate({
            projectId: currentProject.id,
            collectionName: sub,
            data: safe
          })
        ).unwrap();
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  await contextAssembler.getStageStructure(currentProject.id, stage);
  await handleStageAnalyze(stage as WorkflowStage);
  addToast(t("common.stageRestructured"), "success");
  return { success: true };
};
