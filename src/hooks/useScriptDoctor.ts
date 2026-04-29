import { useState, useRef, useEffect } from "react";
import { contextAssembler } from "../services/contextAssembler";
import { telemetryService } from "../services/telemetryService";
import {
  ScriptDoctorMessage,
  ToolCall,
  UseScriptDoctorProps,
  GeminiPart,
  GeminiHistoryEntry,
} from "../types/scriptDoctor";
import {
  sanitizePartsForHistory,
  sanitizeFinalParts,
  classifyComplexity,
  normalizeHistory,
  buildFunctionResponsePart,
  extractResponseParts,
} from "../utils/scriptDoctorUtils";

import { useScriptDoctorTools } from "./useScriptDoctorTools";

export function useScriptDoctor({
  currentProject,
  activeStage,
  stageContents = {},
  addToast,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  handleStageAnalyze,
}: UseScriptDoctorProps) {
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [doctorMessages, setDoctorMessages] = useState<ScriptDoctorMessage[]>([]);
  const [isDoctorTyping, setIsDoctorTyping] = useState(false);
  const [isHeavyThinking, setIsHeavyThinking] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [pendingToolCall, setPendingToolCall] = useState<{ call: ToolCall; botMsgId: string } | null>(null);
  const messagesRef = useRef<ScriptDoctorMessage[]>([]);

  useEffect(() => {
    messagesRef.current = doctorMessages;
  }, [doctorMessages]);

  // Tools that require user confirmation before execution
  const SENSITIVE_TOOLS = [
    "propose_patch",
    "execute_multi_stage_fix",
    "add_primitive",
    "delete_primitive",
    "restructure_stage",
    "sync_metadata",
  ];

  const { executeToolCall } = useScriptDoctorTools({
    currentProject,
    stageContents,
    addToast,
    setRefiningBlockId,
    setLastUpdatedPrimitiveId,
    handleStageAnalyze,
    setActiveTool,
    setAiStatus,
    setDoctorMessages,
  });

  /**
   * Main agentic loop.
   */
  const runAgentLoop = async (
    history: GeminiHistoryEntry[],
    botMsgId: string,
    complexity: "simple" | "moderate" | "complex"
  ) => {
    if (!currentProject) return;

    try {
      const { scriptDoctorAgent } = await import("../services/ai/scriptDoctorAgent");
      
      const result = await scriptDoctorAgent.runAgentLoop(
        currentProject.id,
        activeStage,
        history,
        complexity,
        {
          onThought: (thought) => {
            setDoctorMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId
                  ? { ...m, reasoning: (m.reasoning ? m.reasoning + "\n" : "") + thought }
                  : m
              )
            );
          },
          onToolCall: async (call) => {
            if (SENSITIVE_TOOLS.includes(call.name)) {
              setDoctorMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId
                    ? { ...m, status: "⏳ Awaiting Approval..." }
                    : m
                )
              );
              setPendingToolCall({ call, botMsgId });
              setAiStatus(`Waiting for approval: ${call.name}`);
              return { result: null, paused: true };
            }

            const res = await executeToolCall(call, 0, botMsgId);
            return { result: res, paused: false };
          },
          onIterationComplete: (modelParts, toolResults) => {
            setDoctorMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId
                  ? {
                      ...m,
                      content_parts: [
                        ...(m.content_parts || []),
                        ...modelParts,
                        ...toolResults,
                      ],
                    }
                  : m
              )
            );
          }
        }
      );

      // Finalize the message
      setDoctorMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                content: result.finalResponse,
                status: result.iterationsReached ? "⚠️ Max Iterations" : "✅ Done",
                content_parts: sanitizeFinalParts(result.lastParts),
              }
            : m
        )
      );

      setIsDoctorTyping(false);
      setIsHeavyThinking(false);
      setActiveTool(null);
      setAiStatus(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown ScriptDoctor error";
      console.error("[ScriptDoctor] Agent failed:", error);
      setDoctorMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: `Error: ${message}`, status: "❌ Error" }
            : m
        )
      );
      setIsDoctorTyping(false);
      setIsHeavyThinking(false);
      setActiveTool(null);
      setAiStatus(null);
    }
  };

  const handleDoctorMessage = async (content: string) => {
    if (!currentProject) return;

    let resolvedContent = content;
    try {
      const parsed = JSON.parse(content);
      if (parsed?.type === "apply_suggestion") {
        setDoctorMessages(prev => prev.map(m => m.id === parsed.msgId ? { ...m, status: "Applying..." } : m));
        const referencedMsg = doctorMessages.find((m) => m.id === parsed.msgId);
        const extra = referencedMsg ? `\nContext: ${referencedMsg.content}` : "";
        resolvedContent = `Apply suggestion: ${parsed.action}${extra}. Use tools directly.`;
      }
    } catch {
      /* plain text */
    }

    if (
      activeStage === "Brainstorming" &&
      !resolvedContent.includes("[BRAINSTORMING_DOCTOR_SCHEMA]")
    ) {
      resolvedContent = `You are fixing "Brainstorming". Update the brainstorming_result primitive. Delete others.\nUser: ${resolvedContent}`;
    }

    const complexity = classifyComplexity(resolvedContent);
    setIsHeavyThinking(complexity === "complex");
    setIsDoctorTyping(true);

    const botMsgId = (Date.now() + 1).toString();

    const newUserMsg: ScriptDoctorMessage = {
      id: Date.now().toString(),
      role: "user",
      content: resolvedContent,
      timestamp: Date.now(),
    };

    setDoctorMessages((prev) => [...prev, newUserMsg, {
      id: botMsgId,
      role: "assistant",
      content: "...",
      status: complexity === "complex" ? "🧠 Initializing Deep Analysis..." : "📡 Connecting...",
      timestamp: Date.now(),
    }]);

    // Build Gemini-format history (excludes the new bot placeholder)
    const history = normalizeHistory([...messagesRef.current, newUserMsg]);
    await runAgentLoop(history, botMsgId, complexity);
  };

  const handleConfirmTool = async () => {
    if (!pendingToolCall || !currentProject) return;

    const { call, botMsgId } = pendingToolCall;
    setPendingToolCall(null);
    setIsDoctorTyping(true);
    setAiStatus(`Executing: ${call.name}...`);

    try {
      const res = await executeToolCall(call, 0, botMsgId);

      // Build the functionResponse part in Gemini format
      const fnResponsePart = buildFunctionResponsePart(call.name, res);

      // Use the Ref to get the absolute latest state across async boundaries
      const nextMessages = messagesRef.current.map((m) =>
        m.id === botMsgId
          ? {
              ...m,
              status: "⚙️ Resuming...",
              content_parts: [...(m.content_parts || []), fnResponsePart],
            }
          : m
      );
      
      setDoctorMessages(nextMessages);

      // Normalize the ENTIRE updated message history synchronously from the new array
      const historyToUse = normalizeHistory(nextMessages);

      // Resume the loop with the freshly normalized history
      await runAgentLoop(historyToUse, botMsgId, "moderate");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown tool execution error";
      console.error("[ScriptDoctor] Tool execution failed:", error);
      setDoctorMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: `Tool Error: ${message}`, status: "❌ Error" }
            : m
        )
      );
      setIsDoctorTyping(false);
      setActiveTool(null);
    }
  };

  const handleCancelTool = () => {
    if (!pendingToolCall) return;
    const { botMsgId } = pendingToolCall;
    setPendingToolCall(null);
    setAiStatus(null);
    setIsDoctorTyping(false);
    setActiveTool(null);
    setDoctorMessages((prev) =>
      prev.map((m) =>
        m.id === botMsgId
          ? { ...m, status: "🚫 Cancelled", content: "Operation cancelled by user." }
          : m
      )
    );
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
    pendingToolCall,
    handleConfirmTool,
    handleCancelTool,
  };
}
