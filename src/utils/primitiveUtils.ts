import { WorkflowStage } from "../types";

/**
 * Maps generic ContentPrimitive fields (title, content) to collection-specific fields (name, description).
 * This ensures compatibility with legacy "Character Bible" and "Location Bible" schemas.
 */
export function mapPrimitiveToDb(stage: WorkflowStage | string, data: any): any {
  const safeData = { ...data };
  
  if (stage === "Character Bible" || stage === "Location Bible") {
    if (data.title !== undefined) safeData.name = data.title;
    if (data.content !== undefined) safeData.description = data.content;
    // Don't delete title/content to maintain compatibility during transitions
  }
  
  return safeData;
}

/**
 * Maps collection-specific fields (name, description) back to generic ContentPrimitive fields (title, content).
 */
export function mapDbToPrimitive(stage: WorkflowStage | string, data: any): any {
  const safeData = { ...data };
  
  if (stage === "Character Bible" || stage === "Location Bible") {
    if (data.name !== undefined) safeData.title = data.name;
    if (data.description !== undefined) safeData.content = data.description;
  }
  
  return safeData;
}
