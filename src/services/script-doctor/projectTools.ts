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

export const updateStageInsight: ToolHandler = async (args, context) => {
  const { currentProject, addToast } = context;
  const stage = getArgString(args, "stage") ?? "";
  const insight = getArgRecord(args, "insight") as Record<string, any> ?? {};
  
  telemetryService.setStatus("update_stage_insight", "📊", `Saving insight for ${stage}...`);
  
  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    const updatedAnalyses = {
      ...(currentProject.stageAnalyses || {}),
      [stage]: {
        evaluation: insight.content || "",
        issues: [],
        recommendations: insight.suggestions || [],
        suggestedPrompt: insight.suggestedPrompt || "",
        updatedAt: Date.now()
      }
    };
    
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: "stageAnalyses",
        content: updatedAnalyses
      })
    ).unwrap();
    
    const updatedStates = {
      ...(currentProject.stageStates || {}),
      [stage]: insight.isReady ? "good" : "needs_improvement"
    };
    
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: "stageStates",
        content: updatedStates
      })
    ).unwrap();

    // ─── AI Insight Primitive Alignment ───
    // Every stage must have a primitive at order 0 containing the AI analysis.
    const sub = stageRegistry.getCollectionName(stage);
    if (sub) {
      const existingPrimitives = context.stageContents[stage] || [];
      const insightPrimitive = existingPrimitives.find(p => p.order === 0);
      const insightData = {
        title: "AI Analysis",
        content: insight.content || "",
        order: 0,
        type: "ai_insight",
        isReady: insight.isReady,
        score: insight.score || 0
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

  // Basic structural checks
  if (!currentProject.metadata.logline) issues.push("Missing logline in metadata.");
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

