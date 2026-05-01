import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgString, getArgRecord, getArgArray } from "../../utils/scriptDoctorUtils";

/**
 * undo_last_action
 * Annule la dernière mutation Firestore enregistrée par l'agent dans l'historique d'actions.
 * Utilise un stack en mémoire (actionHistory) pour retrouver la dernière action
 * et dispatche un revert via RTK Query.
 */

// In-process action history stack (keyed by project id)
const actionHistoryStack: Map<string, Array<{
  type: string;
  collectionName?: string;
  docId?: string;
  previousData?: Record<string, any>;
  projectId: string;
  timestamp: number;
}>> = new Map();

/**
 * registerAction — used internally by other tool handlers to log reversible actions.
 * Call this after each successful write to enable undo.
 */
export function registerUndoableAction(
  projectId: string,
  type: string,
  payload: {
    collectionName?: string;
    docId?: string;
    previousData?: Record<string, any>;
  }
) {
  if (!actionHistoryStack.has(projectId)) {
    actionHistoryStack.set(projectId, []);
  }
  const stack = actionHistoryStack.get(projectId)!;
  stack.push({ type, projectId, timestamp: Date.now(), ...payload });

  // Keep stack bounded (last 20 actions)
  if (stack.length > 20) stack.shift();
}

export const undoLastAction: ToolHandler = async (args, context) => {
  const { currentProject, addToast, t } = context;

  telemetryService.setStatus("undo_last_action", "↩️", `Reverting last action...`);

  const stack = actionHistoryStack.get(currentProject.id);
  if (!stack || stack.length === 0) {
    return { success: false, error: "No reversible actions in history." };
  }

  const lastAction = stack.pop()!;

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    if (lastAction.type === "update" && lastAction.collectionName && lastAction.docId && lastAction.previousData) {
      await store.dispatch(
        firebaseService.endpoints.updateSubcollectionDoc.initiate({
          projectId: lastAction.projectId,
          collectionName: lastAction.collectionName,
          docId: lastAction.docId,
          data: lastAction.previousData,
        })
      ).unwrap();

    } else if (lastAction.type === "add" && lastAction.collectionName && lastAction.docId) {
      await store.dispatch(
        firebaseService.endpoints.deleteSubcollectionDoc.initiate({
          projectId: lastAction.projectId,
          collectionName: lastAction.collectionName,
          docId: lastAction.docId,
        })
      ).unwrap();

    } else if (lastAction.type === "delete" && lastAction.collectionName && lastAction.previousData) {
      await store.dispatch(
        firebaseService.endpoints.addSubcollectionDoc.initiate({
          projectId: lastAction.projectId,
          collectionName: lastAction.collectionName,
          data: lastAction.previousData,
        })
      ).unwrap();
    } else {
      return { success: false, error: `Cannot revert action of type: ${lastAction.type}` };
    }

    addToast(`↩️ ${t("common.actionReverted")}`, "info");
    telemetryService.setStatus("undo_last_action", "✅", `Action reverted.`);
    return { success: true, reverted: lastAction.type, timestamp: lastAction.timestamp };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * request_user_approval
 * Pour les actions destructrices ou irréversibles, l'agent demande confirmation
 * avant d'exécuter. Affiche une modale de confirmation dans l'UI via un CustomEvent.
 * Le résultat (approved/rejected) est renvoyé de façon asynchrone via Promise.
 */
export const requestUserApproval: ToolHandler = async (args, context) => {
  const { addToast } = context;
  const action = getArgString(args, "action") ?? "action inconnue";
  const description = getArgString(args, "description") ?? "";
  const risk_level = getArgString(args, "risk_level") ?? "medium"; // low | medium | high

  telemetryService.setStatus("request_user_approval", "⚠️", `Requesting approval: ${action}...`);

  return new Promise((resolve) => {
    const requestId = `approval_${Date.now()}`;

    // Listener for user response
    const handler = (e: Event) => {
      const { id, approved } = (e as CustomEvent).detail;
      if (id !== requestId) return;
      document.removeEventListener("scenaria:approval_response", handler);
      clearTimeout(timeoutId);

      if (approved) {
        telemetryService.setStatus("request_user_approval", "✅", `Approved: ${action}`);
        resolve({ success: true, approved: true, action });
      } else {
        telemetryService.setStatus("request_user_approval", "🚫", `Rejected: ${action}`);
        resolve({ success: true, approved: false, action });
      }
    };

    document.addEventListener("scenaria:approval_response", handler);

    // Dispatch request event to UI
    document.dispatchEvent(new CustomEvent("scenaria:approval_request", {
      detail: { id: requestId, action, description, risk_level },
      bubbles: true,
    }));

    // Timeout: auto-reject after 30 seconds if user doesn't respond
    const timeoutId = setTimeout(() => {
      document.removeEventListener("scenaria:approval_response", handler);
      addToast("⏱️ Approbation expirée.", "info");
      resolve({ success: true, approved: false, action, reason: "timeout" });
    }, 30000);
  });
};
