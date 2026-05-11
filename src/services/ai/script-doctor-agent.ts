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
      onToolCall: (call: ToolCall) => Promise<{ result: unknown; paused: boolean }>;
      onAiStatus?: (status: string) => void;
      onIterationComplete?: (parts: GeminiPart[], toolResults: GeminiPart[]) => void;
    }
  ): Promise<AgentIterationResult> {
    const payload = await contextAssembler.buildPromptPayload(projectId, activeStage);
    const context = contextAssembler.formatPrompt(payload, "");

    const MAX_ITERATIONS = 4;
    let conversationHistory = [...history];
    let finalResponse = "";
    let lastParts: GeminiPart[] = [];
    let iterationsReached = false;
    const executedTools = new Set<string>();

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      if (!conversationHistory || conversationHistory.length === 0) {
        conversationHistory = [{ role: "user", content: [{ text: "Continue" }] }];
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

      const resObj = result as Record<string, unknown>;
      // Extract reasoning with ultra-defensive check
      const thoughtPart = responseParts.find((p) => p && (('reasoning' in p) || ('thought' in p)));
      const thought =
        (thoughtPart && 'reasoning' in thoughtPart && typeof thoughtPart.reasoning === "string" ? thoughtPart.reasoning : undefined) ||
        (typeof resObj?.reasoning === "string" ? resObj.reasoning : undefined);
      if (thought && callbacks.onThought) {
        callbacks.onThought(thought);
      }

      // Filter tool calls
      const toolCallParts = responseParts.filter((p) => p && (('functionCall' in p) || ('toolRequest' in p)));

      if (toolCallParts.length === 0) {
        finalResponse = Array.isArray(responseParts) 
          ? responseParts
              .filter((p) => 'text' in p && typeof p.text === "string")
              .map((p) => (p as { text: string }).text)
              .join("")
          : "";
        
        if (!finalResponse) {
           finalResponse = (typeof resObj?.text === "string" ? resObj.text : undefined) || "";
        }
        break;
      }

      const modelTurnParts = sanitizePartsForHistory(responseParts);
      const toolResponseParts: GeminiPart[] = [];
      let pausedAtAny = false;

      for (const part of toolCallParts) {
        const partRecord = part as unknown as { functionCall?: { name?: string, args?: unknown }, toolRequest?: { name?: string, input?: unknown, ref?: string } };
        const fnCall = partRecord.functionCall;
        const toolRequest = partRecord.toolRequest;

        const call: ToolCall = fnCall
          ? {
              name: String(fnCall.name ?? ""),
              args: (fnCall.args as Record<string, unknown>) || {},
            }
          : {
              name: String(toolRequest?.name ?? ""),
              args: (toolRequest?.input as Record<string, unknown>) || {},
              ref: toolRequest?.ref,
            };

        const mutationTools = ["add_primitives", "update_primitives", "delete_primitives", "execute_multi_stage_fix", "restructure_stage"];
        
        // Loop protection: Prevent calling the same mutation tool twice in the same turn
        if (mutationTools.includes(call.name) && executedTools.has(call.name)) {
          toolResponseParts.push(buildFunctionResponsePart(call.name, { 
            success: false, 
            error: "SYSTEM: Loop detected. You already called this tool. DO NOT call any more tools. Provide your final confirmation text." 
          }, call.ref));
          continue;
        }

        const { result: toolResult, paused } = await callbacks.onToolCall(call);
        executedTools.add(call.name);

        if (paused) {
          pausedAtAny = true;
          break;
        }

        // Inject explicit STOP signal for successful mutations
        let finalToolResult = toolResult;
        if (mutationTools.includes(call.name) && (toolResult as any)?.success !== false) {
           finalToolResult = {
               ...(typeof toolResult === "object" && toolResult !== null ? toolResult : { result: toolResult }),
               _SYSTEM_DIRECTIVE_: "ACTION SUCCESSFUL. DO NOT CALL ANY MORE TOOLS. Provide your final markdown response to the user and stop."
           };
        }

        toolResponseParts.push(buildFunctionResponsePart(call.name, finalToolResult, call.ref));
      }

      if (pausedAtAny) {
        return { finalResponse: "", lastParts: modelTurnParts, iterationsReached: false };
      }

      if (callbacks.onIterationComplete) {
        callbacks.onIterationComplete(modelTurnParts, toolResponseParts);
      }

      conversationHistory = [
        ...conversationHistory,
        { role: "model", content: modelTurnParts },
        { role: "tool", content: toolResponseParts },
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
