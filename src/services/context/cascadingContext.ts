import { stageRegistry } from "../../config/stageRegistry";

/**
 * Builds the cascading context string from already-resolved stage text.
 * Both the async (Firebase) and sync (in-memory) paths use the same ordering logic.
 */
export async function buildCascadingContext(
  getStageText: (stageName: string) => string | Promise<string>,
  currentStage: string,
  isUnlocked?: (stageName: string) => boolean
): Promise<string> {
  const unlocked = isUnlocked ?? (() => true);
  let ctx = "";
  const currentDef = stageRegistry.get(currentStage);
  const currentCategory = currentDef.category;

  // Always include Brainstorming if we are beyond it
  if (currentDef.order > 2) {
    const bStory = await Promise.resolve(getStageText("Brainstorming"));
    if (bStory) ctx += `[BRAINSTORMING]\n${bStory}\n\n`;
  }

  // Foundation/Structure Stages
  if (currentCategory === "FOUNDATION") {
    const allStages = stageRegistry.getAll();
    for (let i = 0; i < currentDef.order; i++) {
      const s = allStages[i];
      if (s.id === "Logline" || s.id === "Brainstorming" || s.id === "Project Metadata") continue;
      const text = await Promise.resolve(getStageText(s.id));
      if (text) ctx += `[${s.name.toUpperCase()}]\n${text}\n\n`;
    }
  }
  // Narrative/Production Stages
  else if (currentCategory === "NARRATIVE" || currentCategory === "PRODUCTION") {
    const logline = await Promise.resolve(getStageText("Logline"));
    if (logline) ctx += `[LOGLINE]\n${logline}\n\n`;

    if (unlocked("Synopsis")) {
      const synopsis = await Promise.resolve(getStageText("Synopsis"));
      if (synopsis) ctx += `[SYNOPSIS]\n${synopsis}\n\n`;
    }

    // Include Bibles if we are past them
    if (currentDef.order > 8) {
      if (unlocked("Character Bible") && currentStage !== "Character Bible") {
        const chars = await Promise.resolve(getStageText("__characterBible__"));
        if (chars) ctx += chars;
      }
      if (unlocked("Location Bible") && currentStage !== "Location Bible") {
        const locs = await Promise.resolve(getStageText("__locationBible__"));
        if (locs) ctx += locs;
      }
    }
  }
  // Early Stages
  else {
    const draft = await Promise.resolve(getStageText("Initial Draft"));
    if (draft) ctx += `[INITIAL DRAFT]\n${draft}\n\n`;
  }

  return ctx;
}
