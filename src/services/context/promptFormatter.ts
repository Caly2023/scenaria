import { PromptPayload } from "../../types/context";

export function formatPrompt(payload: PromptPayload, task: string): string {
  return `
[SYSTEM INSTRUCTIONS]
You are a professional screenwriter. Use the provided context to maintain continuity and narrative depth.

[GLOBAL CONSTANTS]
Project Title: ${payload.metadata.title}
Format: ${payload.metadata.format}
Genre: ${payload.metadata.genre}
Tone: ${payload.metadata.tone}
Languages: ${payload.metadata.languages.join(", ")}
Logline: ${payload.metadata.logline}
${payload.metadata.targetDuration ? `Target Duration: ${payload.metadata.targetDuration}` : ""}

[FOUNDATION & CURRENT CONTEXT]
${payload.sectionalContext || "N/A"}

${payload.idMapContext || ""}

[SCENE-SPECIFIC ENTITIES]
${
  payload.characters.length > 0
    ? `Characters present: ${JSON.stringify(
        payload.characters.map((c) => ({
          name: c.name,
          role: c.role,
          description: c.description,
        })),
        null,
        2
      )}`
    : ""
}
${
  payload.locations.length > 0
    ? `Location details: ${JSON.stringify(
        payload.locations.map((l) => ({
          name: l.name,
          atmosphere: l.atmosphere,
          description: l.description,
        })),
        null,
        2
      )}`
    : ""
}

[SLIDING WINDOW]
${
  payload.previousSequence
    ? `Previous Scene Text: ${payload.previousSequence.content}`
    : "Previous Scene: [Start of Story]"
}
Current Scene Outline: ${payload.currentSequence?.content || "N/A"}
${
  payload.nextSequence
    ? `Next Scene Outline: ${payload.nextSequence.content}`
    : "Next Scene: [End of Story]"
}

[TASK]
${task}
`;
}
