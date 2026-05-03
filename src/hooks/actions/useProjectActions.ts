import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage } from '../../types';
import { 
  useUpdateProjectMetadataMutation 
} from '../../services/firebaseService';
import { interpretIntent, buildProjectContext, dispatchToAgent, persistAgentOutput } from '../../services/orchestration';
import { ContentPrimitive } from '../../types/stageContract';
import { runAsyncAction } from '@/utils/actionUtils';

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

    await runAsyncAction(
      async () => {
        const decision = interpretIntent(feedback, stage, blockId);
        const currentContent: ContentPrimitive[] = stageContents[stage] || [];
        
        const context = buildProjectContext(
          currentProject.id,
          currentProject.metadata,
          stageContents,
          currentProject.stageAnalyses || {}
        );

        const agentOutput = await dispatchToAgent(decision, context, currentContent);
        await persistAgentOutput(currentProject.id, stage, agentOutput, { replaceAll: stage === 'Discovery' });
        
        // Handle special metadata updates (like Logline/Discovery)
        if (agentOutput.metadataUpdates) {
          const newMeta = { ...currentProject.metadata, ...agentOutput.metadataUpdates };
          await updateMetadata({ id: currentProject.id, metadata: newMeta }).unwrap();
        }

        if (blockId) {
          setLastUpdatedPrimitiveId(blockId);
          setTimeout(() => setLastUpdatedPrimitiveId(null), 2000);
        }
      },
      {
        setIsTyping,
        setRefiningId: setRefiningBlockId,
        refiningId: blockId,
        addToast,
        successMessage: t('common.refinedSuccessfully', { stage })
      }
    );
  };

  return {
    handleStageRefine
  };
}
