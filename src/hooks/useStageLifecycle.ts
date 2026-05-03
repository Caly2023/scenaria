import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage } from '../types';
import { 
  useUpdateProjectFieldMutation, 
  useUpdateProjectFieldsMutation,
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
  const [updateFields] = useUpdateProjectFieldsMutation();
  const [clearSubcol] = useClearSubcollectionMutation();

  const handleRegenerate = useCallback(async (stage: WorkflowStage) => {
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
  }, [currentProject, isRegenerating, setIsRegenerating, setIsTyping, setIsHeavyThinking, clearSubcol, addToast, hydrationState]);

  const triggerStageGeneration = useCallback(async (targetStage: WorkflowStage, project?: Project) => {
    const proj = project || currentProject;
    if (!proj) return;
    
    setIsTyping(true);
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
      throw error; 
    } finally {
      setIsTyping(false);
    }
  }, [currentProject, setIsTyping, getProjectContext, addToast]);

  const handleStageValidate = useCallback(async (stage: WorkflowStage) => {
    if (!currentProject) return;
    setSyncStatus('syncing');
    setIsTyping(true);
    try {
      const allStageIds = stageRegistry.getAllIds();
      const currentIndex = allStageIds.indexOf(stage);
      const nextStage = allStageIds[currentIndex + 1];
      const newValidatedStages = Array.from(new Set([...(currentProject.validatedStages || []), stage]));

      const updates: Record<string, any> = {
        validatedStages: newValidatedStages
      };

      if (nextStage) {
        updates.activeStage = nextStage;
      }

      await updateFields({ id: currentProject.id, updates }).unwrap();

      if (nextStage) {
        handleStageChange(nextStage);
        addToast(`✅ ${stage} validé. Passage à ${nextStage}...`, 'success');

        // Fire generation in background — let auto-hydration handle it if it fails or takes long
        // Exception: Discovery stage populates the next stage (Project Brief) directly.
        if (stage !== 'Discovery') {
          triggerStageGeneration(nextStage, currentProject).catch((error) => {
            console.error(`[Validate] Background generation failed for "${nextStage}":`, error);
            // Don't show a toast here — auto-hydration will retry on next mount
          });
        }
      }

      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      const classified = classifyError(error);
      addToast(t('common.failedToGenerate') + ` (${classified.userMessage})`, 'error');
      setSyncStatus('error');
    } finally {
      // Always release the loading state — generation is now non-blocking
      setIsTyping(false);
    }
  }, [currentProject, setSyncStatus, setIsTyping, updateFields, handleStageChange, addToast, triggerStageGeneration, t]);


  return { handleRegenerate, handleStageValidate, triggerStageGeneration };
}
