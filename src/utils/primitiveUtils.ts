import { WorkflowStage } from "../types";
import { stageRegistry } from "../config/stageRegistry";

/**
 * Maps generic ContentPrimitive fields (title, content) to collection-specific fields (name, description).
 * This ensures compatibility with legacy "Character Bible" and "Location Bible" schemas.
 */
export function mapPrimitiveToDb(stage: WorkflowStage | string, data: any): any {
  const safeData = { ...data };
  
  const isBible = stageRegistry.getCategory(stage) === 'BIBLE';
  
  if (isBible) {
    if (data.title !== undefined) safeData.name = data.title;
    if (data.content !== undefined) safeData.description = data.content;
  }
  
  return safeData;
}


