import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Project, ContentPrimitive } from '../../types';
import { geminiService } from '../../services/geminiService';
import { stageRegistry } from '../../config/stageRegistry';
import { useUpdateSubcollectionDocMutation } from '../../services/firebaseService';
import { runAsyncAction } from '@/utils/actionUtils';

interface UseCharacterActionsProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  setRefiningBlockId: (id: string | null) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  stageContents: Record<string, ContentPrimitive[]>;
}

export function useCharacterActions({
  currentProject,
  setIsTyping,
  setRefiningBlockId,
  addToast,
  stageContents,
}: UseCharacterActionsProps) {
  const { t } = useTranslation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();

  const handleGenerateViews = useCallback(async (id: string) => {
    if (!currentProject) return;
    const bible = stageContents['Story Bible'] || [];
    const char = bible.find(c => c.id === id && c.primitiveType === 'character');
    if (!char) return;

    await runAsyncAction(
      async () => {
        const views = await geminiService.generateCharacterViews(char.content);
        
        const isConfirmed = window.confirm(
          "Images successfully generated via nano banana pro!\n\n" +
          "Do you validate these images? Click OK to store them on Cloudinary and save to your character, or Cancel to discard."
        );

        if (!isConfirmed) {
          return;
        }

        const { cloudinaryService } = await import('../../services/cloudinaryService');
        
        const uploadedUrls = await Promise.all(
          (views as string[]).map(async (base64OrUrl) => {
             const res = await cloudinaryService.uploadImage(base64OrUrl);
             return res.secure_url;
          })
        );

        const collectionName = stageRegistry.getCollectionName('Story Bible');
        await updateSubcol({ 
          projectId: currentProject.id, 
          collectionName, 
          docId: id, 
          data: {
            views: {
              front: uploadedUrls[0] || '',
              profile: uploadedUrls[1] || '',
              back: uploadedUrls[2] || '',
              full: uploadedUrls[3] || '',
            }
          }
        }).unwrap();
      },
      {
        setIsTyping,
        addToast,
        successMessage: t('common.viewsGenerated', { defaultValue: 'Character views generated!' })
      }
    );
  }, [currentProject, stageContents, setIsTyping, addToast, t, updateSubcol]);

  const handleCharacterDeepDevelop = useCallback(async (id: string) => {
    if (!currentProject) return;
    const bible = stageContents['Story Bible'] || [];
    const char = bible.find(c => c.id === id && c.primitiveType === 'character');
    if (!char) return;

    await runAsyncAction(
      async () => {
        const brief = stageContents['Project Brief'] || [];
        const briefText = brief.map(p => p.content).join('\n\n');
        
        const charData = {
          id: char.id,
          name: char.title,
          description: char.content,
          tier: char.metadata?.tier,
          visualPrompt: char.visualPrompt,
        };

        const otherChars = bible.filter(c => c.id !== id && c.primitiveType === 'character').map(c => ({ name: c.title, description: c.content }));

        const deepData = await geminiService.deepDevelopCharacter(
          charData as { name: string } & Record<string, unknown>, 
          briefText, 
          otherChars as { name: string }[]
        ) as {
          nowStory: { tags: string[], physical: string, wantsNeeds: string },
          backStory: string,
          forwardStory: string,
          relationshipMap: string
        };

        const formattedDescription = `
## Now-Story
**Personality Tags:** ${deepData.nowStory.tags.join(', ')}
**Physical:** ${deepData.nowStory.physical}
**Wants vs Needs:** ${deepData.nowStory.wantsNeeds}

## Back-Story (The Wound)
${deepData.backStory}

## Forward-Story (Arc)
${deepData.forwardStory}

## Relationship Map
${deepData.relationshipMap}
        `.trim();

        const collectionName = stageRegistry.getCollectionName('Story Bible');
        await updateSubcol({
          projectId: currentProject.id,
          collectionName,
          docId: id,
          data: { description: formattedDescription, deepDevelopment: deepData }
        }).unwrap();
      },
      {
        setIsTyping,
        setRefiningId: setRefiningBlockId,
        refiningId: id,
        addToast,
        successMessage: t('common.deepDeveloped', { name: char.title, defaultValue: 'Character deep developed!' })
      }
    );
  }, [currentProject, stageContents, setIsTyping, setRefiningBlockId, addToast, t, updateSubcol]);

  return useMemo(() => ({
    handleGenerateViews,
    handleCharacterDeepDevelop
  }), [handleGenerateViews, handleCharacterDeepDevelop]);
}
