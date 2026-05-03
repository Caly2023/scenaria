import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { WorkflowStage } from "../../types";
import { getArgRecord, getArgString } from "../../utils/scriptDoctorUtils";
import { stageRegistry } from "../../config/stageRegistry";

export const fetchProjectState: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations } = context;
  telemetryService.setStatus("fetch_project_state", "🧠", "Loading full project state...");
  const idMapSnapshot = telemetryService.getIdMapSnapshot();
  
  const allStages = stageRegistry.getAll();
  const stagesCount: Record<string, number> = {};
  
  allStages.forEach(stageDef => {
    const stageId = stageDef.id;
    const collectionName = stageDef.collectionName;

    if (collectionName === "bible_primitives") {
      stagesCount[stageId] = (stageContents[stageId] || []).length;
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
  const { currentProject, addToast } = context;
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
  
  addToast(context.t("common.metadataSynced"), "success");
  telemetryService.setStatus("sync_metadata", "✅", `Metadata synchronization complete.`);
  return { success: true };
};

export const updateStageInsight: ToolHandler = async (args, context) => {
  const { currentProject } = context;
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
    const currentValidated = currentProject.validatedStages || [];
    let newValidatedStages: WorkflowStage[];
    
    if (newState === "good" || newState === "excellent") {
      newValidatedStages = Array.from(new Set([...currentValidated, stage as WorkflowStage]));
    } else {
      // Remove from validated stages if it's no longer good/excellent
      newValidatedStages = currentValidated.filter(s => s !== stage);
    }

    if (JSON.stringify(newValidatedStages) !== JSON.stringify(currentValidated)) {
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
    // Avoid adding insight primitives to Bible collections which have strict schemas
    if (sub && sub !== "bible_primitives") {
      const primitivesForStage = (context.stageContents || {})[stage];
      const existingPrimitives = Array.isArray(primitivesForStage) ? primitivesForStage : [];
      
      // CRITICAL FIX: Only target primitives explicitly marked as ai_insight to avoid overwriting content at order 0
      const insightPrimitive = (existingPrimitives || []).find(p => p && p.primitiveType === "ai_insight");
      
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
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
  
  telemetryService.setStatus("update_stage_insight", "✅", `Insight and AI Analysis primitive saved.`);
  return { success: true };
};

/**
 * run_project_diagnostics
 */
export const runProjectDiagnostics: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations } = context;
  telemetryService.setStatus("run_project_diagnostics", "🔍", "Running deep project diagnostics...");

  const issues: string[] = [];
  const metadata = currentProject.metadata || {};

  // Basic structural checks
  if (!metadata.logline) issues.push("Missing logline in metadata.");
  if (!metadata.title) issues.push("Project title is not defined.");
  
  const biblePrims = stageContents['Story Bible'] || [];
  const chars = biblePrims.filter(p => p.primitiveType === 'character');
  const locs = biblePrims.filter(p => p.primitiveType === 'location');

  if (chars.length === 0) issues.push("No characters in Story Bible.");
  if (locs.length === 0) issues.push("No locations in Story Bible.");
  
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
    
    const contentCount = contentPrimitives.length;

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
  if (activeStage === "Final Screenplay" && (stageStates["Sequencer"] || "empty") === "empty") {
    issues.push("Final Screenplay stage reached without a populated Sequencer.");
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
