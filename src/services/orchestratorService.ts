/**
 * ORCHESTRATOR SERVICE — The Script Doctor's decision-making brain.
 *
 * Responsibilities:
 * 1. interpretIntent()    — parse user message → OrchestratorDecision
 * 2. dispatchToAgent()    — call correct agent method
 * 3. persistAgentOutput() — enforce Analysis → Content → State write order
 *
 * This service is stateless and has no UI dependencies.
 */

import {
  serverTimestamp
} from 'firebase/firestore';
import { store } from '../store';
import { firebaseApi } from './firebaseApi';
import {
  AgentOutput,
  OrchestratorDecision,
  OrchestratorAction,
  ContentPrimitive,
  ProjectContext,
  StageAnalysis,
  PersistResult,
} from '../types/stageContract';
import { agentRegistry } from '../agents/agentRegistry';
import { stageRegistry } from '../config/stageRegistry';
import { telemetryService } from './telemetryService';

// ─── Intent Interpretation ────────────────────────────────────────────────────

const GENERATE_KEYWORDS = [
  'generate', 'create', 'write', 'draft', 'build', 'make', 'compose',
  'générer', 'créer', 'écrire', 'rédiger',
];
const UPDATE_KEYWORDS = [
  'update', 'refine', 'rewrite', 'fix', 'improve', 'modify', 'change', 'edit', 'apply',
  'mettre à jour', 'refaire', 'corriger', 'améliorer', 'modifier', 'changer',
];
const EVALUATE_KEYWORDS = [
  'analyze', 'evaluate', 'assess', 'review', 'check', 'audit',
  'analyser', 'évaluer', 'examiner', 'vérifier',
];

export function interpretIntent(
  message: string,
  activeStage: string,
  targetPrimitiveId?: string
): OrchestratorDecision {
  const lower = message.toLowerCase();

  let action: OrchestratorAction = 'evaluate';
  if (UPDATE_KEYWORDS.some(kw => lower.includes(kw))) action = 'update';
  else if (GENERATE_KEYWORDS.some(kw => lower.includes(kw))) action = 'generate';
  else if (EVALUATE_KEYWORDS.some(kw => lower.includes(kw))) action = 'evaluate';

  // Detect explicit stage references
  let targetStage = activeStage;
  try {
    const allStages = stageRegistry.getAll();
    for (const stageDef of allStages) {
      if (lower.includes(stageDef.name.toLowerCase())) {
        targetStage = stageDef.id;
        break;
      }
    }
  } catch {
    // keep targetStage = activeStage
  }

  // Context requirements based on the target stage
  let requiresContext: string[] = [];
  try {
    const stageDef = stageRegistry.get(targetStage);
    requiresContext = stageDef.requires as string[];
  } catch {
    requiresContext = [];
  }

  return {
    action,
    targetStage,
    targetPrimitiveId,
    instruction: message,
    requiresContext,
  };
}

// ─── Agent Dispatch ───────────────────────────────────────────────────────────

export async function dispatchToAgent(
  decision: OrchestratorDecision,
  context: ProjectContext,
  currentContent: ContentPrimitive[]
): Promise<AgentOutput> {
  const agent = await agentRegistry.get(decision.targetStage);
  if (!agent) {
    // No agent for this stage → return graceful fallback
    return {
      analysis: {
        evaluation: `No agent registered for stage "${decision.targetStage}".`,
        issues: ['No agent available'],
        recommendations: ['This stage may not support AI-assisted operations yet'],
        updatedAt: Date.now(),
      },
      content: currentContent,
      state: currentContent.length > 0 ? 'good' : 'empty',
    };
  }

  switch (decision.action) {
    case 'generate':
      return agent.generate(context);

    case 'update':
      if (!decision.targetPrimitiveId) {
        // No specific primitive → treat as generate/refine of entire stage
        return agent.generate(context);
      }
      return agent.updatePrimitive(
        decision.targetPrimitiveId,
        decision.instruction,
        currentContent,
        context
      );

    case 'evaluate': {
      const evalResult = await agent.evaluate(currentContent, context);
      return { ...evalResult, content: currentContent };
    }

    default:
      return agent.evaluate(currentContent, context).then(r => ({ ...r, content: currentContent }));
  }
}

// ─── Persist Agent Output (Enforced Write Order) ──────────────────────────────

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
    await store.dispatch(firebaseApi.endpoints.updateProjectField.initiate({
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
        await store.dispatch(firebaseApi.endpoints.clearSubcollection.initiate({ projectId, collectionName: stageDef.collectionName })).unwrap();
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
              await store.dispatch(firebaseApi.endpoints.updateSubcollectionDoc.initiate({
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
          const newRefId = await store.dispatch(firebaseApi.endpoints.addSubcollectionDoc.initiate({
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
    await store.dispatch(firebaseApi.endpoints.updateProjectField.initiate({
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

// ─── Build ProjectContext from live data ──────────────────────────────────────

export function buildProjectContext(
  projectId: string,
  metadata: any,
  stageContentsMap: Record<string, ContentPrimitive[]>,
  stageAnalysesMap: Record<string, StageAnalysis>
): ProjectContext {
  return {
    projectId,
    metadata: {
      title: typeof metadata?.title === 'string' ? metadata.title : 'Untitled',
      genre: typeof metadata?.genre === 'string' ? metadata.genre : '',
      format: typeof metadata?.format === 'string' ? metadata.format : 'Short Film',
      tone: typeof metadata?.tone === 'string' ? metadata.tone : '',
      languages: Array.isArray(metadata?.languages) ? (metadata.languages as string[]) : [],
      logline: typeof metadata?.logline === 'string' ? metadata.logline : '',
      targetDuration: typeof metadata?.targetDuration === 'string' ? metadata.targetDuration : undefined,
    },
    stageContents: stageContentsMap,
    stageAnalyses: stageAnalysesMap,
  };
}
