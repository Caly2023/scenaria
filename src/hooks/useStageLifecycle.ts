import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage } from '../types';
import { 
  useUpdateProjectFieldMutation, 
  useClearSubcollectionMutation 
} from '../services/firebaseService';
import { classifyError } from '../lib/errorClassifier';
import { stageRegistry } from '../config/stageRegistry';
import { agentRegistry } from '../agents/agentRegistry';
import { persistAgentOutput, buildProjectContext } from '../services/orchestration';
import { ProjectContext } from '../types/stageContract';

interface UseStageLifecycleProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  setSyncStatus: (status: 'synced' | 'syncing' | 'error') => void;
  setIsHeavyThinking: (val: boolean) => void;
  setIsRegenerating: (val: boolean) => void;
  isRegenerating: boolean;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  handleStageChange: (stage: WorkflowStage) => void;
  getProjectContext?: () => ProjectContext | null;
  hydrationState: {
    resetHydration?: (stage: WorkflowStage) => void;
  };
}

export function useStageLifecycle({
  currentProject,
  setIsTyping,
  setSyncStatus,
  setIsHeavyThinking,
  setIsRegenerating,
  isRegenerating,
  addToast,
  handleStageChange,
  getProjectContext,
  hydrationState
}: UseStageLifecycleProps) {
  const { t } = useTranslation();
  const [updateField] = useUpdateProjectFieldMutation();
  const [clearSubcol] = useClearSubcollectionMutation();

  const handleRegenerate = async (stage: WorkflowStage) => {
    if (!currentProject || isRegenerating) return;
    setIsRegenerating(true);
    setIsTyping(true);
    setIsHeavyThinking(true);
    try {
      const collectionName = stageRegistry.getCollectionName(stage);
      if (collectionName) {
        await clearSubcol({ projectId: currentProject.id, collectionName }).unwrap();
      }
      addToast(`Regenerating ${stage}...`, 'info');
      hydrationState.resetHydration?.(stage);
    } catch (error) {
      console.error(`Regenerate failed for ${stage}:`, error);
      const classified = classifyError(error);
      addToast(`Failed to regenerate ${stage}: ${classified.userMessage}`, 'error');
    } finally {
      setIsRegenerating(false);
      setIsTyping(false);
      setIsHeavyThinking(false);
    }
  };

  const handleStageValidate = async (stage: WorkflowStage) => {
    if (!currentProject) return;
    setSyncStatus('syncing');
    setIsTyping(true);
    try {
      const allStageIds = stageRegistry.getAllIds();
      const currentIndex = allStageIds.indexOf(stage);
      const nextStage = allStageIds[currentIndex + 1];
      const newValidatedStages = Array.from(new Set([...(currentProject.validatedStages || []), stage]));
      
      await updateField({ id: currentProject.id, field: 'validatedStages', content: newValidatedStages }).unwrap();
      if (nextStage) {
        await updateField({ id: currentProject.id, field: 'activeStage', content: nextStage }).unwrap();
        handleStageChange(nextStage);
        addToast(`✅ ${stage} validé. Passage à ${nextStage}...`, 'success');
        triggerStageGeneration(nextStage, currentProject);
      }
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      const classified = classifyError(error);
      addToast(t('common.failedToGenerate') + ` (${classified.userMessage})`, 'error');
      setSyncStatus('error');
    } finally {
      setIsTyping(false);
    }
  };

  const triggerStageGeneration = async (targetStage: WorkflowStage, project?: Project) => {
    const proj = project || currentProject;
    if (!proj) return;
    try {
      const agent = await agentRegistry.get(targetStage);
      if (!agent) return;

      const context = getProjectContext?.() || buildProjectContext(proj.id, proj.metadata, {}, proj.stageAnalyses || {});
      
      addToast(`🧠 Drafting ${targetStage}...`, 'info');
      const output = await agent.generate(context);
      const result = await persistAgentOutput(proj.id, targetStage, output, { replaceAll: true });

      if (result.success) {
        addToast(`✅ ${targetStage} draft ready!`, 'success');
      }
    } catch (error) {
      console.error(`[StageGeneration] Failed for "${targetStage}":`, error);
    }
  };

  return { handleRegenerate, handleStageValidate, triggerStageGeneration };
}
