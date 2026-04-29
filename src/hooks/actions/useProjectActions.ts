import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage } from '../../types';
import { classifyError } from '../../lib/errorClassifier';
import { 
  useUpdateProjectMetadataMutation 
} from '../../services/firebaseApi';
import { interpretIntent, buildProjectContext, dispatchToAgent, persistAgentOutput } from '../../services/orchestrator';
import { ContentPrimitive } from '../../types/stageContract';

interface UseProjectActionsProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId: (id: string | null) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  stageContents: Record<string, ContentPrimitive[]>;
}

export function useProjectActions({
  currentProject,
  setIsTyping,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  addToast,
  stageContents,
}: UseProjectActionsProps) {
  const { t } = useTranslation();
  const [updateMetadata] = useUpdateProjectMetadataMutation();

  const handleStageRefine = async (stage: WorkflowStage, feedback: string, blockId?: string) => {
    if (!currentProject) return;
    setIsTyping(true);
    if (blockId) setRefiningBlockId(blockId);
    
    try {
      const decision = interpretIntent(feedback, stage, blockId);
      const currentContent: ContentPrimitive[] = stageContents[stage] || [];
      
      const context = buildProjectContext(
        currentProject.id,
        currentProject.metadata,
        stageContents,
        currentProject.stageAnalyses || {}
      );

      const agentOutput = await dispatchToAgent(decision, context, currentContent);
      await persistAgentOutput(currentProject.id, stage, agentOutput, { replaceAll: stage === 'Brainstorming' });
      
      // Handle special metadata updates (like Logline/Brainstorming)
      if (agentOutput.metadataUpdates) {
        const newMeta = { ...currentProject.metadata, ...agentOutput.metadataUpdates };
        await updateMetadata({ id: currentProject.id, metadata: newMeta });
      }

      if (blockId) {
        setLastUpdatedPrimitiveId(blockId);
        setTimeout(() => setLastUpdatedPrimitiveId(null), 2000);
      }
      
      addToast(t('common.refinedSuccessfully', { stage }), 'success');
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    } finally {
      setIsTyping(false);
      setRefiningBlockId(null);
    }
  };

  return {
    handleStageRefine
  };
}
