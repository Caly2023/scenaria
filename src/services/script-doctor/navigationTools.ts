import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgString } from "../../utils/scriptDoctorUtils";
import { WorkflowStage } from "../../types";

/**
 * navigate_to_stage
 * Pilote l'interface utilisateur pour naviguer vers une étape précise du workflow.
 * Permet à l'agent de "diriger l'écran" pendant qu'il explique son analyse dans le chat.
 */
export const navigateToStage: ToolHandler = async (args, context) => {
  const { handleStageChange, addToast, t } = context;
  const stage = getArgString(args, "stage") as WorkflowStage ?? "";

  if (!stage) return { success: false, error: "stage argument is required" };

  telemetryService.setStatus("navigate_to_stage", "🧭", `Navigating to: ${stage}...`);

  if (!handleStageChange) {
    return {
      success: false,
      error: "Navigation handler not available in current context.",
    };
  }

  try {
    handleStageChange(stage);
    addToast(`🧭 Viewing: ${stage}`, "info");
    telemetryService.setStatus("navigate_to_stage", "✅", `UI navigated to ${stage}.`);
    return { success: true, navigated_to: stage };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * focus_element
 * Met en surbrillance (highlight) un primitif spécifique dans l'interface active.
 * Injecte un attribut data-highlight sur le DOM via une custom event.
 * Permet à l'agent de "pointer" un élément précis pendant qu'il l'analyse.
 */
export const focusElement: ToolHandler = async (args, context) => {
  const { addToast } = context;
  const primitiveId = getArgString(args, "primitive_id") ?? "";
  const message = getArgString(args, "message") ?? "";

  if (!primitiveId) return { success: false, error: "primitive_id argument is required" };

  telemetryService.setStatus("focus_element", "🎯", `Highlighting element: ${primitiveId}...`);

  try {
    // Dispatch a custom browser event to trigger UI highlight
    const event = new CustomEvent("scenaria:highlight", {
      detail: { primitiveId, message },
      bubbles: true,
    });
    document.dispatchEvent(event);

    // Also set a data attribute on the target element (if exists in DOM)
    const el = document.querySelector(`[data-primitive-id="${primitiveId}"]`);
    if (el) {
      el.setAttribute("data-highlighted", "true");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Auto-remove highlight after 4 seconds
      setTimeout(() => el.removeAttribute("data-highlighted"), 4000);
    }

    if (message) {
      addToast(`🎯 ${message}`, "info");
    }

    telemetryService.setStatus("focus_element", "✅", `Element ${primitiveId} highlighted.`);
    return { success: true, primitive_id: primitiveId, found_in_dom: !!el };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * toggle_ui_panel
 * Permet à l'agent de manipuler l'interface utilisateur en ouvrant ou fermant
 * des panneaux spécifiques (chat, settings, sidebar, help).
 */
export const toggleUiPanel: ToolHandler = async (args, context) => {
  const panel = getArgString(args, "panel") ?? "";
  const state = getArgString(args, "state") ?? "toggle"; // "open" | "close" | "toggle"

  if (!panel) return { success: false, error: "panel argument is required" };

  telemetryService.setStatus("toggle_ui_panel", "🖥️", `${state}ing panel: ${panel}...`);

  try {
    const event = new CustomEvent("scenaria:ui_panel_control", {
      detail: { panel, state },
      bubbles: true,
    });
    document.dispatchEvent(event);

    return { success: true, panel, state };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

