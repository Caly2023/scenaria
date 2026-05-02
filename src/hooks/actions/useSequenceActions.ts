import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Project, ContentPrimitive, Sequence } from '../../types';
import { geminiService } from '../../services/geminiService';
import { contextAssembler } from '../../services/context';
import { classifyError } from '../../lib/errorClassifier';
import { stageRegistry } from '../../config/stageRegistry';
import { 
  useUpdateSubcollectionDocMutation, 
  useAddSubcollectionDocMutation 
} from '../../services/firebaseService';

interface UseSequenceActionsProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  handleSubcollectionUpdate: (collName: string, id: string, data: Record<string, any>) => void;
  stageContents: Record<string, ContentPrimitive[]>;
}

export function useSequenceActions({
  currentProject,
  setIsTyping,
  addToast,
  handleSubcollectionUpdate,
  stageContents,
}: UseSequenceActionsProps) {
  const { t } = useTranslation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();
  const [addSubcol] = useAddSubcollectionDocMutation();

  const handleSequenceUpdate = useCallback((id: string, updates: Partial<Sequence>) => {
    if (!currentProject) return;
    const collectionName = stageRegistry.getCollectionName('Step Outline');
    
    // Use debounced sync for content, direct update for other fields
    if (Object.keys(updates).length === 1 && updates.content !== undefined) {
      handleSubcollectionUpdate(collectionName, id, { content: updates.content });
    } else {
      updateSubcol({ 
        projectId: currentProject.id, 
        collectionName, 
        docId: id, 
        data: updates, 
        orderByField: 'order' 
      }).catch(console.error);
    }
  }, [currentProject, handleSubcollectionUpdate, updateSubcol]);

  const handleSequenceAdd = useCallback(async () => {
    if (!currentProject) return;
    const sequences = stageContents['Step Outline'] || [];
    const collectionName = stageRegistry.getCollectionName('Step Outline');
    try {
      await addSubcol({ 
        projectId: currentProject.id, 
        collectionName, 
        data: { title: t('common.newSequenceLabel'), content: '', order: sequences.length } 
      }).unwrap();
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    }
  }, [currentProject, stageContents, addSubcol, t, addToast]);

  const handleAiMagic = useCallback(async (id: string) => {
    if (!currentProject) return;
    const sequences = stageContents['Step Outline'] || [];
    const seq = sequences.find(s => s.id === id);
    if (!seq) return;

    setIsTyping(true);
    try {
      const instruction = stageRegistry.get('Step Outline').prompts?.magic || "Refine this content for better cinematic quality.";
      
      const payload = await contextAssembler.buildPromptPayload(currentProject.id, 'Step Outline', id);
      const prompt = contextAssembler.formatPrompt(payload, instruction);
      
      const improvedContent = await geminiService.rewriteSequenceWithContext(prompt);
      handleSequenceUpdate(id, { content: improvedContent as string });
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    } finally {
      setIsTyping(false);
    }
  }, [currentProject, stageContents, setIsTyping, handleSequenceUpdate, addToast]);

  return useMemo(() => ({
    handleSequenceUpdate,
    handleSequenceAdd,
    handleAiMagic
  }), [handleSequenceUpdate, handleSequenceAdd, handleAiMagic]);
}
