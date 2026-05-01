import { ScriptDoctorMessage, GeminiPart } from "../types/scriptDoctor";



/**
 * Filter parts to keep only those valid for the model turn:
 * text parts and functionCall parts.
 */
export function sanitizePartsForHistory(parts: GeminiPart[] | null | undefined): GeminiPart[] {
  if (!Array.isArray(parts)) return [];
  return parts.filter((part) => {
    if (!part || typeof part !== "object") return false;
    return "text" in part || "functionCall" in part;
  });
}

export function sanitizeFinalParts(parts: GeminiPart[] | null | undefined): GeminiPart[] {
  if (!Array.isArray(parts)) return [];
  return parts.filter((part) => {
    if (!part || typeof part !== "object") return false;
    if (part.functionCall || part.toolRequest) return false;
    return true;
  });
}

export function getArgString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

export function getArgNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" ? value : undefined;
}

export function getArgRecord(args: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = args[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function getArgArray(args: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = args[key];
  return Array.isArray(value) ? value : undefined;
}

export function getArgBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

export function classifyComplexity(content: string): "simple" | "moderate" | "complex" {
  const lower = content.toLowerCase();
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const complexKeywords = [
    "generate", "break down", "rewrite", "fix", "restructure", "create", "write", "develop",
    "analyze all", "full audit", "refaire", "modifier", "change", "delete", "remove", "add", "update",
  ];

  if (complexKeywords.some((kw) => lower.includes(kw)) || wordCount > 30) return "complex";
  if (lower.includes("?") || wordCount > 10) return "moderate";
  return "simple";
}

/**
 * Build a Gemini REST API "functionResponse" part.
 * In the Gemini multi-turn spec, function results are wrapped in role:"user" turns.
 */
export function buildFunctionResponsePart(name: string, output: unknown): GeminiPart {
  return {
    functionResponse: {
      name,
      response: typeof output === "object" && output !== null ? output : { result: output },
    },
  };
}

/**
 * normalizeHistory — converts ScriptDoctorMessage[] to Gemini REST API "contents" format.
 *
 * Gemini multi-turn format:
 *   { role: "user",  parts: [{ text }] }
 *   { role: "model", parts: [{ text } | { functionCall }] }
 *   { role: "user",  parts: [{ functionResponse }] }   ← tool results!
 *
 * IMPORTANT: In the Gemini REST API, function responses go in a "user" role turn,
 * NOT a "tool" role turn. This function handles the conversion automatically.
 */
export function normalizeHistory(messages: ScriptDoctorMessage[]): Array<{ role: string; parts: GeminiPart[] }> {
  if (!messages || messages.length === 0) return [];

  const history: Array<{ role: string; parts: GeminiPart[] }> = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      history.push({ role: "user", parts: [{ text: msg.content || "" }] });
      continue;
    }

    // Assistant messages that have structured content_parts (from multi-turn with tool calls)
    if (msg.content_parts && msg.content_parts.length > 0) {
      const modelParts: GeminiPart[] = [];
      const toolResultParts: GeminiPart[] = [];

      for (const p of msg.content_parts) {
        if (!p || typeof p !== "object") continue;

        if (p.functionCall) {
          modelParts.push(p);
        } else if (p.functionResponse) {
          toolResultParts.push(p);
        } else if (p.toolResponse) {
          toolResultParts.push(
            buildFunctionResponsePart(p.toolResponse.name, p.toolResponse.output)
          );
        } else if (p.text !== undefined) {
          modelParts.push(p);
        }
      }

      if (modelParts.length > 0) history.push({ role: "model", parts: modelParts });
      if (toolResultParts.length > 0) history.push({ role: "user", parts: toolResultParts });
      continue;
    }

    // Plain assistant text message
    history.push({ role: "model", parts: [{ text: msg.content || "" }] });
  }

  // Merge consecutive same-role entries
  const merged: Array<{ role: string; parts: GeminiPart[] }> = [];
  for (const entry of history) {
    const last = merged[merged.length - 1];
    if (last && last.role === entry.role) {
      last.parts.push(...entry.parts);
    } else {
      merged.push({ role: entry.role, parts: [...entry.parts] });
    }
  }

  // Gemini requires the first message to be "user"
  while (merged.length > 0 && merged[0].role !== "user") {
    merged.shift();
  }

  // If we ended up with nothing but had messages, add a fallback user message
  // This is critical to prevent "Message history is empty" errors.
  if (merged.length === 0 && Array.isArray(messages) && messages.length > 0) {
    const safeMessages = Array.isArray(messages) ? [...messages] : [];
    const lastUserMsg = safeMessages.reverse().find(m => m && m.role === "user");
    merged.push({ 
      role: "user", 
      parts: [{ text: lastUserMsg?.content || "Continue" }] 
    });
  }

  return merged;
}

export function extractResponseParts(result: unknown): GeminiPart[] {
  if (!result) return [];
  const asRecord = result as Record<string, unknown>;
  
  // Direct parts array (our normalized return)
  if (Array.isArray(asRecord.parts)) return asRecord.parts;
  
  // From candidates[0].content.parts (Gemini REST native)
  const candidates = asRecord.candidates as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const content = candidates[0].content as Record<string, unknown> | undefined;
    if (content && Array.isArray(content.parts)) {
      return content.parts as GeminiPart[];
    }
  }

  // From message.content (our normalized return)
  const message = asRecord.message as Record<string, unknown> | undefined;
  if (message && Array.isArray(message.content)) {
    return message.content as GeminiPart[];
  }
  
  // Fallback
  return [];
}
