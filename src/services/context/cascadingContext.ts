import { stageRegistry } from "../../config/stageRegistry";

/**
 * Builds the cascading context string from already-resolved stage text.
 * Both the async (Firebase) and sync (in-memory) paths use the same ordering logic.
 */
/**
 * Builds the cascading context string from already-resolved stage text.
 * Implements "Intelligent Pruning" to keep the AI focused on the most relevant 
 * narrative DNA while staying within reasonable token limits.
 */
export async function buildCascadingContext(
  getStageText: (stageName: string) => string | Promise<string>,
  currentStage: string
): Promise<string> {
  const currentDef = stageRegistry.get(currentStage);
  const currentOrder = currentDef.order;
  
  let ctx = "--- NARRATIVE CONTEXT ---\n";

  // 1. CORE DNA (Always Included)
  const projectBrief = await Promise.resolve(getStageText("Project Brief"));
  if (projectBrief) ctx += `[PROJECT BRIEF]\n${projectBrief}\n\n`;

  // 2. BIBLES (Included for Narrative & Production stages)
  if (currentOrder >= 3) { // Treatment onwards
    const storyBible = await Promise.resolve(getStageText("Story Bible"));
    if (storyBible) ctx += `[STORY BIBLE]\n${storyBible}\n\n`;
  }

  // 3. IMMEDIATE HISTORY (The stage directly preceding the current one)
  const prevDef = stageRegistry.getPrevious(currentStage as any);
  if (prevDef && prevDef.order > 0) { // Skip Discovery
    const prevText = await Promise.resolve(getStageText(prevDef.id));
    if (prevText) {
      ctx += `[PRECEDING STAGE: ${prevDef.name.toUpperCase()}]\n${prevText}\n\n`;
    }
  }

  // 4. DISTANT ANCHORS
  if (currentOrder <= 2) {
    const discovery = await Promise.resolve(getStageText("Discovery"));
    if (discovery && currentStage !== "Discovery") ctx += `[DISCOVERY]\n${discovery}\n\n`;
  }

  return ctx;
}
