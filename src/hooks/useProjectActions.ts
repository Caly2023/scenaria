import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage, Sequence, Character, Location } from '../types';
import { geminiService } from '../services/geminiService';
import { classifyError } from '../lib/errorClassifier';
import { contextAssembler } from '../services/contextAssembler';
import { 
  useUpdateProjectMetadataMutation,
  useUpdateSubcollectionDocMutation,
  useAddSubcollectionDocMutation 
} from '../services/firebaseApi';
import { interpretIntent, buildProjectContext, dispatchToAgent, persistAgentOutput } from '../services/orchestratorService';
import { ContentPrimitive } from '../types/stageContract';
import { buildStageContentsMap, getStageContentPrimitives } from '../lib/stageContent';
import { stageRegistry } from '../config/stageRegistry';

interface UseProjectActionsProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId: (id: string | null) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  handleSubcollectionUpdate: (collName: string, id: string, data: Record<string, any>) => void;
  stageContents: Record<string, import('../types/stageContract').ContentPrimitive[]>;
}

export function useProjectActions({
  currentProject,
  setIsTyping,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  addToast,
  handleSubcollectionUpdate,
  stageContents,
}: UseProjectActionsProps) {
  const { t } = useTranslation();
  
  const [updateMetadata] = useUpdateProjectMetadataMutation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();
  const [addSubcol] = useAddSubcollectionDocMutation();

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

  const handleSequenceUpdate = (id: string, updates: Partial<Sequence>) => {
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
  };

  const handleSequenceAdd = async () => {
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
  };

  const handleAiMagic = async (id: string) => {
    if (!currentProject) return;
    const sequences = stageContents['Step Outline'] || [];
    const seq = sequences.find(s => s.id === id);
    if (!seq) return;

    setIsTyping(true);
    try {
      const payload = await contextAssembler.buildPromptPayload(currentProject.id, 'Step Outline', id);
      const instruction = "Rewrite this scene to be more dramatic and cinematic. Maintain continuity with the previous and next scenes.";
      
      const improvedContent = await geminiService.rewriteSequence(seq.content || '', instruction);
      handleSequenceUpdate(id, { content: improvedContent as string });
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    } finally {
      setIsTyping(false);
    }
  };

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
      const pitchPrimitives = stageContents['Brainstorming'] || [];
      const bStory = pitchPrimitives.map(p => p.content).join('\n\n');
      
      // Map ContentPrimitive back to Character structure for the service if needed
      // but here we just need content and name
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

  const handleLocationDeepDevelop = async (id: string) => {
    if (!currentProject) return;
    const locations = stageContents['Location Bible'] || [];
    const loc = locations.find(l => l.id === id);
    if (!loc) return;

    setIsTyping(true);
    setRefiningBlockId(id);
    try {
      const pitchPrimitives = stageContents['Brainstorming'] || [];
      const bStory = pitchPrimitives.map(p => p.content).join('\n\n');
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
      addToast(t('common.locationDeveloped', { defaultValue: 'Location developed!' }), 'success');
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    } finally {
      setIsTyping(false);
      setRefiningBlockId(null);
    }
  };

  return {
    handleStageRefine,
    handleAiMagic,
    handleGenerateViews,
    handleCharacterDeepDevelop,
    handleLocationDeepDevelop
  };
}
