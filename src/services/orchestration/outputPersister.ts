import { serverTimestamp } from 'firebase/firestore';
import { store } from '../../store';
import { firebaseService } from '../firebaseService';
import { AgentOutput, PersistResult } from '../../types/stageContract';
import { stageRegistry } from '../../config/stageRegistry';
import { telemetryService } from '../telemetryService';

/**
 * Persists an AgentOutput to Firestore in strict order:
 * 1. Write Analysis
 * 2. Write Content (subcollection primitives)
 * 3. Write State
 *
 * NEVER skips or reorders these steps.
 */
export async function persistAgentOutput(
  projectId: string,
  stageName: string,
  output: AgentOutput,
  options: { replaceAll?: boolean } = {}
): Promise<PersistResult> {
  const primitiveIds: string[] = [];

  try {
    // ── STEP 1: Write Analysis ────────────────────────────────────────────────
    telemetryService.setStatus('persist_analysis', '📊', `Writing analysis for ${stageName}...`);
    await store.dispatch(firebaseService.endpoints.updateProjectField.initiate({
      id: projectId,
      field: `stageAnalyses.${stageName}`,
      content: output.analysis
    })).unwrap();

    // ── STEP 2: Write Content (subcollection) ─────────────────────────────────
    telemetryService.setStatus('persist_content', '📡', `Writing content for ${stageName}...`);
    let stageDef;
    try {
      stageDef = stageRegistry.get(stageName);
    } catch {
      // Unknown stage — skip subcollection write
      telemetryService.setStatus('persist_content', '⚠️', `Unknown stage ${stageName} — skipping subcollection write`);
    }

    if (stageDef && output.content.length > 0) {
      if (options.replaceAll) {
        // Delete existing before writing new ones
        await store.dispatch(firebaseService.endpoints.clearSubcollection.initiate({ projectId, collectionName: stageDef.collectionName })).unwrap();
      }

      // Write all content primitives in parallel
      const writeResults = await Promise.all(
        output.content.map(async (prim, i) => {
          const data: Record<string, unknown> = {
            title: prim.title,
            content: prim.content,
            order: prim.order ?? i,
            primitiveType: prim.primitiveType,
            agentGenerated: prim.agentGenerated ?? true,
            agentVersion: prim.agentVersion ?? '2.0',
            projectId,
            updatedAt: serverTimestamp(),
          };
          if (prim.visualPrompt) data.visualPrompt = prim.visualPrompt;
          if (prim.metadata) Object.assign(data, prim.metadata);

          // IMPORTANT: Firestore throws synchronous errors if any field is undefined.
          // Strip undefined values from data before passing to Firestore operations
          Object.keys(data).forEach(key => {
            if (data[key] === undefined) {
              delete data[key];
            }
          });

          // If primitive has a real Firestore ID (not a temp one) → update
          if (prim.id && !prim.id.startsWith('beat_') && !prim.id.startsWith('treatment_')
              && !prim.id.startsWith('scene_') && !prim.id.startsWith('script_')
              && !prim.id.startsWith('synopsis_') && !prim.id.startsWith('char_gen_')
              && !prim.id.startsWith('loc_gen_') && !prim.id.startsWith('logline_')
              && !prim.id.startsWith('draft_') && !prim.id.startsWith('breakdown_')
              && !prim.id.startsWith('asset_') && !prim.id.startsWith('previs_')
              && !prim.id.startsWith('export_') && !prim.id.startsWith('storyboard_')) {
            // Real Firestore ID — update existing document
            try {
              await store.dispatch(firebaseService.endpoints.updateSubcollectionDoc.initiate({
                projectId,
                collectionName: stageDef.collectionName,
                docId: prim.id,
                data
              })).unwrap();
              return prim.id;
            } catch {
              // Doc might not exist yet — fall through to addDoc
            }
          }

          // Create new document
          const newRefId = await store.dispatch(firebaseService.endpoints.addSubcollectionDoc.initiate({
            projectId,
            collectionName: stageDef.collectionName,
            data
          })).unwrap();
          return newRefId;
        })
      );

      primitiveIds.push(...writeResults);
      telemetryService.invalidateStage(stageName);
    }

    // ── STEP 3: Write State ───────────────────────────────────────────────────
    telemetryService.setStatus('persist_state', '✅', `State: ${output.state} for ${stageName}`);
    await store.dispatch(firebaseService.endpoints.updateProjectField.initiate({
      id: projectId,
      field: `stageStates.${stageName}`,
      content: output.state
    })).unwrap();

    telemetryService.setStatus('Confirmed', '✅', `${stageName} persisted (Analysis→Content→State)`);

    return { success: true, primitiveIds };
  } catch (error: unknown) {
    const errorObj = error !== null && typeof error === 'object' ? (error as Record<string, unknown>) : {};
    const errorMessage = typeof errorObj.message === 'string' ? errorObj.message : String(error);
    telemetryService.setStatus('Error', '❌', `Persist failed for ${stageName}: ${errorMessage}`);
    return { success: false, primitiveIds, error: errorMessage };
  }
}
