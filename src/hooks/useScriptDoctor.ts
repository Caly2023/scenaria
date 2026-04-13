import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Project,
  WorkflowStage,
  Sequence,
  Character,
  Location,
} from "../types";
import { contextAssembler } from "../services/contextAssembler";
import { telemetryService } from "../services/telemetryService";

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
  const [doctorMessages, setDoctorMessages] = useState<any[]>([]);
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
    call: any,
    retryAttempt: number = 0,
  ): Promise<any> => {
    if (!currentProject)
      return { success: false, error: "No active project", error_code: 0 };
    const { name, args } = call;
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
          const { stage_id } = args;
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
          const { stageName } = args;
          telemetryService.setStatus(
            "research_context",
            "🔍",
            `Retrieving ${stageName} with primitive IDs...`,
          );

          const enrichWithIds = (items: any[]) =>
            items.map((item) => ({
              primitive_id: item.id,
              title: item.title || item.name || "",
              content: item.content || item.description || "",
              order_index: item.order ?? 0,
              ...item,
            }));

          // Use already-loaded props data where available to avoid redundant fetches
          if (stageName === "Brainstorming")
            return { success: true, data: enrichWithIds(pitchPrimitives) };
          if (stageName === "Character Bible")
            return { success: true, data: enrichWithIds(characters) };
          if (stageName === "Location Bible")
            return { success: true, data: enrichWithIds(locations) };
          if (stageName === "Step Outline")
            return { success: true, data: enrichWithIds(sequences) };
          if (stageName === "Treatment")
            return { success: true, data: enrichWithIds(treatmentSequences) };
          if (stageName === "Script")
            return { success: true, data: enrichWithIds(scriptScenes) };

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
          const { characterId } = args;
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
          const { query: searchQuery } = args;
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
          const { id, stage, updates } = args;
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
            let safeUpdates: Record<string, any> = { ...updates };
            if (stage === "Character Bible" || stage === "Location Bible") {
              if (updates.title !== undefined) {
                safeUpdates.name = updates.title;
              }
              if (updates.content !== undefined) {
                safeUpdates.description = updates.content;
              }
            }

            console.log(`[ScriptDoctor] propose_patch → ${subcollection}/${id}`, safeUpdates);

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
                defaultValue: `Primitive ${id.substring(0, 8)}... updated by Architect`,
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
          const { fixes } = args;
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
            const { id, stage, updates } = fix;
            telemetryService.setStatus(
              "multi_stage_fix",
              "📡",
              `Sending update to Firebase (ID: ${id})...`,
              id,
            );

            try {
              const subcollection = subcollectionMap[stage];
              if (subcollection) {
                await updateDoc(
                  doc(db, "projects", currentProject.id, subcollection, id),
                  {
                    ...updates,
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
          const { metadata } = args;
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
          const { stage, primitive, position } = args;
          const subcollection = subcollectionMap[stage];

          if (subcollection) {
            // ── Required-field guard ────────────────────────────────────────
            // AI agents don't always provide every required field.
            // We normalise here so the Firestore write never fails validation.
            const safeTitle = primitive.title || primitive.name || 'Untitled';
            const safeContent = primitive.content || primitive.description || '';

            const safeData: Record<string, any> = {
              // Standard fields — provide safe defaults before AI spread
              title: safeTitle,
              content: safeContent,
              order: position ?? primitive.order ?? 0,
              projectId: currentProject.id,
              createdAt: serverTimestamp(),
              // Spread remaining AI-provided fields (may override above if better)
              ...primitive,
              // Field aliasing for character/location collections
              // Firestore character/location docs use 'name' + 'description'.
              ...(stage === 'Character Bible' || stage === 'Location Bible'
                ? {
                    name: primitive.name || safeTitle,
                    description: primitive.description || safeContent,
                  }
                : {}),
            };
            // Ensure projectId is always correct (spread from primitive could override it)
            safeData.projectId = currentProject.id;

            console.log(`[ScriptDoctor] add_primitive → ${subcollection}`, safeData);

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
          const { id, stage } = args;
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
          const { stage, primitives } = args;
          if (!primitives || !Array.isArray(primitives))
            return {
              success: false,
              error: "Invalid primitives array",
              error_code: 400,
            };

          const subcollection = subcollectionMap[stage];

          if (subcollection) {
            const newIds: string[] = [];
            for (let i = 0; i < primitives.length; i++) {
              const p = primitives[i];
              const newRef = await addDoc(
                collection(db, "projects", currentProject.id, subcollection),
                {
                  ...p,
                  order: i,
                  projectId: currentProject.id,
                  createdAt: serverTimestamp(),
                },
              );
              newIds.push(newRef.id);
            }
            telemetryService.invalidateStage(stage);
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
          const { stage, insight } = args;
          await updateDoc(doc(db, "projects", currentProject.id), {
            [`stageAnalyses.${stage}`]: {
              ...insight,
              updatedAt: Date.now(),
            },
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
      const targetId = args?.id || name;
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

      const errorResult: any = {
        success: false,
        error: classification.message,
        error_code: classification.code,
        error_type: classification.type,
        failed_tool: name,
        failed_primitive_id: args?.id || null,
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
        let detailLines: string[] = [];

        if (msgId) {
          // doctorMessages is the state snapshot captured at render time; we read
          // it directly here since this closure is called after state is set.
          const referencedMsg = doctorMessages.find((m: any) => m.id === msgId);

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
            } else if (rawContent.length > 0 && rawContent.length <= 2000) {
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

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: resolvedContent,
      timestamp: Date.now(),
    };
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
          history.push({
            role: "model",
            parts: [
              {
                text: JSON.stringify({
                  status: msg.status || "✅ Done",
                  thinking: msg.thinking || "",
                  response:
                    typeof msg.content === "string"
                      ? msg.content
                      : JSON.stringify(msg.content),
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
        let degradedText =
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
      let allToolsCalled: string[] = [];

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
            telemetryService.setStatus(
              "Confirmed",
              "✅",
              `Confirmation received. Syncing UI...`,
              toolResult.primitive_id,
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
            if (toolResult.primitive_id) {
              telemetryService.clearFailure(toolResult.primitive_id);
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
        parsedResponse = JSON.parse(finalResponse);
      } catch (e) {
        const jsonMatch = finalResponse.match(/\{[\s\S]*"response"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } catch {
            parsedResponse = {
              status: "✅ Done",
              response:
                finalResponse ||
                "I received your message but couldn't format the response properly. Could you try again?",
              suggested_actions: ["Continue", "Ask something else"],
            };
          }
        } else {
          parsedResponse = {
            status: "✅ Done",
            response:
              finalResponse ||
              "I received your message but couldn't format the response properly. Could you try again?",
            suggested_actions: ["Continue", "Ask something else"],
          };
        }
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
        content: parsedResponse.response,
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
