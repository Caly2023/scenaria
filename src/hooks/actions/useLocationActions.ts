import { useTranslation } from 'react-i18next';
import { Project, ContentPrimitive } from '../../types';
import { geminiService } from '../../services/geminiService';
import { stageRegistry } from '../../config/stageRegistry';
import { useUpdateSubcollectionDocMutation } from '../../services/firebaseService';
import { runAsyncAction } from '@/utils/actionUtils';

interface UseLocationActionsProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  setRefiningBlockId: (id: string | null) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  stageContents: Record<string, ContentPrimitive[]>;
}

export function useLocationActions({
  currentProject,
  setIsTyping,
  setRefiningBlockId,
  addToast,
  stageContents,
}: UseLocationActionsProps) {
  const { t } = useTranslation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();

  const handleLocationDeepDevelop = async (id: string) => {
    if (!currentProject) return;
    const locations = stageContents['Location Bible'] || [];
    const loc = locations.find(l => l.id === id);
    if (!loc) return;

    await runAsyncAction(
      async () => {
        const brainstorming = stageContents['Brainstorming'] || [];
        const bStory = brainstorming.map(p => p.content).join('\n\n');
        const developed = await geminiService.deepDevelopLocation(
          { name: loc.title, description: loc.content } as any, 
          bStory
        );
        const collectionName = stageRegistry.getCollectionName('Location Bible');
        await updateSubcol({
          projectId: currentProject.id,
          collectionName,
          docId: id,
          data: { description: developed }
        }).unwrap();
      },
      {
        setIsTyping,
        setRefiningId: setRefiningBlockId,
        refiningId: id,
        addToast,
        successMessage: t('common.locationDeveloped', { defaultValue: 'Location developed!' })
      }
    );
  };

  return {
    handleLocationDeepDevelop
  };
}
