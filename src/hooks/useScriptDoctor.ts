import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Project,
  WorkflowStage,
  Sequence,
  Character,
  Location,
  StageState,
} from "../types";
import { stageRegistry } from "../config/stageRegistry";
import { contextAssembler } from "../services/contextAssembler";
import { telemetryService } from "../services/telemetryService";

type ScriptDoctorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: string;
  thinking?: string;
  reasoning?: string;
  suggested_actions?: string[];
  active_tool?: string;
  timestamp: number;
  /** Preserves Genkit/Gemini raw parts for multi-turn consistency (including thoughts and signatures) */
  content_parts?: any[];
};

type ToolCall = {
  name: string;
  args?: Record<string, unknown>;
  ref?: string;
};

type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  error_code?: number;
  [key: string]: unknown;
};

// --- STATIC HELPERS ---

function getTextFromModelResponse(response: unknown): string {
  if (!response) return "";
  if (typeof response === "string") return response;

  const asRecord =
    typeof response === "object" && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : null;
  if (!asRecord) return "";

  const directText = asRecord.text;
  if (typeof directText === "string") return directText;

  const candidate =
    Array.isArray(asRecord.candidates) && asRecord.candidates.length > 0
      ? (asRecord.candidates[0] as Record<string, unknown>)
      : null;

  const contentParts =
    (candidate as any)?.message?.content ||
    (candidate as any)?.content?.parts ||
    (asRecord as any).message?.content ||
    (asRecord as any).content?.parts ||
    (Array.isArray(asRecord.parts) ? asRecord.parts : null);

  if (!Array.isArray(contentParts)) return "";

  let aggregatedText = "";
  for (const part of contentParts) {
    if (part && typeof part === "object" && !Array.isArray(part)) {
      if (typeof (part as any).text === "string") {
        aggregatedText += (part as any).text;
      }
    }
  }

  return aggregatedText;
}

function sanitizePartsForHistory(parts: any[] | null | undefined): any[] {
  if (!Array.isArray(parts)) return [];
  // CRITICAL: Preserve all parts (including reasoning/thought) for Gemini multi-turn consistency.
  return parts.filter((part) => part && typeof part === "object");
}

function sanitizeFinalParts(parts: any[] | null | undefined): any[] {
  if (!Array.isArray(parts)) return [];
  return parts.filter((part) => {
    if (!part || typeof part !== "object") return false;
    // Strip tool requests from final UI state to prevent orphaned function calls
    if (part.toolRequest || part.functionCall) return false;
    return true;
  });
}

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

function classifyComplexity(content: string): "simple" | "moderate" | "complex" {
  const lower = content.toLowerCase();
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const complexKeywords = [
    "generate", "break down", "rewrite", "fix", "restructure", "create", "write", "develop", 
    "analyze all", "full audit", "refaire", "modifier", "change", "delete", "remove", "add", "update"
  ];

  if (complexKeywords.some((kw) => lower.includes(kw)) || wordCount > 30) {
    return "complex";
  }
  if (lower.includes("?") || wordCount > 10) {
    return "moderate";
  }
  return "simple";
}

function normalizeHistory(messages: ScriptDoctorMessage[]): Array<{ role: string; content: any[] }> {
  const history: Array<{ role: string; content: any[] }> = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      history.push({
        role: "user",
        content: [{ text: msg.content }],
      });
    } else {
      // If we have preserved content_parts (which includes tool calls/responses), use them.
      if (msg.content_parts && msg.content_parts.length > 0) {
        history.push({
          role: msg.role === "assistant" ? "model" : msg.role,
          content: msg.content_parts,
        });
      } else {
        const role = msg.role === "assistant" ? "model" : msg.role;
        
        // Handle tool role separately if it's a simple string (though usually it's in content_parts)
        if (role === "tool") {
          history.push({
            role: "tool",
            content: [{ text: msg.content }]
          });
        } else {
          const assistantText = JSON.stringify({
            status: msg.status || "✅ Done",
            thinking: msg.thinking || "",
            response: msg.content,
            suggested_actions: msg.suggested_actions || [],
          });
          history.push({
            role: "model",
            content: [{ text: assistantText }],
          });
        }
      }
    }
  }

  // Merge consecutive messages of the same role
  const cleaned: typeof history = [];
  for (const entry of history) {
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === entry.role && entry.role !== "tool") { // Don't merge tools usually, but Gemini might allow it
      last.content.push(...entry.content);
    } else {
      cleaned.push(entry);
    }
  }

  // Gemini requires history to start with 'user'
  while (cleaned.length > 0 && cleaned[0].role !== "user") {
    cleaned.shift();
  }

  return cleaned;
}

// --- HOOK ---

interface UseScriptDoctorProps {
  currentProject: Project | null;
  activeStage: WorkflowStage;
  sequences: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  pitchPrimitives?: Sequence[];
  characters: Character[];
  locations: Location[];
  addToast: (msg: string, type: "error" | "info" | "success") => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId?: (id: string | null) => void;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
}

export function useScriptDoctor({
  currentProject,
  activeStage,
  sequences: propsSequences = [],
  treatmentSequences: propsTreatmentSequences = [],
  scriptScenes: propsScriptScenes = [],
  pitchPrimitives: propsPitchPrimitives = [],
  characters: rawCharacters = [],
  locations: rawLocations = [],
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
  const [currentBotMsgId, setCurrentBotMsgId] = useState<string | null>(null);

  const sequences = propsSequences || [];
  const treatmentSequences = propsTreatmentSequences || [];
  const scriptScenes = propsScriptScenes || [];
  const pitchPrimitives = propsPitchPrimitives || [];
  const characters = rawCharacters || [];
  const locations = rawLocations || [];

  const subcollectionMap = stageRegistry.getSubcollectionMap();

  /**
   * Internal tool execution logic.
   */
  const executeToolCall = async (
    call: ToolCall,
    retryAttempt: number = 0,
    botMsgIdParam?: string,
  ): Promise<ToolResult> => {
    const { name, args = {} } = call;
    const botMsgId = botMsgIdParam || currentBotMsgId;
    setActiveTool(name);

    if (!currentProject) {
      return { success: false, error: "No active project", error_code: 0 };
    }

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

      const handlers: Record<string, () => Promise<ToolResult>> = {
        fetch_project_state: async () => {
          telemetryService.setStatus("fetch_project_state", "🧠", "Loading full project state...");
          const idMapSnapshot = telemetryService.getIdMapSnapshot();
          return {
            success: true,
            data: {
              metadata: currentProject.metadata,
              stages: {
                Logline: currentProject.stageStates?.["Logline"] !== "empty" ? 1 : 0,
                Brainstorming: currentProject.stageStates?.["Brainstorming"] !== "empty" ? 1 : 0,
                "3-Act Structure": currentProject.stageStates?.["3-Act Structure"] !== "empty" ? 1 : 0,
                Synopsis: currentProject.stageStates?.["Synopsis"] !== "empty" ? 1 : 0,
                "Character Bible": characters.length,
                "Location Bible": locations.length,
                "Step Outline": sequences.length,
                Treatment: treatmentSequences.length,
                Script: scriptScenes.length,
              },
              id_map: idMapSnapshot,
            },
          };
        },

        get_stage_structure: async () => {
          const stage_id = getArgString(args, "stage_id") ?? "";
          telemetryService.setStatus("get_stage_structure", "🧠", `Mapping IDs for ${stage_id}...`);
          const structure = await contextAssembler.getStageStructure(currentProject.id, stage_id);
          return {
            success: true,
            data: {
              stage_id,
              total_count: structure.length,
              primitives: structure.map((p) => ({
                primitive_id: p.id,
                title: p.title || p.name,
                content: p.content || p.description,
                order_index: p.order,
              })),
            },
          };
        },

        research_context: async () => {
          const stageName = getArgString(args, "stageName") ?? "";
          telemetryService.setStatus("research_context", "🔍", `Context search: ${stageName}...`);
          
          let items: any[] = [];
          const localDataMap: Record<string, any[]> = {
            Brainstorming: pitchPrimitives,
            "Character Bible": characters,
            "Location Bible": locations,
            "Step Outline": sequences,
            Treatment: treatmentSequences,
            Script: scriptScenes,
          };

          if (localDataMap[stageName] && localDataMap[stageName].length > 0) {
            items = localDataMap[stageName];
          } else {
            // Fallback to direct fetch if local data is missing or empty
            items = await contextAssembler.getStageStructure(currentProject.id, stageName);
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
        },

        fetch_character_details: async () => {
          const characterId = getArgString(args, "characterId") ?? "";
          const char = characters.find((c) => c.id === characterId);
          if (!char) return { success: false, error: `Character ${characterId} not found` };
          return { success: true, data: char };
        },

        search_project_content: async () => {
          const q = (getArgString(args, "query") ?? "").toLowerCase();
          return {
            success: true,
            data: {
              characters: characters.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
              locations: locations.filter(l => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)),
            }
          };
        },

        propose_patch: async () => {
          const id = getArgString(args, "id") ?? "";
          const stage = getArgString(args, "stage") ?? "";
          const updates = getArgRecord(args, "updates") ?? {};
          telemetryService.setStatus("propose_patch", "📡", `Patching ID: ${id}...`, id);
          setRefiningBlockId(id);
          const sub = subcollectionMap[stage];
          if (!sub) return { success: false, error: `Invalid stage: ${stage}` };
          const docRef = doc(db, "projects", currentProject.id, sub, id);
          const safeUpdates: any = { ...updates };
          if (stage === "Character Bible" || stage === "Location Bible") {
            if (updates.title) safeUpdates.name = updates.title;
            if (updates.content) safeUpdates.description = updates.content;
          }
          await updateDoc(docRef, { ...safeUpdates, updatedAt: serverTimestamp() });
          await handleStageAnalyze(stage as WorkflowStage);
          setLastUpdatedPrimitiveId?.(id);
          setRefiningBlockId(null);
          addToast(t("common.primitiveUpdated"), "success");
          return { success: true, primitive_id: id };
        },

        execute_multi_stage_fix: async () => {
          const fixes = getArgArray(args, "fixes") ?? [];
          for (const fix of fixes as any[]) {
            const sub = subcollectionMap[fix.stage];
            if (!sub) continue;
            const safe = { ...fix.updates };
            if (fix.stage === "Character Bible" || fix.stage === "Location Bible") {
              if (safe.title) safe.name = safe.title;
              if (safe.content) safe.description = safe.content;
            }
            await updateDoc(doc(db, "projects", currentProject.id, sub, fix.id), { ...safe, updatedAt: serverTimestamp() });
          }
          const uniqueStages = [...new Set(fixes.map((f: any) => f.stage))] as WorkflowStage[];
          await Promise.all(uniqueStages.map(s => handleStageAnalyze(s)));
          addToast(t("common.multiStageFixApplied"), "success");
          return { success: true };
        },

        sync_metadata: async () => {
          const metadata = getArgRecord(args, "metadata") ?? {};
          await updateDoc(doc(db, "projects", currentProject.id), {
            metadata: { ...currentProject.metadata, ...metadata },
            updatedAt: serverTimestamp(),
          });
          addToast(t("common.metadataSynced"), "success");
          return { success: true };
        },

        add_primitive: async () => {
          const stage = getArgString(args, "stage") ?? "";
          const primitive = getArgRecord(args, "primitive") ?? {};
          const sub = subcollectionMap[stage];
          if (!sub) return { success: false, error: "Unsupported stage" };
          const safeData: any = {
            title: primitive.title || primitive.name || "Untitled",
            content: primitive.content || primitive.description || "",
            order: getArgNumber(args, "position") ?? primitive.order ?? 0,
            projectId: currentProject.id,
            createdAt: serverTimestamp(),
            ...primitive,
          };
          if (stage === "Character Bible" || stage === "Location Bible") {
            safeData.name = safeData.title;
            safeData.description = safeData.content;
          }
          const newDoc = await addDoc(collection(db, "projects", currentProject.id, sub), safeData);
          await handleStageAnalyze(stage as WorkflowStage);
          addToast(t("common.primitiveAdded"), "success");
          return { success: true, primitive_id: newDoc.id };
        },

        delete_primitive: async () => {
          const id = getArgString(args, "id") ?? "";
          const stage = getArgString(args, "stage") ?? "";
          const sub = subcollectionMap[stage];
          if (!sub) return { success: false, error: "Unsupported stage" };
          await deleteDoc(doc(db, "projects", currentProject.id, sub, id));
          await handleStageAnalyze(stage as WorkflowStage);
          addToast(t("common.primitiveDeleted"), "info");
          return { success: true };
        },

        restructure_stage: async () => {
          const stage = getArgString(args, "stage") ?? "";
          const primitives = getArgArray(args, "primitives") ?? [];
          const sub = subcollectionMap[stage];
          if (!sub) return { success: false, error: "Unsupported stage" };

          telemetryService.setStatus("restructure_stage", "🧠", `Re-organizing ${stage}...`);

          const stageRef = collection(db, "projects", currentProject.id, sub);
          const existingSnap = await getDocs(stageRef);
          const existingDocs = existingSnap.docs;
          
          const batch = writeBatch(db);
          
          // Non-destructive approach:
          // 1. Identify which ones to keep/update and which to delete
          const newIds = new Set(primitives.map((p: any) => p.id).filter(Boolean));
          
          // Delete docs that are NOT in the new list
          existingDocs.forEach(d => {
            if (!newIds.has(d.id)) {
              batch.delete(d.ref);
            }
          });

          // Create or update
          for (let i = 0; i < primitives.length; i++) {
            const p = primitives[i] as any;
            const id = p.id || p.primitive_id;
            
            const safe: any = {
              title: p.title || p.name || "Untitled",
              content: p.content || p.description || "",
              order: i,
              projectId: currentProject.id,
              updatedAt: serverTimestamp(),
            };
            
            if (stage === "Character Bible" || stage === "Location Bible") {
              safe.name = safe.title;
              safe.description = safe.content;
            }

            if (id) {
              const docRef = doc(db, "projects", currentProject.id, sub, id);
              batch.set(docRef, safe, { merge: true });
            } else {
              const newDocRef = doc(collection(db, "projects", currentProject.id, sub));
              batch.set(newDocRef, { ...safe, createdAt: serverTimestamp() });
            }
          }

          await batch.commit();
          await handleStageAnalyze(stage as WorkflowStage);
          addToast(t("common.stageRestructured"), "success");
          return { success: true };
        },

        update_stage_insight: async () => {
          const stage = getArgString(args, "stage") ?? "";
          const insight = getArgRecord(args, "insight") ?? {};
          const hasContent = !!insight.content;
          const status: StageState = hasContent ? (insight.isReady ? "excellent" : "needs_improvement") : "empty";
          await updateDoc(doc(db, "projects", currentProject.id), {
            [`stageAnalyses.${stage}`]: { ...insight, updatedAt: Date.now() },
            [`stageStates.${stage}`]: status,
            updatedAt: serverTimestamp(),
          });
          addToast(t("common.insightUpdated"), "success");
          return { success: true };
        },

        update_agent_status: async () => {
          const status = getArgString(args, "status") ?? "Thinking...";
          setAiStatus(status);
          if (botMsgId) {
            setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, status } : m));
          }
          return { success: true };
        },

        set_suggested_actions: async () => {
          const actions = (getArgArray(args, "actions") as string[]) ?? [];
          if (botMsgId) {
            setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, suggested_actions: actions } : m));
          }
          return { success: true };
        }
      };

      if (handlers[name]) return await handlers[name]();
      return { success: false, error: `Unknown tool: ${name}` };
    } catch (error: any) {
      console.error(`[ScriptDoctor] Tool ${name} failed:`, error);
      const classification = telemetryService.classifyFirebaseError(error);
      if (retryAttempt < 1 && classification.action === "RESYNC_AND_RETRY") {
        await contextAssembler.hydrateFullIdMap(currentProject.id);
        return executeToolCall(call, retryAttempt + 1, botMsgIdParam);
      }
      return { success: false, error: classification.message, error_code: classification.code };
    }
  };

  const handleDoctorMessage = async (content: string) => {
    if (!currentProject) return;

    let resolvedContent = content;
    try {
      const parsed = JSON.parse(content);
      if (parsed?.type === "apply_suggestion") {
        const referencedMsg = doctorMessages.find((m) => m.id === parsed.msgId);
        const extra = referencedMsg ? `\nContext: ${referencedMsg.content}` : "";
        resolvedContent = `Apply suggestion: ${parsed.action}${extra}. Use tools directly.`;
      }
    } catch { /* plain text */ }

    if (activeStage === "Brainstorming" && !resolvedContent.includes("[BRAINSTORMING_DOCTOR_SCHEMA]")) {
      resolvedContent = `You are fixing "Brainstorming". Update the brainstorming_result primitive. Delete others.\nUser: ${resolvedContent}`;
    }

    const complexity = classifyComplexity(resolvedContent);
    setIsHeavyThinking(complexity === "complex");
    setIsDoctorTyping(true);

    let botMsgId = (Date.now() + 1).toString();
    setCurrentBotMsgId(botMsgId);
    setDoctorMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: resolvedContent, timestamp: Date.now() }]);
    setDoctorMessages(prev => [...prev, { id: botMsgId, role: "assistant", content: "...", status: "📡 Connecting...", timestamp: Date.now() }]);

    try {
      const { geminiService } = await import("../services/geminiService");
      const payload = await contextAssembler.buildPromptPayload(currentProject.id, activeStage);
      const context = contextAssembler.formatPrompt(payload, "");
      const history = normalizeHistory([...doctorMessages, { role: "user", content: resolvedContent, id: "tmp", timestamp: Date.now() }]);
      
      const MAX_ITERATIONS = 7;
      let conversationHistory = [...history];
      let lastParts: any[] = [];
      let finalResponse = "";

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const result = await geminiService.scriptDoctorAgent(conversationHistory, context, activeStage, complexity, telemetryService.getIdMapContext());
        const responseParts = result?.candidates?.[0]?.message?.content || result?.parts || [];
        lastParts = responseParts;

        // Handle thinking/reasoning
        const thought = responseParts.find((p: any) => p.reasoning || p.thought)?.reasoning || result.reasoning;
        if (thought) {
          setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, reasoning: (m.reasoning ? m.reasoning + "\n" : "") + thought } : m));
        }

        const toolCalls = responseParts.filter((p: any) => p.toolRequest || p.functionCall);
        if (toolCalls.length === 0) {
          finalResponse = responseParts.map((p: any) => p.text).join("") || result.text || JSON.stringify(result);
          break;
        }

        const toolResults: any[] = [];
        for (const part of toolCalls) {
          const call = part.toolRequest 
            ? { name: part.toolRequest.name, args: part.toolRequest.input, ref: part.toolRequest.ref } 
            : { name: part.functionCall.name, args: part.functionCall.args };
          
          const res = await executeToolCall(call, 0, botMsgId);
          toolResults.push({ 
            toolResponse: { 
              name: call.name, 
              ref: call.ref || call.name, 
              output: res 
            } 
          });
        }

        // CRITICAL: Gemini requires the model's tool calls to be followed by tool responses.
        // We preserve these in the conversation history for subsequent iterations.
        conversationHistory = [
          ...conversationHistory,
          { role: "assistant", content_parts: sanitizePartsForHistory(responseParts) },
          { role: "tool", content_parts: toolResults }
        ];

        // Also update the UI message state to include these parts for multi-turn persistence across hook re-renders
        setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { 
          ...m, 
          content_parts: [
            ...(m.content_parts || []),
            ...sanitizePartsForHistory(responseParts),
            ...toolResults.map(tr => ({ toolResponse: tr.toolResponse }))
          ] 
        } : m));

        if (iteration === MAX_ITERATIONS - 1) finalResponse = "Max iterations reached.";
      }

      setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { 
        ...m, 
        content: finalResponse, 
        status: "✅ Done", 
        content_parts: sanitizeFinalParts(lastParts) 
      } : m));

    } catch (error: any) {
      console.error("[ScriptDoctor] Agent failed:", error);
      setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: `Error: ${error.message}`, status: "❌ Error" } : m));
    } finally {
      setIsDoctorTyping(false);
      setIsHeavyThinking(false);
      setAiStatus(null);
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
  };
}
