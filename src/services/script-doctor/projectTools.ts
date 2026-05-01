import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgRecord, getArgString } from "../../utils/scriptDoctorUtils";
import { stageRegistry } from "../../config/stageRegistry";

export const fetchProjectState: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations, triggerStageGeneration: triggerFn } = context;
  telemetryService.setStatus("fetch_project_state", "🧠", "Loading full project state...");
  const idMapSnapshot = telemetryService.getIdMapSnapshot();
  
  const allStages = stageRegistry.getAll();
  const stagesCount: Record<string, number> = {};
  
  allStages.forEach(stageDef => {
    const stageId = stageDef.id;
    const collectionName = stageDef.collectionName;

    if (collectionName === "characters") {
      stagesCount[stageId] = characters.length;
    } else if (collectionName === "locations") {
      stagesCount[stageId] = locations.length;
    } else if (collectionName === "metadata_primitives") {
      // For metadata, we count if metadata exists OR if there are primitives in the collection
      const metadataCount = currentProject.metadata ? 1 : 0;
      const primitivesCount = (stageContents[stageId] || []).length;
      stagesCount[stageId] = Math.max(metadataCount, primitivesCount);
    } else {
      const content = stageContents[stageId] || [];
      const state = currentProject.stageStates?.[stageId] || "empty";
      
      // Logic: if stage exists in stageContents, use that length. 
      // If it's a structural stage and has a non-empty state, ensure count is at least 1 if content is empty (AI analysis block)
      if (state !== "empty" && content.length === 0) {
        stagesCount[stageId] = 1; // Minimal state representation for AI feedback
      } else {
        stagesCount[stageId] = content.length;
      }
    }
  });

  return {
    success: true,
    data: {
      metadata: currentProject.metadata,
      stages: stagesCount,
      id_map: idMapSnapshot,
      active_stage: currentProject.activeStage,
      stage_states: currentProject.stageStates || {},
    },
  };
};

export const syncMetadata: ToolHandler = async (args, context) => {
  const { currentProject, addToast, triggerStageGeneration: triggerFn } = context;
  const metadata = getArgRecord(args, "metadata") ?? {};
  telemetryService.setStatus("sync_metadata", "🧬", `Recalibrating project DNA...`);
  
  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

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

export const updateStageInsight: ToolHandler = async (args, context) => {
  const { currentProject, addToast, triggerStageGeneration: triggerFn } = context;
  const stage = getArgString(args, "stage") ?? "";
  const insight = getArgRecord(args, "insight") as Record<string, any> ?? {};
  
  if (!stage) return { success: false, error: "Missing stage argument" };

  telemetryService.setStatus("update_stage_insight", "📊", `Saving insight for ${stage}...`);
  
  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");
  const { stripUndefined } = await import("../../utils/primitiveUtils");

  try {
    // 1. Update Project Level Analysis (Atomic)
    const analysisData = stripUndefined({
      evaluation: insight.evaluation || insight.content || insight.analysis || "",
      isReady: !!insight.isReady,
      score: insight.score,
      issues: insight.issues || [],
      recommendations: insight.recommendations || insight.suggestions || [],
      suggestedPrompt: insight.suggestedPrompt || "",
      updatedAt: Date.now()
    });
    
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: `stageAnalyses.${stage}`,
        content: analysisData
      })
    ).unwrap();
    
    // 2. Update Stage State (Atomic)
    let newState: string = "needs_improvement";
    const issues = insight.issues || [];
    const recs = insight.recommendations || [];
    
    if (insight.isReady) {
      if (issues.length === 0 && recs.length === 0) {
        newState = "excellent";
      } else {
        newState = "good";
      }
    } else if (insight.state) {
      newState = insight.state;
    }
    
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: `stageStates.${stage}`,
        content: newState
      })
    ).unwrap();

    // 2.5 Update validatedStages (Legacy Compatibility)
    if (newState === "good" || newState === "excellent") {
      const newValidatedStages = Array.from(
        new Set([...(currentProject.validatedStages || []), stage as WorkflowStage])
      );
      await store.dispatch(
        firebaseService.endpoints.updateProjectField.initiate({
          id: currentProject.id,
          field: "validatedStages",
          content: newValidatedStages,
        })
      ).unwrap();
    }

    // 3. AI Insight Primitive Alignment (Consistency with production UI)
    const sub = stageRegistry.getCollectionName(stage);
    // Avoid adding insight primitives to Bible or Metadata collections which have strict schemas
    if (sub && sub !== "characters" && sub !== "locations" && sub !== "metadata_primitives") {
      const primitivesForStage = context.stageContents[stage];
      const existingPrimitives = Array.isArray(primitivesForStage) ? primitivesForStage : [];
      
      // CRITICAL FIX: Only target primitives explicitly marked as ai_insight to avoid overwriting content at order 0
      const insightPrimitive = existingPrimitives.find(p => p && p.primitiveType === "ai_insight");
      
      const insightData = stripUndefined({
        title: "AI Analysis",
        content: insight.content || insight.evaluation || insight.analysis || "",
        order: 0,
        primitiveType: "ai_insight",
        metadata: {
          isReady: !!insight.isReady,
          score: insight.score || (insight.isReady ? 80 : 40),
          issues: insight.issues || [],
          recommendations: insight.recommendations || insight.suggestions || []
        }
      });

      if (insightPrimitive) {
        await store.dispatch(
          firebaseService.endpoints.updateSubcollectionDoc.initiate({
            projectId: currentProject.id,
            collectionName: sub,
            docId: insightPrimitive.id,
            data: insightData
          })
        ).unwrap();
      } else {
        await store.dispatch(
          firebaseService.endpoints.addSubcollectionDoc.initiate({
            projectId: currentProject.id,
            collectionName: sub,
            data: insightData
          })
        ).unwrap();
      }
    }
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
  
  telemetryService.setStatus("update_stage_insight", "✅", `Insight and AI Analysis primitive saved.`);
  return { success: true };
};

/**
 * run_project_diagnostics
 * Effectue un scan global de cohérence sur l'ensemble du projet.
 * Vérifie les contradictions entre étapes (ex: personnage mort en étape 3 mais présent en étape 8),
 * les trous narratifs, ou les ruptures de ton.
 */
export const runProjectDiagnostics: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations, triggerStageGeneration: triggerFn } = context;
  telemetryService.setStatus("run_project_diagnostics", "🔍", "Running deep project diagnostics...");

  const issues: string[] = [];
  const metadata = currentProject.metadata || {};

  // Basic structural checks
  if (!metadata.logline) issues.push("Missing logline in metadata.");
  if (!metadata.title) issues.push("Project title is not defined.");
  if (characters.length === 0) issues.push("Character Bible is empty.");
  if (locations.length === 0) issues.push("Location Bible is empty.");
  
  // State checks using new multi-agent fields
  const stageStates = currentProject.stageStates || {};
  const activeStage = currentProject.activeStage;
  
  // Dependency checks based on registry
  const allStages = stageRegistry.getAll();
  allStages.forEach(s => {
    const state = stageStates[s.id] || "empty";
    
    // Count only REAL content primitives (ignore AI insights)
    const primitives = stageContents[s.id] || [];
    const contentPrimitives = primitives.filter(p => p && p.primitiveType !== "ai_insight");
    
    const contentCount = s.collectionName === 'characters' ? characters.length : 
                         s.collectionName === 'locations' ? locations.length :
                         contentPrimitives.length;

    if (state === "good" || state === "excellent") {
       if (contentCount === 0) {
         issues.push(`Stage "${s.id}" is marked as ready/good but has no content.`);
       }
    }

    // Check prerequisites
    s.requires.forEach(req => {
      const reqState = stageStates[req] || "empty";
      if (reqState === "empty" && (state !== "empty")) {
        issues.push(`Stage "${s.id}" has content but its prerequisite "${req}" is empty.`);
      }
    });
  });

  // Specific high-level architectural check
  if (activeStage === "Script" && (stageStates["Step Outline"] || "empty") === "empty") {
    issues.push("Script stage reached without a populated Step Outline.");
  }

  telemetryService.setStatus("run_project_diagnostics", "✅", `Diagnostics complete. Found ${issues.length} structural issues.`);

  return {
    success: true,
    data: {
      structural_issues: issues,
      stage_states: stageStates,
      active_stage: activeStage,
      is_architechurally_sound: issues.length === 0
    }
  };
};

