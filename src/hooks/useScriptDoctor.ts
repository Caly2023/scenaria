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

  const sequences = propsSequences || [];
  const treatmentSequences = propsTreatmentSequences || [];
  const scriptScenes = propsScriptScenes || [];
  const pitchPrimitives = propsPitchPrimitives || [];
  const characters = rawCharacters || [];
  const locations = rawLocations || [];

  const SENSITIVE_TOOLS = [
    "propose_patch",
    "execute_multi_stage_fix",
    "add_primitive",
    "delete_primitive",
    "restructure_stage",
    "sync_metadata"
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

  const runAgentLoop = async (
    history: any[], 
    botMsgId: string, 
    complexity: 'simple' | 'moderate' | 'complex',
    startIteration: number = 0
  ) => {
    if (!currentProject) return;

    try {
      const { geminiService } = await import("../services/geminiService");
      const payload = await contextAssembler.buildPromptPayload(currentProject.id, activeStage);
      const context = contextAssembler.formatPrompt(payload, "");
      
      const MAX_ITERATIONS = 10;
      let conversationHistory = [...history];
      let lastParts: any[] = [];
      let finalResponse = "";

      for (let iteration = startIteration; iteration < MAX_ITERATIONS; iteration++) {
        const result = await geminiService.scriptDoctorAgent(conversationHistory, context, activeStage, complexity, telemetryService.getIdMapContext());
        const responseParts = result?.candidates?.[0]?.message?.content || result?.parts || [];
        lastParts = responseParts;

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
        let pausedForConfirmation = false;

        for (const part of toolCalls) {
          const call = part.toolRequest 
            ? { name: part.toolRequest.name, args: part.toolRequest.input, ref: part.toolRequest.ref } 
            : { name: part.functionCall.name, args: part.functionCall.args };
          
          if (SENSITIVE_TOOLS.includes(call.name)) {
            setPendingToolCall({ call, botMsgId });
            setAiStatus(`Waiting for approval: ${call.name}`);
            
            // Update message to show we are waiting
            setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { 
              ...m, 
              status: "⏳ Awaiting Approval...",
              content_parts: [
                ...(m.content_parts || []),
                ...sanitizePartsForHistory(responseParts)
              ]
            } : m));

            pausedForConfirmation = true;
            break; 
          }

          const res = await executeToolCall(call, 0, botMsgId);
          toolResults.push({ 
            toolResponse: { 
              name: call.name, 
              ref: call.ref || call.name, 
              output: res 
            } 
          });
        }

        if (pausedForConfirmation) return; // Exit loop, will resume via handleConfirmTool

        conversationHistory = [
          ...conversationHistory,
          { role: "model", content: sanitizePartsForHistory(responseParts) },
          { role: "tool", content: toolResults }
        ];

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

      setIsDoctorTyping(false);
      setIsHeavyThinking(false);
      setAiStatus(null);

    } catch (error: any) {
      console.error("[ScriptDoctor] Agent failed:", error);
      setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: `Error: ${error.message}`, status: "❌ Error" } : m));
      setIsDoctorTyping(false);
      setIsHeavyThinking(false);
      setAiStatus(null);
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

    const botMsgId = (Date.now() + 1).toString();
    setCurrentBotMsgId(botMsgId);
    
    const newUserMsg = { id: Date.now().toString(), role: "user" as const, content: resolvedContent, timestamp: Date.now() };
    setDoctorMessages(prev => [...prev, newUserMsg]);
    setDoctorMessages(prev => [...prev, { id: botMsgId, role: "assistant", content: "...", status: "📡 Connecting...", timestamp: Date.now() }]);

    const history = normalizeHistory([...doctorMessages, newUserMsg]);
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
      const toolResultPart = { 
        toolResponse: { 
          name: call.name, 
          ref: call.ref || call.name, 
          output: res 
        } 
      };

      // Find the message and update its content_parts with the tool result
      setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { 
        ...m, 
        status: "⚙️ Resuming...",
        content_parts: [
          ...(m.content_parts || []),
          toolResultPart
        ] 
      } : m));

      // Resume the loop
      const updatedMsg = doctorMessages.find(m => m.id === botMsgId);
      const history = normalizeHistory(doctorMessages);
      // We need to inject the tool result into the history for the NEXT call
      // Actually, normalizeHistory should handle content_parts if they exist.
      
      // Since we already updated doctorMessages state, let's use the updated history
      const updatedHistory = [
        ...history.slice(0, -1), // everything except the current assistant message
        { 
          role: "model", 
          content: updatedMsg?.content_parts?.filter(p => !p.toolResponse) || [] 
        },
        {
          role: "tool",
          content: [toolResultPart]
        }
      ];

      await runAgentLoop(updatedHistory, botMsgId, "moderate", 1); // Resume at iteration 1 (or we can just keep track of iterations)

    } catch (error: any) {
      console.error("[ScriptDoctor] Tool execution failed:", error);
      setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: `Tool Error: ${error.message}`, status: "❌ Error" } : m));
      setIsDoctorTyping(false);
    }
  };

  const handleCancelTool = () => {
    if (!pendingToolCall) return;
    const { botMsgId } = pendingToolCall;
    setPendingToolCall(null);
    setAiStatus(null);
    setIsDoctorTyping(false);
    setDoctorMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, status: "🚫 Cancelled", content: "Operation cancelled by user." } : m));
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
