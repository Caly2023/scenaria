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
  const logline = await Promise.resolve(getStageText("Logline"));
  if (logline) ctx += `[LOGLINE]\n${logline}\n\n`;

  const synopsis = await Promise.resolve(getStageText("Synopsis"));
  if (synopsis && currentOrder > 6) {
    ctx += `[SYNOPSIS SUMMARY]\n${synopsis}\n\n`;
  }

  // 2. BIBLES (Included for Narrative & Production stages)
  if (currentOrder >= 9) { // Treatment onwards
    const chars = await Promise.resolve(getStageText("__characterBible__"));
    const locs = await Promise.resolve(getStageText("__locationBible__"));
    if (chars) ctx += chars;
    if (locs) ctx += locs;
  }

  // 3. IMMEDIATE HISTORY (The stage directly preceding the current one)
  const prevDef = stageRegistry.getPrevious(currentStage as any);
  if (prevDef && prevDef.order > 0) { // Skip Discovery if we have better structural data
    const prevText = await Promise.resolve(getStageText(prevDef.id));
    if (prevText) {
      ctx += `[PRECEDING STAGE: ${prevDef.name.toUpperCase()}]\n${prevText}\n\n`;
    }
  }

  // 4. DISTANT ANCHORS (Include Discovery only if we are in early stages)
  if (currentOrder <= 4) {
    const discovery = await Promise.resolve(getStageText("Discovery"));
    if (discovery && currentStage !== "Discovery") ctx += `[DISCOVERY]\n${discovery}\n\n`;
  }

  return ctx;
}
