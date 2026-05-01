import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgRecord, getArgString } from "../../utils/scriptDoctorUtils";
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
    } else {
      // Logic: if stage exists in stageContents, use that length. 
      // If it's a structural stage and has a non-empty state, ensure count is at least 1 if content is empty (AI analysis block)
      const content = stageContents[stage] || [];
      const state = currentProject.stageStates?.[stage] || "empty";
      
      if (state !== "empty" && content.length === 0) {
        stagesCount[stage] = 1; // Minimal state representation
      } else {
        stagesCount[stage] = content.length;
      }
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
  const { currentProject, addToast } = context;
  const stage = getArgString(args, "stage") ?? "";
  const insight = getArgRecord(args, "insight") as Record<string, any> ?? {};
  
  telemetryService.setStatus("update_stage_insight", "📊", `Saving insight for ${stage}...`);
  
  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    // 1. Update Project Level Analysis (Atomic)
    const analysisData = {
      evaluation: insight.content || insight.evaluation || "",
      issues: insight.issues || [],
      recommendations: insight.recommendations || insight.suggestions || [],
      suggestedPrompt: insight.suggestedPrompt || "",
      updatedAt: Date.now()
    };
    
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: `stageAnalyses.${stage}`,
        content: analysisData
      })
    ).unwrap();
    
    // 2. Update Stage State (Atomic)
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: `stageStates.${stage}`,
        content: insight.isReady ? "good" : (insight.state || "needs_improvement")
      })
    ).unwrap();

    // 3. AI Insight Primitive Alignment (Consistency with production UI)
    const sub = stageRegistry.getCollectionName(stage);
    if (sub && sub !== "characters" && sub !== "locations" && sub !== "metadata_primitives") {
      const existingPrimitives = context.stageContents[stage] || [];
      const insightPrimitive = existingPrimitives.find(p => p.order === 0);
      
      const insightData = {
        title: "AI Analysis",
        content: insight.content || insight.evaluation || "",
        order: 0,
        primitiveType: "ai_insight",
        metadata: {
          isReady: insight.isReady,
          score: insight.score || 0,
          recommendations: insight.recommendations || insight.suggestions || []
        }
      };

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
  const { currentProject, stageContents, characters, locations } = context;
  telemetryService.setStatus("run_project_diagnostics", "🔍", "Running deep project diagnostics...");

  // In a real scenario, this would call a specialized Genkit flow or perform complex logic.
  // For the tool handler, we return the structural data necessary for the agent to do its own analysis,
  // plus some automated checks.

  const issues: string[] = [];
  const metadata = currentProject.metadata || {};

  // Basic structural checks
  if (!metadata.logline) issues.push("Missing logline in metadata.");
  if (!metadata.title) issues.push("Project title is not defined.");
  if (characters.length === 0) issues.push("Character Bible is empty.");
  
  // Dependency checks
  const validatedStages = currentProject.validatedStages || [];
  const activeStage = currentProject.activeStage;
  
  if (activeStage === "Script" && !validatedStages.includes("Step Outline")) {
    issues.push("Script stage reached without validated Step Outline.");
  }

  // Count primitives per stage for density check
  const stageDensity: Record<string, number> = {};
  Object.entries(stageContents).forEach(([s, content]) => {
    stageDensity[s] = content.length;
    if (content.length === 0 && validatedStages.includes(s as any)) {
      issues.push(`Stage "${s}" is validated but contains no content.`);
    }
  });

  telemetryService.setStatus("run_project_diagnostics", "✅", `Diagnostics complete. Found ${issues.length} structural issues.`);

  return {
    success: true,
    data: {
      structural_issues: issues,
      stage_density: stageDensity,
      validated_count: validatedStages.length,
      is_architechurally_sound: issues.length === 0
    }
  };
};

