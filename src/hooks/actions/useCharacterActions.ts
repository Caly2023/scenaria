import { useTranslation } from 'react-i18next';
import { Project, ContentPrimitive } from '../../types';
import { geminiService } from '../../services/geminiService';
import { classifyError } from '../../lib/errorClassifier';
import { stageRegistry } from '../../config/stageRegistry';
import { useUpdateSubcollectionDocMutation } from '../../services/firebaseApi';

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

  const handleGenerateViews = async (id: string) => {
    if (!currentProject) return;
    const characters = stageContents['Character Bible'] || [];
    const char = characters.find(c => c.id === id);
    if (!char) return;

    setIsTyping(true);
    try {
      const views = await geminiService.generateCharacterViews(char.content);
      const collectionName = stageRegistry.getCollectionName('Character Bible');
      await updateSubcol({ 
        projectId: currentProject.id, 
        collectionName, 
        docId: id, 
        data: {
          views: {
            front: views[0] || '',
            profile: views[1] || '',
            back: views[2] || '',
            full: views[3] || '',
          }
        }
      });
      addToast(t('common.viewsGenerated', { defaultValue: 'Character views generated!' }), 'success');
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    } finally {
      setIsTyping(false);
    }
  };

  const handleCharacterDeepDevelop = async (id: string) => {
    if (!currentProject) return;
    const characters = stageContents['Character Bible'] || [];
    const char = characters.find(c => c.id === id);
    if (!char) return;

    setIsTyping(true);
    setRefiningBlockId(id);
    try {
      const brainstorming = stageContents['Brainstorming'] || [];
      const bStory = brainstorming.map(p => p.content).join('\n\n');
      
      const charData = {
        id: char.id,
        name: char.title,
        description: char.content,
        tier: char.metadata?.tier,
        visualPrompt: char.visualPrompt,
      };

      const deepData = await geminiService.deepDevelopCharacter(
        charData as any, 
        bStory, 
        characters.filter(c => c.id !== id).map(c => ({ name: c.title, description: c.content })) as any
      );

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

      const collectionName = stageRegistry.getCollectionName('Character Bible');
      await updateSubcol({
        projectId: currentProject.id,
        collectionName,
        docId: id,
        data: { description: formattedDescription, deepDevelopment: deepData }
      }).unwrap();
      
      addToast(t('common.deepDeveloped', { name: char.title, defaultValue: 'Character deep developed!' }), 'success');
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    } finally {
      setIsTyping(false);
      setRefiningBlockId(null);
    }
  };

  return {
    handleGenerateViews,
    handleCharacterDeepDevelop
  };
}
