import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgString, getArgBoolean } from "../../utils/scriptDoctorUtils";
import { WorkflowStage } from "../../types";

/**
 * trigger_stage_generation
 * Déclenche la génération IA d'une étape complète via le pipeline Genkit/agent existant.
 * L'agent peut ainsi initier la création de contenu pour n'importe quelle étape
 * sans intervention manuelle de l'utilisateur.
 */
export const triggerStageGenerationHandler: ToolHandler = async (args, context) => {
  const { currentProject, addToast, t, triggerStageGeneration: triggerFn } = context;
  const stage = getArgString(args, "stage") as WorkflowStage ?? "";
  const force = getArgBoolean(args, "force") ?? false;

  if (!stage) return { success: false, error: "stage argument is required" };

  telemetryService.setStatus("trigger_stage_generation", "🚀", `Initiating generation pipeline for ${stage}...`);

  // If a dedicated trigger fn was injected via context (from useStageLifecycle), use it
  if (triggerFn) {
    try {
      await triggerFn(stage);
      addToast(t("common.stageGenerationStarted", { stage }), "info");
      telemetryService.setStatus("trigger_stage_generation", "✅", `Generation dispatched for ${stage}.`);
      return { success: true, stage };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Fallback: use the orchestration layer directly
  try {
    const { agentRegistry } = await import("../../agents/agentRegistry");
    const { persistAgentOutput, buildProjectContext } = await import("../orchestration");
    const { store } = await import("../../store");
    const { firebaseService } = await import("../firebaseService");

    const agent = await agentRegistry.get(stage);
    if (!agent) {
      return { success: false, error: `No agent registered for stage: ${stage}` };
    }

    // Check if content already exists (unless force=true)
    if (!force) {
      const stageState = currentProject.stageStates?.[stage];
      if (stageState && stageState !== "empty") {
        return {
          success: false,
          error: `Stage "${stage}" already has content. Use force=true to regenerate.`,
        };
      }
    }

    // Clear existing content if force
    if (force) {
      const { stageRegistry } = await import("../../config/stageRegistry");
      const collectionName = stageRegistry.getCollectionName(stage);
      if (collectionName) {
        await store.dispatch(
          firebaseService.endpoints.clearSubcollection.initiate({
            projectId: currentProject.id,
            collectionName,
          })
        ).unwrap();
      }
    }

    const projectContext = buildProjectContext(
      currentProject.id,
      currentProject.metadata,
      context.stageContents,
      currentProject.stageAnalyses || {}
    );

    addToast(t("common.stageGenerationStarted", { stage }), "info");

    const output = await agent.generate(projectContext);
    const result = await persistAgentOutput(currentProject.id, stage, output, { replaceAll: true });

    if (!result.success) {
      return { success: false, error: result.error || "Persist failed" };
    }

    addToast(t("common.stageGenerationComplete", { stage }), "success");
    telemetryService.setStatus("trigger_stage_generation", "✅", `${stage} generated successfully.`);
    return {
      success: true,
      stage,
      primitives_created: result.primitiveIds?.length ?? 0,
    };
  } catch (error: any) {
    telemetryService.setStatus("trigger_stage_generation", "❌", `Generation failed for ${stage}.`);
    return { success: false, error: error.message };
  }
};

/**
 * approve_stage
 * Valide formellement une étape et déclenche l'activation de l'étape suivante.
 * Met à jour validatedStages + activeStage dans Firestore via le service RTK.
 */
export const approveStage: ToolHandler = async (args, context) => {
  const { currentProject, addToast, t, triggerStageGeneration: triggerFn } = context;
  const stage = getArgString(args, "stage") as WorkflowStage ?? "";

  if (!stage) return { success: false, error: "stage argument is required" };

  telemetryService.setStatus("approve_stage", "✅", `Approving stage: ${stage}...`);

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");
  const { stageRegistry } = await import("../../config/stageRegistry");

  try {
    // 1. Update Stage State to 'good'
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: `stageStates.${stage}`,
        content: "good",
      })
    ).unwrap();

    // 2. Add to validatedStages (legacy support)
    const newValidatedStages = Array.from(
      new Set([...(currentProject.validatedStages || []), stage])
    );
    await store.dispatch(
      firebaseService.endpoints.updateProjectField.initiate({
        id: currentProject.id,
        field: "validatedStages",
        content: newValidatedStages,
      })
    ).unwrap();

    // 3. Advance to the next stage
    const allStageIds = stageRegistry.getAllIds();
    const currentIndex = allStageIds.indexOf(stage);
    const nextStage = allStageIds[currentIndex + 1] as WorkflowStage | undefined;

    if (nextStage) {
      await store.dispatch(
        firebaseService.endpoints.updateProjectField.initiate({
          id: currentProject.id,
          field: "activeStage",
          content: nextStage,
        })
      ).unwrap();
      addToast(`✅ ${stage} approuvé. Passage à ${nextStage}.`, "success");
      if (triggerFn) {
        await triggerFn(nextStage);
      }
      telemetryService.setStatus("approve_stage", "✅", `${stage} → ${nextStage}`);
      return { success: true, approved_stage: stage, next_stage: nextStage };
    }

    addToast(`✅ ${stage} approuvé. Projet finalisé !`, "success");
    telemetryService.setStatus("approve_stage", "✅", `${stage} is the final stage.`);
    return { success: true, approved_stage: stage, next_stage: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
