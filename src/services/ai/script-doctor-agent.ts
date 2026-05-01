import { contextAssembler } from "../context";
import { telemetryService } from "../telemetryService";
import {
  ToolCall,
  GeminiPart,
  GeminiHistoryEntry,
} from "../../types/scriptDoctor";
import {
  sanitizePartsForHistory,
  buildFunctionResponsePart,
  extractResponseParts,
} from "../../utils/scriptDoctorUtils";
import { WorkflowStage } from "../../types";
import { geminiService } from "../geminiService";

interface AgentIterationResult {
  finalResponse: string;
  lastParts: GeminiPart[];
  iterationsReached: boolean;
}

class ScriptDoctorAgent {
  async runAgentLoop(
    projectId: string,
    activeStage: WorkflowStage,
    history: GeminiHistoryEntry[],
    complexity: "simple" | "moderate" | "complex",
    callbacks: {
      onThought?: (thought: string) => void;
      onToolCall: (call: ToolCall) => Promise<{ result: any; paused: boolean }>;
      onAiStatus?: (status: string) => void;
      onIterationComplete?: (parts: GeminiPart[], toolResults: GeminiPart[]) => void;
    }
  ): Promise<AgentIterationResult> {
    const payload = await contextAssembler.buildPromptPayload(projectId, activeStage);
    const context = contextAssembler.formatPrompt(payload, "");

    const MAX_ITERATIONS = 10;
    let conversationHistory = [...history];
    let finalResponse = "";
    let lastParts: GeminiPart[] = [];
    let iterationsReached = false;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      if (!conversationHistory || conversationHistory.length === 0) {
        conversationHistory = [{ role: "user", parts: [{ text: "Continue" }] }];
      }

      const result = await geminiService.scriptDoctorAgent(
        conversationHistory,
        context,
        activeStage,
        complexity,
        telemetryService.getIdMapContext()
      );

      const responseParts = Array.isArray(extractResponseParts(result)) ? extractResponseParts(result) : [];
      lastParts = responseParts;

      // Extract reasoning with ultra-defensive check
      const thoughtPart = responseParts.find((p) => p && (p.reasoning || p.thought));
      const thought =
        (thoughtPart && typeof thoughtPart.reasoning === "string" ? thoughtPart.reasoning : undefined) ||
        ((result as any)?.reasoning as string | undefined);
      if (thought && callbacks.onThought) {
        callbacks.onThought(thought);
      }

      // Filter tool calls
      const toolCallParts = responseParts.filter((p) => p && (p.functionCall || p.toolRequest));

      if (toolCallParts.length === 0) {
        finalResponse = Array.isArray(responseParts) 
          ? responseParts
              .filter((p) => typeof p?.text === "string")
              .map((p) => p.text as string)
              .join("")
          : "";
        
        if (!finalResponse) {
           finalResponse = ((result as any)?.text as string | undefined) || "";
        }
        break;
      }

      const modelTurnParts = sanitizePartsForHistory(responseParts);
      const toolResponseParts: GeminiPart[] = [];
      let pausedAtAny = false;

      for (const part of toolCallParts) {
        const partRecord = part as Record<string, any>;
        const fnCall = partRecord.functionCall;
        const toolRequest = partRecord.toolRequest;

        const call: ToolCall = fnCall
          ? {
              name: String(fnCall.name ?? ""),
              args: fnCall.args || {},
            }
          : {
              name: String(toolRequest?.name ?? ""),
              args: toolRequest?.input || {},
              ref: toolRequest?.ref,
            };

        const { result: toolResult, paused } = await callbacks.onToolCall(call);
        if (paused) {
          pausedAtAny = true;
          break;
        }
        toolResponseParts.push(buildFunctionResponsePart(call.name, toolResult));
      }

      if (pausedAtAny) {
        return { finalResponse: "", lastParts: modelTurnParts, iterationsReached: false };
      }

      if (callbacks.onIterationComplete) {
        callbacks.onIterationComplete(modelTurnParts, toolResponseParts);
      }

      conversationHistory = [
        ...conversationHistory,
        { role: "model", parts: modelTurnParts },
        { role: "user", parts: toolResponseParts },
      ];

      if (iteration === MAX_ITERATIONS - 1) {
        finalResponse = "Max iterations reached.";
        iterationsReached = true;
      }
    }

    return { finalResponse, lastParts, iterationsReached };
  }
}

export const scriptDoctorAgent = new ScriptDoctorAgent();
