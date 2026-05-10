import { store } from "../../store";
import { WorkflowStage, ContentPrimitive } from "../../types";
import { firebaseService } from "../firebaseService";
import { telemetryService } from "../telemetryService";
import { stageRegistry } from "../../config/stageRegistry";

export async function getStageStructure(
  projectId: string,
  stageName: string
): Promise<Array<ContentPrimitive & Record<string, unknown>>> {
  try {
    telemetryService.setStatus("Fetching stage", "🧠", `Mapping Primitive IDs for ${stageName}...`);

    let subcollection: string | undefined;
    try {
      subcollection = stageRegistry.getCollectionName(stageName);
    } catch {
      return [];
    }
    
    if (subcollection) {
      const stageDef = stageRegistry.get(stageName);
      const snap = await store.dispatch(firebaseService.endpoints.getSubcollection.initiate({ 
        projectId, 
        collectionName: subcollection, 
        orderByField: stageDef.orderField 
      }));
      
      const docs = snap.data || [];
      const primitives = docs.map((d: unknown) => {
        const obj = d as Record<string, unknown>;
        return {
          ...obj,
          title: (obj.title as string) || (obj.name as string) || "",
          content: (obj.content as string) || (obj.description as string) || "",
          order: (obj.order as number) ?? 0,
        };
      });

      telemetryService.hydrateStage(stageName, subcollection, primitives as ContentPrimitive[]);
      return primitives as (ContentPrimitive & Record<string, unknown>)[];
    }
  } catch (error) {
    console.error(`[ContextAssembler] Error fetching stage ${stageName}:`, error);
  }

  return [];
}

export async function hydrateFullIdMap(projectId: string): Promise<void> {
  telemetryService.setStatus("Full Sync", "🧠", "Mapping ALL Primitive IDs across stages...");

  const allStages = stageRegistry.getAllIds();

  await Promise.all(
    allStages.map(async (stageName) => {
      try {
        await getStageStructure(projectId, stageName);
      } catch (_e) {
        console.warn(`[ContextAssembler] Failed to hydrate stage: ${stageName}`);
      }
    })
  );

  telemetryService.setStatus("Sync Complete", "✅", "All Primitive IDs mapped.");
  setTimeout(() => telemetryService.clearStatus(), 2000);
}
