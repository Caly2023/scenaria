import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Project,
  WorkflowStage,
  Sequence,
  Character,
  Location,
  StageState,
} from "../types";
import { contextAssembler } from "../services/contextAssembler";
import { telemetryService } from "../services/telemetryService";

type ScriptDoctorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: string;
  thinking?: string;
  suggested_actions?: string[];
  active_tool?: string;
  timestamp: number;
};

type ToolCall = {
  name: string;
  args?: Record<string, unknown>;
};

type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  error_code?: number;
  [key: string]: unknown;
};

function getArgString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function getArgNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" ? value : undefined;
}

function getArgRecord(args: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = args[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function getArgArray(args: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = args[key];
  return Array.isArray(value) ? value : undefined;
}

interface UseScriptDoctorProps {
  currentProject: Project | null;
  activeStage: WorkflowStage;
  sequences: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  /** Brainstorming/pitch primitives — used by research_context tool */
  pitchPrimitives?: Sequence[];
  characters: Character[];
  locations: Location[];
  addToast: (msg: string, type: "error" | "info" | "success") => void;
  setRefiningBlockId: (id: string | null) => void;
  /** Optional: signals the UI which primitive was last updated by the agent */
  setLastUpdatedPrimitiveId?: (id: string | null) => void;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
}

export function useScriptDoctor({
  currentProject,
  activeStage,
  sequences,
  treatmentSequences,
  scriptScenes,
  pitchPrimitives = [],
  characters,
  locations,
  addToast,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  handleStageAnalyze,
}: UseScriptDoctorProps) {
  const { t } = useTranslation();

  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [doctorMessages, setDoctorMessages] = useState<ScriptDoctorMessage[]>([]);
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);
  const [isHeavyThinking, setIsHeavyThinking] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [isInDegradedMode, setIsInDegradedMode] = useState(false);

  const subcollectionMap: Record<string, string> = {
    Brainstorming: "pitch_primitives",
    Logline: "logline_primitives",
    "3-Act Structure": "structure_primitives",
    Synopsis: "synopsis_primitives",
    "Character Bible": "characters",
    "Location Bible": "locations",
    Treatment: "treatment_sequences",
    "Step Outline": "sequences",
    Script: "script_scenes",
  };

  const executeToolCall = async (
    call: ToolCall,
    retryAttempt: number = 0,
  ): Promise<ToolResult> => {
    if (!currentProject)
      return { success: false, error: "No active project", error_code: 0 };
    const { name } = call;
    const args = call.args ?? {};
    setActiveTool(name);

    try {
      const { db } = await import("../lib/firebase");
      const {
        doc,
        updateDoc,
        serverTimestamp,
        getDoc,
        addDoc,
        collection,
        deleteDoc,
        getDocs,
        writeBatch,
      } = await import("firebase/firestore");

      switch (name) {
        case "fetch_project_state": {
          telemetryService.setStatus(
            "fetch_project_state",
            "🧠",
            "Loading full project state + ID-Map...",
          );
          const idMapSnapshot = telemetryService.getIdMapSnapshot();
          const state = {
            metadata: currentProject.metadata,
            stages: {
              Logline:
                currentProject.stageStates?.["Logline"] !== "empty" ? 1 : 0,
              Brainstorming:
                currentProject.stageStates?.["Brainstorming"] !== "empty"
                  ? 1
                  : 0,
              "3-Act Structure":
                currentProject.stageStates?.["3-Act Structure"] !== "empty"
                  ? 1
                  : 0,
              Synopsis:
                currentProject.stageStates?.["Synopsis"] !== "empty" ? 1 : 0,
              "Character Bible": characters.length,
              "Location Bible": locations.length,
              "Step Outline": sequences.length,
              Treatment: treatmentSequences.length,
              Script: scriptScenes.length,
            },
            id_map: idMapSnapshot,
          };
          return { success: true, data: state };
        }

        case "get_stage_structure": {
          const stage_id = getArgString(args, "stage_id") ?? "";
          telemetryService.setStatus(
            "get_stage_structure",
            "🧠",
            `Mapping Primitive IDs for ${stage_id}...`,
          );

          const structure = await contextAssembler.getStageStructure(
            currentProject.id,
            stage_id,
          );
          const stageEntry = telemetryService.getStageStructure(stage_id);

          return {
            success: true,
            data: {
              stage_id,
              total_count: structure.length,
              primitives: structure.map((p) => ({
                primitive_id: p.id,
                title: p.title,
                content: p.content,
                order_index: p.order,
              })),
              last_fetched: stageEntry?.last_fetched || Date.now(),
            },
          };
        }

        case "research_context": {
          const stageName = getArgString(args, "stageName") ?? "";
          telemetryService.setStatus(
            "research_context",
            "🔍",
            `Retrieving ${stageName} with primitive IDs...`,
          );

          const enrichWithIds = (items: Array<Record<string, unknown>>) =>
            items.map((item) => {
              const id = typeof item.id === "string" ? item.id : "";
              const title =
                (typeof item.title === "string" && item.title) ||
                (typeof item.name === "string" && item.name) ||
                "";
              const content =
                (typeof item.content === "string" && item.content) ||
                (typeof item.description === "string" && item.description) ||
                "";
              const order_index = typeof item.order === "number" ? item.order : 0;

              return {
                primitive_id: id,
                title,
                content,
                order_index,
                ...item,
              };
            });

          // Use already-loaded props data where available to avoid redundant fetches
          if (stageName === "Brainstorming")
            return { success: true, data: enrichWithIds(pitchPrimitives as unknown as Array<Record<string, unknown>>) };
          if (stageName === "Character Bible")
            return { success: true, data: enrichWithIds(characters as unknown as Array<Record<string, unknown>>) };
          if (stageName === "Location Bible")
            return { success: true, data: enrichWithIds(locations as unknown as Array<Record<string, unknown>>) };
          if (stageName === "Step Outline")
            return { success: true, data: enrichWithIds(sequences as unknown as Array<Record<string, unknown>>) };
          if (stageName === "Treatment")
            return { success: true, data: enrichWithIds(treatmentSequences as unknown as Array<Record<string, unknown>>) };
          if (stageName === "Script")
            return { success: true, data: enrichWithIds(scriptScenes as unknown as Array<Record<string, unknown>>) };

          const structure = await contextAssembler.getStageStructure(
            currentProject.id,
            stageName,
          );
          if (structure && structure.length > 0) {
            return { success: true, data: enrichWithIds(structure) };
          }
          return {
            success: false,
            error: `No content found for stage: ${stageName}`,
            error_code: 404,
          };
        }

        case "fetch_character_details": {
          const characterId = getArgString(args, "characterId") ?? "";
          const char = characters.find((c) => c.id === characterId);
          if (!char)
            return {
              success: false,
              error: `Character with primitive_id '${characterId}' not found`,
              error_code: 404,
            };
          return { success: true, data: { primitive_id: char.id, ...char } };
        }

        case "search_project_content": {
          const searchQuery = getArgString(args, "query") ?? "";
          const q = searchQuery.toLowerCase();
          const results = {
            characters: characters
              .filter(
                (c) =>
                  c.name.toLowerCase().includes(q) ||
                  c.description.toLowerCase().includes(q),
              )
              .map((c) => ({ primitive_id: c.id, ...c })),
            locations: locations
              .filter(
                (l) =>
                  l.name.toLowerCase().includes(q) ||
                  l.description.toLowerCase().includes(q),
              )
              .map((l) => ({ primitive_id: l.id, ...l })),
            sequences: sequences
              .filter(
                (s) =>
                  s.title.toLowerCase().includes(q) ||
                  s.content.toLowerCase().includes(q),
              )
              .map((s) => ({ primitive_id: s.id, ...s })),
            treatment: treatmentSequences
              .filter(
                (s) =>
                  s.title.toLowerCase().includes(q) ||
                  s.content.toLowerCase().includes(q),
              )
              .map((s) => ({ primitive_id: s.id, ...s })),
            script: scriptScenes
              .filter(
                (s) =>
                  s.title.toLowerCase().includes(q) ||
                  s.content.toLowerCase().includes(q),
              )
              .map((s) => ({ primitive_id: s.id, ...s })),
            metadata: currentProject.metadata?.title?.toLowerCase().includes(q),
          };
          return { success: true, data: results };
        }

        case "propose_patch": {
          const id = getArgString(args, "id") ?? "";
          const stage = getArgString(args, "stage") ?? "";
          const updates = getArgRecord(args, "updates");
          telemetryService.setStatus(
            "propose_patch",
            "📡",
            `Sending update to Firebase (ID: ${id})...`,
            id,
          );
          setRefiningBlockId(id);

          if (!updates || Object.keys(updates).length === 0) {
            setRefiningBlockId(null);
            return {
              success: false,
              error: "Empty content update",
              error_code: 400,
            };
          }

          const subcollection = subcollectionMap[stage];

          if (subcollection) {
            const docRef = doc(
              db,
              "projects",
              currentProject.id,
              subcollection,
              id,
            );

            const existingDoc = await getDoc(docRef);
            if (!existingDoc.exists()) {
              setRefiningBlockId(null);
              telemetryService.recordFailure(id);
              return {
                success: false,
                error: `Document with primitive_id '${id}' not found in ${subcollection}`,
                error_code: 404,
                primitive_id: id,
              };
            }

            // ── Field aliasing for character/location documents ──────────────
            // Firestore character docs use 'name' + 'description'.
            // AI agents always send 'title' + 'content'.
            // We map both directions so both field names are updated correctly.
            const safeUpdates: Record<string, unknown> = { ...updates };
            if (stage === "Character Bible" || stage === "Location Bible") {
              if (typeof updates.title === "string") {
                safeUpdates.name = updates.title;
              }
              if (typeof updates.content === "string") {
                safeUpdates.description = updates.content;
              }
            }



            await updateDoc(docRef, {
              ...safeUpdates,
              updatedAt: serverTimestamp(),
            });

            const updatedDoc = await getDoc(docRef);
            const snapshot = updatedDoc.exists()
              ? { id: updatedDoc.id, ...updatedDoc.data() }
              : null;

            await handleStageAnalyze(stage as WorkflowStage);

            // Signal the UI that this primitive was last updated
            setLastUpdatedPrimitiveId?.(id);
            setRefiningBlockId(null);

            addToast(
              t("common.primitiveUpdated", {
                defaultValue: `Primitive ${String(id).substring(0, 8)}... updated by Architect`,
              }),
              "success",
            );
            return {
              success: true,
              primitive_id: id,
              updated_snapshot: snapshot,
            };
          } else {
            return {
              success: false,
              error: `Invalid stage: ${stage}`,
              error_code: 404,
            };
          }
        }

        case "execute_multi_stage_fix": {
          const fixes = getArgArray(args, "fixes");
          if (!fixes || !Array.isArray(fixes))
            return {
              success: false,
              error: "Invalid fixes array",
              error_code: 400,
            };

          const results: Array<{
            primitive_id: string;
            success: boolean;
            error?: string;
          }> = [];

          for (const fix of fixes) {
            if (!fix || typeof fix !== "object" || Array.isArray(fix)) {
              results.push({
                primitive_id: "",
                success: false,
                error: "Invalid fix entry",
              });
              continue;
            }
            const fixObj = fix as Record<string, unknown>;
            const id = getArgString(fixObj, "id") ?? "";
            const stage = getArgString(fixObj, "stage") ?? "";
            const updates = getArgRecord(fixObj, "updates") ?? {};
            telemetryService.setStatus(
              "multi_stage_fix",
              "📡",
              `Sending update to Firebase (ID: ${id})...`,
              id,
            );

            try {
              const subcollection = subcollectionMap[stage];
              if (subcollection) {
                const safeUpdates: Record<string, unknown> = { ...updates };

                // Firestore character/location docs use 'name' + 'description'.
                // Script Doctor sometimes sends 'title' + 'content' instead.
                if (stage === "Character Bible" || stage === "Location Bible") {
                  if (typeof safeUpdates.title === "string") safeUpdates.name = safeUpdates.title;
                  if (typeof safeUpdates.content === "string") {
                    safeUpdates.description = safeUpdates.content;
                  }
                }

                await updateDoc(
                  doc(db, "projects", currentProject.id, subcollection, id),
                  {
                    ...safeUpdates,
                    updatedAt: serverTimestamp(),
                  },
                );
                telemetryService.invalidateStage(stage);
              }
              results.push({ primitive_id: id, success: true });
            } catch (fixError) {
              const classification =
                telemetryService.classifyFirebaseError(fixError);
              results.push({
                primitive_id: id,
                success: false,
                error: classification.message,
              });
            }
          }

          const allSuccess = results.every((r) => r.success);
          telemetryService.setStatus(
            "Confirmed",
            "✅",
            `Multi-stage fix: ${results.filter((r) => r.success).length}/${results.length} updated.`,
          );

          // Enforce Agent Contract for all uniquely touched stages
          const uniqueStages = [
            ...new Set(fixes.map((f: any) => f.stage)),
          ] as WorkflowStage[];
          await Promise.all(uniqueStages.map((s) => handleStageAnalyze(s)));

          addToast(
            t("common.multiStageFixApplied", {
              defaultValue: "Multi-stage fix applied successfully",
            }),
            "success",
          );
          return { success: allSuccess, updated_ids: results };
        }

        case "sync_metadata": {
          const metadata = getArgRecord(args, "metadata") ?? {};
          await updateDoc(doc(db, "projects", currentProject.id), {
            metadata: {
              ...currentProject.metadata,
              ...metadata,
            },
            updatedAt: serverTimestamp(),
          });
          telemetryService.setStatus(
            "Confirmed",
            "✅",
            "Project metadata synced.",
          );
          addToast(
            t("common.metadataSynced", {
              defaultValue: "Project metadata synced",
            }),
            "success",
          );
          return { success: true };
        }

        case "add_primitive": {
          const stage = getArgString(args, "stage") ?? "";
          const primitive = getArgRecord(args, "primitive") ?? {};
          const position = getArgNumber(args, "position");
          const subcollection = subcollectionMap[stage];

          if (subcollection) {
            // ── Required-field guard ────────────────────────────────────────
            // AI agents don't always provide every required field.
            // We normalise here so the Firestore write never fails validation.
            const safeTitle =
              (typeof primitive.title === "string" && primitive.title) ||
              (typeof primitive.name === "string" && primitive.name) ||
              "Untitled";
            const safeContent =
              (typeof primitive.content === "string" && primitive.content) ||
              (typeof primitive.description === "string" && primitive.description) ||
              "";

            const safeData: Record<string, unknown> = {
              // Standard fields — provide safe defaults before AI spread
              title: safeTitle,
              content: safeContent,
              order: position ?? (typeof primitive.order === "number" ? primitive.order : 0),
              projectId: currentProject.id,
              createdAt: serverTimestamp(),
              // Spread remaining AI-provided fields (may override above if better)
              ...primitive,
              // Field aliasing for character/location collections
              // Firestore character/location docs use 'name' + 'description'.
              ...(stage === 'Character Bible' || stage === 'Location Bible'
                ? {
                    name:
                      (typeof primitive.name === "string" && primitive.name) || safeTitle,
                    description:
                      (typeof primitive.description === "string" && primitive.description) ||
                      safeContent,
                  }
                : {}),
            };
            // Ensure projectId is always correct (spread from primitive could override it)
            safeData.projectId = currentProject.id;



            const newDocRef = await addDoc(
              collection(db, "projects", currentProject.id, subcollection),
              safeData,
            );
            telemetryService.invalidateStage(stage);
            telemetryService.setStatus(
              "Confirmed",
              "✅",
              `New primitive created (ID: ${newDocRef.id}).`,
            );

            // Enforce Agent Contract
            await handleStageAnalyze(stage as WorkflowStage);

            addToast(
              t("common.primitiveAdded", {
                defaultValue: "New element added to project",
              }),
              "success",
            );
            return { success: true, primitive_id: newDocRef.id };
          } else {
            return {
              success: false,
              error: `Adding primitives not supported for stage: ${stage}`,
              error_code: 400,
            };
          }
        }

        case "delete_primitive": {
          const id = getArgString(args, "id") ?? "";
          const stage = getArgString(args, "stage") ?? "";
          const subcollection = subcollectionMap[stage];

          if (subcollection) {
            await deleteDoc(
              doc(db, "projects", currentProject.id, subcollection, id),
            );
            telemetryService.invalidateStage(stage);
            telemetryService.setStatus(
              "Confirmed",
              "✅",
              `Primitive ${id} removed.`,
              id,
            );

            // Enforce Agent Contract
            await handleStageAnalyze(stage as WorkflowStage);

            addToast(
              t("common.primitiveDeleted", {
                defaultValue: "Element removed from project",
              }),
              "info",
            );
            return { success: true, deleted_primitive_id: id };
          } else {
            return {
              success: false,
              error: `Deleting primitives not supported for stage: ${stage}`,
              error_code: 400,
            };
          }
        }

        case "restructure_stage": {
          const stage = getArgString(args, "stage") ?? "";
          const primitives = getArgArray(args, "primitives");
          if (!primitives || !Array.isArray(primitives))
            return {
              success: false,
              error: "Invalid primitives array",
              error_code: 400,
            };

          const subcollection = subcollectionMap[stage];

          if (subcollection) {
            const stageRef = collection(
              db,
              "projects",
              currentProject.id,
              subcollection,
            );

            // Tool contract: "replaces all primitives in a stage".
            // We fully clear the subcollection before re-inserting.
            const existingSnapshot = await getDocs(stageRef);
            if (!existingSnapshot.empty) {
              const batch = writeBatch(db);
              existingSnapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
              await batch.commit();
            }

            const newIds: string[] = [];
            for (let i = 0; i < primitives.length; i++) {
              const raw = primitives[i];
              if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
                continue;
              }
              const p = raw as Record<string, unknown>;

              const safeTitle =
                typeof p.title === "string" && p.title.trim() !== ""
                  ? p.title
                  : typeof p.name === "string" && p.name.trim() !== ""
                    ? p.name
                    : "Untitled";

              const safeContent =
                typeof p.content === "string"
                  ? p.content
                  : typeof p.description === "string"
                    ? p.description
                    : "";

              const safeData: Record<string, unknown> = {
                // Keep any extra fields the model may have provided.
                ...p,
                title: safeTitle,
                content: safeContent,
                order: typeof p.order === "number" ? p.order : i,
                projectId: currentProject.id,
                createdAt: serverTimestamp(),
                // Firestore character/location docs use 'name' + 'description'.
                ...(stage === "Character Bible" || stage === "Location Bible"
                  ? {
                      name:
                        typeof p.name === "string" && p.name.trim() !== ""
                          ? p.name
                          : safeTitle,
                      description:
                        typeof p.description === "string"
                          ? p.description
                          : safeContent,
                    }
                  : {}),
              };

              // Prevent Firestore schema issues from undefined values.
              Object.keys(safeData).forEach((key) => {
                if (safeData[key] === undefined) delete safeData[key];
              });

              const newRef = await addDoc(stageRef, safeData);
              newIds.push(newRef.id);
            }

            telemetryService.invalidateStage(stage);
            // Enforce Agent Contract (analysis + stage readiness state)
            await handleStageAnalyze(stage as WorkflowStage);
            addToast(
              t("common.stageRestructured", {
                defaultValue: "Stage restructured successfully",
              }),
              "success",
            );
            return { success: true, new_primitive_ids: newIds };
          } else {
            return {
              success: false,
              error: `Restructuring not supported for stage: ${stage}`,
              error_code: 400,
            };
          }
        }

        case "update_stage_insight": {
          const stage = getArgString(args, "stage") ?? "";
          const insight = getArgRecord(args, "insight") ?? {};
          const hasContent =
            typeof insight.content === "string" && insight.content.trim().length > 0;
          const isReady =
            typeof insight.isReady === "boolean" ? (insight.isReady as boolean) : false;

          const nextStageState: StageState = hasContent
            ? isReady
              ? "excellent"
              : "needs_improvement"
            : "empty";

          await updateDoc(doc(db, "projects", currentProject.id), {
            [`stageAnalyses.${stage}`]: {
              ...insight,
              updatedAt: Date.now(),
            },
            [`stageStates.${stage}`]: nextStageState,
            updatedAt: serverTimestamp(),
          });
          telemetryService.setStatus(
            "Confirmed",
            "✅",
            `Stage Analysis for ${stage} updated.`,
          );
          addToast(
            t("common.insightUpdated", { defaultValue: "AI Analysis updated" }),
            "success",
          );
          return { success: true };
        }

        default:
          return {
            success: false,
            error: `Unknown tool: ${name}`,
            error_code: 400,
          };
      }
    } catch (error) {
      console.error("Tool execution failed:", error);

      const classification = telemetryService.classifyFirebaseError(error);
      const targetId = getArgString(args, "id") ?? name;
      const failureCount = telemetryService.recordFailure(targetId);

      telemetryService.setStatus(
        "Error",
        "❌",
        `${classification.type}: ${classification.message}`,
        targetId,
      );

      if (failureCount >= 2 && retryAttempt < 2) {
        telemetryService.setStatus(
          "Recovery",
          "🔄",
          "Double failure detected. Full ID-Map resync...",
        );
        await contextAssembler.hydrateFullIdMap(currentProject.id);
        return executeToolCall(call, retryAttempt + 1);
      }

      const errorResult: ToolResult = {
        success: false,
        error: classification.message,
        error_code: classification.code,
        error_type: classification.type,
        failed_tool: name,
        failed_primitive_id:
          args && typeof (args as Record<string, unknown>).id === "string"
            ? ((args as Record<string, unknown>).id as string)
            : null,
        retry_count: retryAttempt,
        recovery_attempted: failureCount >= 2,
      };

      if (classification.type === "PERMISSION_DENIED") {
        addToast(
          `🔒 Security block on ${name}: ${classification.message}`,
          "error",
        );
      }

      return errorResult;
    }
  };

  const handleDoctorMessage = async (content: string) => {
    if (!currentProject) return;

    // --- Detect structured apply_suggestion events from the UI ---
    let resolvedContent = content;
    try {
      const parsed = JSON.parse(content);
      if (parsed?.type === "apply_suggestion") {
        const { msgId, action } = parsed as {
          type: string;
          msgId?: string;
          action?: string;
        };

        // Attempt to look up the referenced assistant message for richer context
        const detailLines: string[] = [];

        if (msgId) {
          // doctorMessages is the state snapshot captured at render time; we read
          // it directly here since this closure is called after state is set.
          const referencedMsg = doctorMessages.find((m) => m.id === msgId);

          if (referencedMsg) {
            // 1. Surface suggested_actions if present
            if (
              Array.isArray(referencedMsg.suggested_actions) &&
              referencedMsg.suggested_actions.length > 0
            ) {
              detailLines.push(
                `Suggested actions from the message: ${referencedMsg.suggested_actions.map((a: string) => `"${a}"`).join(", ")}.`,
              );
            }

            // 2. Surface any embedded patch / structured content blocks from the content string
            const rawContent: string =
              typeof referencedMsg.content === "string"
                ? referencedMsg.content
                : JSON.stringify(referencedMsg.content ?? "");

            // Extract fenced JSON/patch blocks if present
            const patchBlockMatch = rawContent.match(
              /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
            );
            if (patchBlockMatch?.[1]) {
              detailLines.push(
                `Patch details extracted from the message:\n${patchBlockMatch[1]}`,
              );
            } else if (rawContent.length > 0) {
              // Include a trimmed version of the full response as context
              detailLines.push(
                `Full context from the message:\n${rawContent.substring(0, 2000)}`,
              );
            }
          }
        }

        // Build a precise, tool-aware instruction for the agentic loop
        const actionDescription = action
          ? `"${action}"`
          : "the suggestion described in the referenced message";
        const extraContext =
          detailLines.length > 0
            ? `\n\nAdditional context:\n${detailLines.join("\n")}`
            : "";

        resolvedContent = `Please apply the following suggested change to the project: ${actionDescription}. Use the appropriate tool (propose_patch, execute_multi_stage_fix, add_primitive, delete_primitive, restructure_stage, etc.) to make this change directly in the project data. Do not ask for confirmation — proceed immediately with the edit.${extraContext}`;
      }
    } catch {
      // Not JSON — treat as plain text (normal user message)
    }

    // Stage-aware guardrails for the Architect.
    // Brainstorming stage is special: the Source of Truth is a single content primitive:
    // - brainstorming_result => the refined 1-2 paragraph brainstorming/pitch
    if (activeStage === "Brainstorming" && !resolvedContent.includes("[BRAINSTORMING_DOCTOR_SCHEMA]")) {
      resolvedContent = `You are fixing the "Brainstorming" stage of this ScénarIA project.

[BRAINSTORMING_DOCTOR_SCHEMA]
Hard requirements (must follow):
1. Use tools to patch the existing primitives in the Brainstorming stage (preferred).
2. Ensure the single content primitive is updated:
   - Use the existing content primitive in this stage (prefer primitiveType: "brainstorming_result").
   - If only legacy "pitch_result" exists, patch that primitive and set primitiveType to "brainstorming_result".
   - Update its 'content' with an improved 1-2 paragraph brainstorming result (the retained story/pitch).
3. Enforce the contract: delete any other Brainstorming primitives that are NOT "brainstorming_result" (e.g. legacy "pitch_result" or "analysis_block"), using delete_primitive and real IDs from get_stage_structure.
4. Preserve ordering when writing:
   - brainstorming_result should have order = 1
5. If IDs are needed, call get_stage_structure for stage_id "Brainstorming" first, then patch with propose_patch using the real primitive IDs.
6. After patching/deleting, the UI will re-evaluate the stage readiness from the updated content.

User request:
${resolvedContent}`;
    }

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: resolvedContent,
      timestamp: Date.now(),
    } satisfies ScriptDoctorMessage;
    setDoctorMessages((prev) => [...prev, userMsg]);
    setIsDoctorTyping(true);

    // Complexity Classification
    const contentLower = resolvedContent.toLowerCase();
    const wordCount = resolvedContent.split(/\s+/).filter(Boolean).length;
    let complexity: "simple" | "moderate" | "complex" = "moderate";

    const complexKeywords = [
      "generate",
      "break down",
      "rewrite",
      "fix",
      "restructure",
      "create",
      "write",
      "develop",
      "analyze all",
      "full audit",
      "génère",
      "générer",
      "réécrire",
      "réécris",
      "corriger",
      "corrige",
      "restructurer",
      "créer",
      "crée",
      "écrire",
      "écris",
      "développer",
      "développe",
      "analyser",
      "analyse tout",
      "audit complet",
      "refaire",
      "refais",
      "modifier",
      "modifie",
      "changer",
      "change",
      "supprimer",
      "supprime",
      "ajouter",
      "ajoute",
      "delete",
      "remove",
      "add",
      "update",
      "modify",
      "apply",
    ];
    const isComplex = complexKeywords.some((kw) => contentLower.includes(kw));

    const actionKeywords = [
      "supprimer",
      "supprime",
      "delete",
      "remove",
      "ajouter",
      "ajoute",
      "add",
      "modifier",
      "modifie",
      "modify",
      "change",
      "update",
      "apply",
      "fix",
      "corriger",
      "corrige",
    ];
    const isActionRequest = actionKeywords.some((kw) =>
      contentLower.includes(kw),
    );

    if (isComplex) {
      complexity = "complex";
    } else if (isActionRequest) {
      complexity = "moderate";
    } else if (wordCount <= 5 && !contentLower.includes("?")) {
      complexity = "simple";
    }

    setIsHeavyThinking(complexity === "complex");

    try {
      telemetryService.setStatus(
        "Context Assembly",
        "🧠",
        "Mapping Primitive IDs...",
      );
      const payload = await contextAssembler.buildPromptPayload(
        currentProject.id,
        activeStage,
      );
      const context = contextAssembler.formatPrompt(payload, "");
      const idMapContext = telemetryService.getIdMapContext();

      const currentMessages = [...doctorMessages, userMsg];
      const history: Array<{ role: string; parts: Array<{ text: string }> }> =
        [];

      const { geminiService } = await import("../services/geminiService");
      const { aiQuotaState } = await import("../services/serviceState");
      setIsInDegradedMode(aiQuotaState.get());

      for (const msg of currentMessages) {
        if (msg.role === "user") {
          history.push({
            role: "user",
            parts: [
              {
                text:
                  typeof msg.content === "string"
                    ? msg.content
                    : JSON.stringify(msg.content),
              },
            ],
          });
        } else {
          // Assistant message: ensure we preserve the JSON structure in history
          // so the model understands its previous state (thinking, actions, etc.)
          history.push({
            role: "model",
            parts: [
              {
                text: JSON.stringify({
                  status: msg.status || "✅ Done",
                  thinking: msg.thinking || "",
                  response: msg.content,
                  suggested_actions: msg.suggested_actions || [],
                }),
              },
            ],
          });
        }
      }

      const cleanedHistory: typeof history = [];
      for (const entry of history) {
        const lastEntry = cleanedHistory[cleanedHistory.length - 1];
        if (lastEntry && lastEntry.role === entry.role) {
          lastEntry.parts.push(...entry.parts);
        } else {
          cleanedHistory.push(entry);
        }
      }
      while (cleanedHistory.length > 0 && cleanedHistory[0].role !== "user") {
        cleanedHistory.shift();
      }

      // ── DEGRADED MODE: Quota exhausted — skip agentic loop entirely ──────────
      const { aiQuotaState: currentQuotaState } = await import("../services/serviceState");
      if (currentQuotaState.get()) {
        telemetryService.setStatus(
          "Degraded Mode",
          "💬",
          "Gemini 3 quota exhausted. Using chat-only mode...",
        );
        setAiStatus("💬 Chat-only mode (Gemini 2.5)");

        // Build a minimal history (last 4 exchanges max to keep tokens low)
        const trimmedHistory = cleanedHistory.slice(-4);

        const degradedResult = await geminiService.scriptDoctorAgent(
          trimmedHistory,
          context,
          activeStage,
          "simple", // Force simple complexity in degraded mode
          "", // No idMap needed — tools are disabled
        );

        // Parse the response (degraded mode always returns JSON)
        const degradedText =
          degradedResult?.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.text,
          )?.text ??
          degradedResult?.text ??
          "";

        let degradedParsed: any;
        try {
          const cleaned = degradedText.replace(/```json|```/g, "").trim();
          degradedParsed = JSON.parse(cleaned);
        } catch {
          degradedParsed = {
            status: "💬 Chat Mode",
            response:
              degradedText || "I'm in chat-only mode. How can I help you?",
            suggested_actions: ["Ask a question", "Continue"],
          };
        }

        if (!degradedParsed.response || degradedParsed.response.trim() === "") {
          degradedParsed.response =
            "I'm in chat-only mode due to quota limits. Ask me anything about your project — I'll do my best to help!";
        }

        telemetryService.setStatus(
          "Complete",
          "💬",
          degradedParsed.status || "Chat Mode",
        );
        setAiStatus(degradedParsed.status || "💬 Chat-only mode");

        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: degradedParsed.response,
          thinking: degradedParsed.thinking,
          suggested_actions: degradedParsed.suggested_actions || [
            "Continue",
            "Ask something else",
          ],
          status: degradedParsed.status || "💬 Chat Mode",
          timestamp: Date.now(),
        };
        setDoctorMessages((prev) => [...prev, botMsg]);
        return; // Early exit — skip the full agentic loop below
      }
      // ── END DEGRADED MODE ────────────────────────────────────────────────────

      const MAX_ITERATIONS = 7;
      let conversationHistory = [...cleanedHistory];
      let contentChanged = false;
      let finalResponse = "";
      const allToolsCalled: string[] = [];

      telemetryService.setStatus("AI Call", "📡", "Sending to AI engine...");

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const result = await geminiService.scriptDoctorAgent(
          conversationHistory,
          context,
          activeStage,
          complexity,
          idMapContext,
        );

        // Robust response parsing: prefer candidates[0].content.parts, fall back to result.text
        const responseParts = result?.candidates?.[0]?.content?.parts ?? null;

        let functionCallParts: any[] = [];
        let textParts: any[] = [];

        if (Array.isArray(responseParts) && responseParts.length > 0) {
          functionCallParts = responseParts.filter((p: any) => p.functionCall);
          textParts = responseParts.filter((p: any) => p.text);
        }

        // If no structured parts at all, fall back to result.text (plain-text / quota-degraded mode)
        if (!responseParts || responseParts.length === 0) {
          finalResponse = result?.text ?? "";
          break;
        }

        // No function calls → this is the final text response
        if (functionCallParts.length === 0) {
          finalResponse =
            textParts.map((p: any) => p.text).join("") || result?.text || "";
          break;
        }

        // If the model already returned a structured "final JSON" in text parts,
        // we can finalize after executing the tool calls (skip an extra Gemini round).
        const textCandidate = (textParts || [])
          .map((p: any) => p.text)
          .join("")
          .trim();
        let earlyParsedFinal: any = null;
        if (textCandidate) {
          try {
            const cleaned = textCandidate.replace(/```json|```/g, "").trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            earlyParsedFinal = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
          } catch {
            // Ignore parse errors; we only use it as an optimization.
          }
        }
        const statusStr = String(earlyParsedFinal?.status || "");
        const shouldFinalizeAfterTools =
          Boolean(earlyParsedFinal?.response) &&
          (statusStr.toLowerCase().includes("done") || statusStr.includes("✅"));

        const toolResults: any[] = [];

        for (const part of functionCallParts) {
          const call = part.functionCall;
          if (!call) continue;

          allToolsCalled.push(call.name);

          const toolStatusMap: Record<string, [string, string]> = {
            research_context: ["🔍", "Retrieving project context..."],
            get_stage_structure: [
              "🧠",
              `Mapping Primitive IDs for ${call.args?.stage_id || "stage"}...`,
            ],
            fetch_character_details: ["🔍", "Analyzing character profiles..."],
            search_project_content: ["🔍", "Searching narrative threads..."],
            propose_patch: [
              "📡",
              `Sending update to Firebase (ID: ${call.args?.id || "..."})...`,
            ],
            execute_multi_stage_fix: ["🔗", "Coordinating multi-stage fix..."],
            sync_metadata: ["🧬", "Synchronizing project DNA..."],
            add_primitive: ["➕", "Inserting new structural element..."],
            delete_primitive: [
              "🗑️",
              `Removing element (ID: ${call.args?.id || "..."})...`,
            ],
            fetch_project_state: [
              "🧠",
              "Loading full project state + ID-Map...",
            ],
            update_stage_insight: ["📊", `Updating stage insight...`],
            restructure_stage: ["🔄", `Restructuring stage...`],
          };
          const [emoji, detail] = toolStatusMap[call.name] || [
            "⚡",
            `Executing ${call.name}...`,
          ];
          telemetryService.setStatus(call.name, emoji, detail, call.args?.id);
          setAiStatus(`${emoji} ${detail} (step ${iteration + 1})`);

          const toolResult = await executeToolCall(call);

          if (toolResult.success) {
            const primitiveId =
              typeof toolResult.primitive_id === "string" ? toolResult.primitive_id : undefined;
            telemetryService.setStatus(
              "Confirmed",
              "✅",
              `Confirmation received. Syncing UI...`,
              primitiveId,
            );
            if (
              [
                "propose_patch",
                "execute_multi_stage_fix",
                "add_primitive",
                "delete_primitive",
                "restructure_stage",
              ].includes(call.name)
            ) {
              contentChanged = true;
            }
            if (primitiveId) {
              telemetryService.clearFailure(primitiveId);
            }
          } else if (toolResult.error_code) {
            const classification = telemetryService.classifyFirebaseError({
              code: toolResult.error_code,
              message: toolResult.error,
            });

            if (classification.action === "RESYNC_AND_RETRY" && call.args?.id) {
              telemetryService.setStatus(
                "Resync",
                "🔄",
                "ID not found. Re-syncing Primitive IDs...",
              );
              await contextAssembler.hydrateFullIdMap(currentProject.id);

              const retryResult = await executeToolCall(call);
              toolResults.push({
                functionResponse: { name: call.name, response: retryResult },
              });
              if (
                retryResult.success &&
                [
                  "propose_patch",
                  "execute_multi_stage_fix",
                  "add_primitive",
                  "delete_primitive",
                  "restructure_stage",
                ].includes(call.name)
              ) {
                contentChanged = true;
              }
              continue;
            }
          }

          toolResults.push({
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          });
        }

        if (shouldFinalizeAfterTools && textCandidate) {
          finalResponse = textCandidate;
          break;
        }

        conversationHistory = [
          ...conversationHistory,
          { role: "model", parts: responseParts },
          { role: "user", parts: toolResults },
        ];

        telemetryService.setStatus(
          "Continuing",
          "🔄",
          `Processing step ${iteration + 2}...`,
        );
        setAiStatus(`🔄 Processing step ${iteration + 2}...`);

        if (iteration === MAX_ITERATIONS - 1) {
          finalResponse = JSON.stringify({
            status: "✅ Done",
            response: `I completed ${allToolsCalled.length} operations: ${[...new Set(allToolsCalled)].join(", ")}. The changes have been applied.`,
            suggested_actions: ["Review changes", "Continue editing"],
          });
        }
      }

      if (contentChanged && !allToolsCalled.includes("update_stage_insight")) {
        handleStageAnalyze(activeStage);
      }

      let parsedResponse;
      try {
        // More robust JSON extraction - handling potential text outside or markdown blocks
        const cleanedResponse = finalResponse.replace(/```json|```/g, "").trim();
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          parsedResponse = JSON.parse(cleanedResponse);
        }
      } catch (e) {
        console.warn("[ScriptDoctor] Parsing failed, using plain text fallback:", e);
        parsedResponse = {
          status: "✅ Done",
          response: finalResponse || "I encountered an issue processing the response.",
          thinking: "The AI returned a non-JSON response which was captured as plain text.",
          suggested_actions: ["Continue", "Retry"]
        };
      }

      if (!parsedResponse.response || parsedResponse.response.trim() === "") {
        parsedResponse.response =
          "I processed your request but the response was empty. Could you rephrase?";
        parsedResponse.suggested_actions = ["Try again", "Ask differently"];
      }

      telemetryService.setStatus(
        "Complete",
        "✅",
        parsedResponse.status || "Done",
      );
      setAiStatus(parsedResponse.status || "✅ Done");

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: typeof parsedResponse.response === 'string' 
          ? parsedResponse.response 
          : JSON.stringify(parsedResponse.response, null, 2),
        thinking: parsedResponse.thinking,
        suggested_actions: parsedResponse.suggested_actions,
        active_tool: parsedResponse.active_tool,
        status: parsedResponse.status,
        timestamp: Date.now(),
      };
      setDoctorMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error("[ScriptDoctor] Doctor message failed:", error);
      const classification = telemetryService.classifyFirebaseError(error);
      telemetryService.setStatus("Error", "❌", classification.message);

      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: `An error occurred: ${error?.message || "Unknown error"}. Please try again.`,
        suggested_actions: ["Retry", "Ask something simpler"],
        status: "❌ Error",
        timestamp: Date.now(),
      };
      setDoctorMessages((prev) => [...prev, errorMsg]);
      addToast(t("common.aiMagicFailed"), "error");
    } finally {
      setIsDoctorTyping(false);
      setIsHeavyThinking(false);
      setTimeout(() => {
        setAiStatus(null);
        setActiveTool(null);
        telemetryService.clearStatus();
      }, 3000);
    }
  };

  return {
    isDoctorOpen,
    setIsDoctorOpen,
    doctorMessages,
    setDoctorMessages,
    isDoctorTyping,
    isHeavyThinking,
    activeTool,
    aiStatus,
    handleDoctorMessage,
    /** Whether the system is currently in degraded chat-only mode (Gemini 3 quota exhausted). */
    isInDegradedMode,
    /** Resets degraded mode — call this when starting a new session so the user can retry Gemini 3. */
    resetDegradedMode: async () => {
      const { resetQuotaState } = await import("../services/geminiService");
      resetQuotaState();
      setIsInDegradedMode(false);
    },
  };
}
