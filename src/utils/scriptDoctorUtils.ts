import { ScriptDoctorMessage } from "../types/scriptDoctor";

export function getTextFromModelResponse(response: unknown): string {
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

export function sanitizePartsForHistory(parts: any[] | null | undefined): any[] {
  if (!Array.isArray(parts)) return [];
  return parts.filter((part) => part && typeof part === "object");
}

export function sanitizeFinalParts(parts: any[] | null | undefined): any[] {
  if (!Array.isArray(parts)) return [];
  return parts.filter((part) => {
    if (!part || typeof part !== "object") return false;
    if (part.toolRequest || part.functionCall) return false;
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

export function classifyComplexity(content: string): "simple" | "moderate" | "complex" {
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

export function normalizeHistory(messages: ScriptDoctorMessage[]): Array<{ role: string; content: any[] }> {
  const history: Array<{ role: string; content: any[] }> = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      history.push({
        role: "user",
        content: [{ text: msg.content }],
      });
    } else {
      if (msg.content_parts && msg.content_parts.length > 0) {
        history.push({
          role: msg.role === "assistant" ? "model" : msg.role,
          content: msg.content_parts,
        });
      } else {
        const role = msg.role === "assistant" ? "model" : msg.role;
        
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

  const cleaned: typeof history = [];
  for (const entry of history) {
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === entry.role && entry.role !== "tool") {
      last.content.push(...entry.content);
    } else {
      cleaned.push(entry);
    }
  }

  while (cleaned.length > 0 && cleaned[0].role !== "user") {
    cleaned.shift();
  }

  return cleaned;
}
