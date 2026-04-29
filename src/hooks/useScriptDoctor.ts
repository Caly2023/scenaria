import { useState, useCallback, useRef, useEffect } from "react";
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
import {
  ScriptDoctorMessage,
  ToolCall,
  ToolResult,
  UseScriptDoctorProps,
} from "../types/scriptDoctor";
import {
  getTextFromModelResponse,
  sanitizePartsForHistory,
  sanitizeFinalParts,
  getArgString,
  getArgNumber,
  getArgRecord,
  getArgArray,
  classifyComplexity,
  normalizeHistory,
  buildFunctionResponsePart,
} from "../utils/scriptDoctorUtils";

import { useScriptDoctorTools } from "./useScriptDoctorTools";

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
  const [pendingToolCall, setPendingToolCall] = useState<{ call: ToolCall; botMsgId: string } | null>(null);
  const messagesRef = useRef<ScriptDoctorMessage[]>([]);

  useEffect(() => {
    messagesRef.current = doctorMessages;
  }, [doctorMessages]);

  const sequences = propsSequences || [];
  const treatmentSequences = propsTreatmentSequences || [];
  const scriptScenes = propsScriptScenes || [];
  const pitchPrimitives = propsPitchPrimitives || [];
  const characters = rawCharacters || [];
  const locations = rawLocations || [];

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
  });

  /**
   * Extract parts from the Gemini REST API response.
   * The flow returns: { candidates, parts, text, message: { content: parts } }
   */
  const extractResponseParts = (result: any): any[] => {
    // Direct parts array (our normalized return)
    if (Array.isArray(result?.parts) && result.parts.length > 0) return result.parts;
    // From candidates[0].content.parts (Gemini REST native)
    const candidateParts = result?.candidates?.[0]?.content?.parts;
    if (Array.isArray(candidateParts)) return candidateParts;
    // From message.content (our normalized return)
    if (Array.isArray(result?.message?.content)) return result.message.content;
    // Fallback
    return [];
  };

  /**
   * Main agentic loop.
   * Uses Gemini REST API format throughout:
   *   { role: "user" | "model", parts: [...] }
   * Tool results are sent as role:"user" with functionResponse parts.
   */
  const runAgentLoop = async (
    history: Array<{ role: string; parts: any[] }>,
    botMsgId: string,
    complexity: "simple" | "moderate" | "complex",
    startIteration: number = 0
  ) => {
    if (!currentProject) return;

    try {
      const { geminiService } = await import("../services/geminiService");
      const payload = await contextAssembler.buildPromptPayload(currentProject.id, activeStage);
      const context = contextAssembler.formatPrompt(payload, "");

      const MAX_ITERATIONS = 10;
      let conversationHistory = [...history];
      let finalResponse = "";
      let lastParts: any[] = [];

      for (let iteration = startIteration; iteration < MAX_ITERATIONS; iteration++) {
        if (!conversationHistory || conversationHistory.length === 0) {
          console.warn("[ScriptDoctor] conversationHistory is empty, adding fallback 'Continue'");
          conversationHistory = [{ role: "user", parts: [{ text: "Continue" }] }];
        }

        const result = await geminiService.scriptDoctorAgent(
          conversationHistory,
          context,
          activeStage,
          complexity,
          telemetryService.getIdMapContext()
        );

        const responseParts = extractResponseParts(result);
        lastParts = responseParts;

        // Extract reasoning/thinking if present
        const thought = responseParts.find((p: any) => p.reasoning || p.thought)?.reasoning
          || result?.reasoning;
        if (thought) {
          setDoctorMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? { ...m, reasoning: (m.reasoning ? m.reasoning + "\n" : "") + thought }
                : m
            )
          );
        }

        // Detect function calls (Gemini REST native format: p.functionCall)
        const toolCallParts = responseParts.filter(
          (p: any) => p?.functionCall || p?.toolRequest
        );

        if (toolCallParts.length === 0) {
          // No more tool calls — extract final text
          finalResponse = responseParts
            .filter((p: any) => p?.text)
            .map((p: any) => p.text)
            .join("")
            || result?.text
            || "";
          break;
        }

        // Process tool calls
        const modelTurnParts = sanitizePartsForHistory(responseParts);
        const toolResponseParts: any[] = [];
        let pausedForConfirmation = false;

        for (const part of toolCallParts) {
          // Normalize to a unified ToolCall object
          const call: ToolCall = part.functionCall
            ? { name: part.functionCall.name, args: part.functionCall.args }
            : {
                name: part.toolRequest.name,
                args: part.toolRequest.input,
                ref: part.toolRequest.ref,
              };

          if (SENSITIVE_TOOLS.includes(call.name)) {
            // Pause for user confirmation — store model turn parts so far
            setDoctorMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId
                  ? {
                      ...m,
                      status: "⏳ Awaiting Approval...",
                      content_parts: [...(m.content_parts || []), ...modelTurnParts],
                    }
                  : m
              )
            );
            setPendingToolCall({ call, botMsgId });
            setAiStatus(`Waiting for approval: ${call.name}`);
            pausedForConfirmation = true;
            break;
          }

          // Execute non-sensitive tool immediately
          const res = await executeToolCall(call, 0, botMsgId);
          // Gemini REST format: tool results go as functionResponse in a "user" turn
          toolResponseParts.push(buildFunctionResponsePart(call.name, res));
        }

        if (pausedForConfirmation) return;

        // Append model turn + tool results to conversation history
        conversationHistory = [
          ...conversationHistory,
          { role: "model", parts: modelTurnParts },
          { role: "user", parts: toolResponseParts },
        ];

        // Update message's content_parts for potential history reconstruction
        setDoctorMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  content_parts: [
                    ...(m.content_parts || []),
                    ...modelTurnParts,
                    ...toolResponseParts,
                  ],
                }
              : m
          )
        );

        if (iteration === MAX_ITERATIONS - 1) {
          finalResponse = "Max iterations reached.";
        }
      }

      // Finalize the message
      setDoctorMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                content: finalResponse,
                status: "✅ Done",
                content_parts: sanitizeFinalParts(lastParts),
              }
            : m
        )
      );

      setIsDoctorTyping(false);
      setIsHeavyThinking(false);
      setActiveTool(null);
      setAiStatus(null);
    } catch (error: any) {
      console.error("[ScriptDoctor] Agent failed:", error);
      setDoctorMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: `Error: ${error.message}`, status: "❌ Error" }
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
    setCurrentBotMsgId(botMsgId);

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
      await runAgentLoop(historyToUse, botMsgId, "moderate", 1);
    } catch (error: any) {
      console.error("[ScriptDoctor] Tool execution failed:", error);
      setDoctorMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: `Tool Error: ${error.message}`, status: "❌ Error" }
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
