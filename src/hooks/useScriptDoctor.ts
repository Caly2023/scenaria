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

  const sequences = propsSequences || [];
  const treatmentSequences = propsTreatmentSequences || [];
  const scriptScenes = propsScriptScenes || [];
  const pitchPrimitives = propsPitchPrimitives || [];
  const characters = rawCharacters || [];
  const locations = rawLocations || [];

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
    setDoctorMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: resolvedContent, timestamp: Date.now() }]);
    setDoctorMessages(prev => [...prev, { id: botMsgId, role: "assistant", content: "...", status: "📡 Connecting...", timestamp: Date.now() }]);

    try {
      const { geminiService } = await import("../services/geminiService");
      const payload = await contextAssembler.buildPromptPayload(currentProject.id, activeStage);
      const context = contextAssembler.formatPrompt(payload, "");
      const history = normalizeHistory([...doctorMessages, { role: "user", content: resolvedContent, id: "tmp", timestamp: Date.now() }]);
      
      const MAX_ITERATIONS = 10; // Increased for better tool chaining
      let conversationHistory = [...history];
      let lastParts: any[] = [];
      let finalResponse = "";

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
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
