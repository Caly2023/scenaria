import { useCallback, useMemo } from 'react';
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

  const handleLocationDeepDevelop = useCallback(async (id: string) => {
    if (!currentProject) return;
    const bible = stageContents['Story Bible'] || [];
    const loc = bible.find(l => l.id === id && l.primitiveType === 'location');
    if (!loc) return;

    await runAsyncAction(
      async () => {
        const brief = stageContents['Project Brief'] || [];
        const briefText = brief.map(p => p.content).join('\n\n');
        const developed = await geminiService.deepDevelopLocation(
          { name: loc.title, description: loc.content } as any, 
          briefText
        );
        const collectionName = stageRegistry.getCollectionName('Story Bible');
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
  }, [currentProject, stageContents, setIsTyping, setRefiningBlockId, addToast, t, updateSubcol]);

  return useMemo(() => ({
    handleLocationDeepDevelop
  }), [handleLocationDeepDevelop]);
}
