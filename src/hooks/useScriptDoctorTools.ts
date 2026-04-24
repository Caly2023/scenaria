import { useTranslation } from "react-i18next";
import { stageRegistry } from "../config/stageRegistry";
import { contextAssembler } from "../services/contextAssembler";
import { telemetryService } from "../services/telemetryService";
import {
  Project,
  WorkflowStage,
  Sequence,
  Character,
  Location,
  StageState,
} from "../types";
import { ToolCall, ToolResult } from "../types/scriptDoctor";
import {
  getArgString,
  getArgNumber,
  getArgRecord,
  getArgArray,
} from "../utils/scriptDoctorUtils";

interface UseScriptDoctorToolsProps {
  currentProject: Project | null;
  pitchPrimitives: Sequence[];
  characters: Character[];
  locations: Location[];
  sequences: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  addToast: (msg: string, type: "error" | "info" | "success") => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId?: (id: string | null) => void;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
  setActiveTool: (name: string | null) => void;
  setAiStatus: (status: string | null) => void;
  setDoctorMessages: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useScriptDoctorTools({
  currentProject,
  pitchPrimitives,
  characters,
  locations,
  sequences,
  treatmentSequences,
  scriptScenes,
  addToast,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  handleStageAnalyze,
  setActiveTool,
  setAiStatus,
  setDoctorMessages,
}: UseScriptDoctorToolsProps) {
  const { t } = useTranslation();
  const subcollectionMap = stageRegistry.getSubcollectionMap();

  const executeToolCall = async (
    call: ToolCall,
    retryAttempt: number = 0,
    botMsgId?: string | null,
  ): Promise<ToolResult> => {
    const { name, args = {} } = call;
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
          await contextAssembler.getStageStructure(currentProject.id, stage);
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
          await Promise.all(uniqueStages.map(s => contextAssembler.getStageStructure(currentProject.id, s)));
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
          await contextAssembler.getStageStructure(currentProject.id, stage);
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
          await contextAssembler.getStageStructure(currentProject.id, stage);
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
          const newIds = new Set(primitives.map((p: any) => p.id).filter(Boolean));
          
          existingDocs.forEach(d => {
            if (!newIds.has(d.id)) {
              batch.delete(d.ref);
            }
          });

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
          await contextAssembler.getStageStructure(currentProject.id, stage);
          await handleStageAnalyze(stage as WorkflowStage);
          addToast(t("common.stageRestructured"), "success");
          return { success: true };
        },

        update_stage_insight: async () => {
          const stage = getArgString(args, "stage") ?? "";
          const insight = getArgRecord(args, "insight") ?? {};
          const hasContent = !!insight.content;
          const status: StageState = hasContent ? (insight.isReady ? "excellent" : "needs_improvement") : "empty";
          
          // 1. Update root project document (for quick state access)
          await updateDoc(doc(db, "projects", currentProject.id), {
            [`stageAnalyses.${stage}`]: { ...insight, updatedAt: Date.now() },
            [`stageStates.${stage}`]: status,
            updatedAt: serverTimestamp(),
          });

          // 2. Also store as a PRIMITIVE with order 0 (Unified Structure)
          const sub = subcollectionMap[stage];
          if (sub && hasContent) {
            const stageRef = collection(db, "projects", currentProject.id, sub);
            const q = await getDocs(stageRef);
            const analysisPrim = q.docs.find(d => d.data().primitiveType === 'analysis' || d.data().order === 0);
            
            const analysisData = {
              title: "AI Analysis",
              content: insight.content,
              primitiveType: "analysis",
              order: 0,
              isReady: insight.isReady,
              suggestions: insight.suggestions || [],
              updatedAt: serverTimestamp(),
            };

            if (analysisPrim) {
              await updateDoc(doc(db, "projects", currentProject.id, sub, analysisPrim.id), analysisData);
            } else {
              await addDoc(collection(db, "projects", currentProject.id, sub), {
                ...analysisData,
                createdAt: serverTimestamp(),
              });
            }
          }

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
        return executeToolCall(call, retryAttempt + 1, botMsgId);
      }
      return { success: false, error: classification.message, error_code: classification.code };
    }
  };

  return { executeToolCall };
}
