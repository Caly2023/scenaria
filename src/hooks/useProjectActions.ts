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

interface UseProjectActionsProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId: (id: string | null) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  handleSubcollectionUpdate: (collName: string, id: string, content: string) => void;
  characters: Character[];
  locations: Location[];
  sequences: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  pitchPrimitives: Sequence[];
  loglinePrimitives: Sequence[];
  structurePrimitives: Sequence[];
  synopsisPrimitives: Sequence[];
}

export function useProjectActions({
  currentProject,
  setIsTyping,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  addToast,
  handleSubcollectionUpdate,
  characters = [],
  locations = [],
  sequences = [],
  treatmentSequences = [],
  scriptScenes = [],
  pitchPrimitives = [],
  loglinePrimitives = [],
  structurePrimitives = [],
  synopsisPrimitives = [],
}: UseProjectActionsProps) {
  const { t } = useTranslation();
  
  const [updateMetadata] = useUpdateProjectMetadataMutation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();
  const [addSubcol] = useAddSubcollectionDocMutation();

  const stageCollections = {
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives,
    characters,
    locations,
    treatmentSequences,
    sequences,
    scriptScenes,
  };

  const handleStageRefine = async (stage: WorkflowStage, feedback: string, blockId?: string) => {
    if (!currentProject) return;
    setIsTyping(true);
    if (blockId) setRefiningBlockId(blockId);
    
    try {
      const decision = interpretIntent(feedback, stage, blockId);
      
      const currentContent: ContentPrimitive[] = getStageContentPrimitives(stage, stageCollections);
      
      const context = buildProjectContext(
        currentProject.id,
        currentProject.metadata,
        buildStageContentsMap(stageCollections),
        currentProject.stageAnalyses || {}
      );

      const agentOutput = await dispatchToAgent(decision, context, currentContent);
      await persistAgentOutput(currentProject.id, stage, agentOutput, { replaceAll: stage === 'Brainstorming' });
      
      // Handle special metadata updates (like Logline/Brainstorming)
      if (agentOutput.metadataUpdates) {
        const newMeta = { ...currentProject.metadata, ...agentOutput.metadataUpdates };
        await updateMetadata({ id: currentProject.id, metadata: newMeta });
        if (agentOutput.metadataUpdates.logline) {
          // Metadata logline updated in metadataUpdates block above
        }
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
    
    if (updates.content !== undefined) {
      handleSubcollectionUpdate('sequences', id, updates.content);
    }

    if (updates.title !== undefined) {
      updateSubcol({ projectId: currentProject.id, collectionName: 'sequences', docId: id, data: { title: updates.title }, orderByField: 'order' })
        .catch(console.error);
    }
  };

  const handleSequenceAdd = async () => {
    if (!currentProject) return;
    try {
      await addSubcol({ projectId: currentProject.id, collectionName: 'sequences', data: { title: t('common.newSequenceLabel'), content: '', order: sequences.length } }).unwrap();
    } catch (error) {
      const classified = classifyError(error);
      addToast(classified.userMessage, 'error');
    }
  };

  const handleAiMagic = async (id: string) => {
    if (!currentProject) return;
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
    const char = characters.find(c => c.id === id);
    if (!char) return;

    setIsTyping(true);
    try {
      const views = await geminiService.generateCharacterViews(char.description);
      await updateSubcol({ 
        projectId: currentProject.id, 
        collectionName: 'characters', 
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
    const char = characters.find(c => c.id === id);
    if (!char) return;

    setIsTyping(true);
    setRefiningBlockId(id);
    try {
      const bStory = pitchPrimitives.map(p => p.content).join('\n\n');
      const deepData = await geminiService.deepDevelopCharacter(
        char, 
        bStory, 
        characters.filter(c => c.id !== id)
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

      await updateSubcol({
        projectId: currentProject.id,
        collectionName: 'characters',
        docId: id,
        data: { description: formattedDescription, deepDevelopment: deepData }
      }).unwrap();
      
      addToast(t('common.deepDeveloped', { name: char.name, defaultValue: 'Character deep developed!' }), 'success');
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
    const loc = locations.find(l => l.id === id);
    if (!loc) return;

    setIsTyping(true);
    setRefiningBlockId(id);
    try {
      const bStory = pitchPrimitives.map(p => p.content).join('\n\n');
      const developed = await geminiService.deepDevelopLocation(
        loc, 
        bStory
      );
      await updateSubcol({
        projectId: currentProject.id,
        collectionName: 'locations',
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
    handleSequenceUpdate,
    handleSequenceAdd,
    handleAiMagic,
    handleGenerateViews,
    handleCharacterDeepDevelop,
    handleLocationDeepDevelop
  };
}
