import { OrchestratorDecision, OrchestratorAction } from '../../types/stageContract';
import { stageRegistry } from '../../config/stageRegistry';

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
