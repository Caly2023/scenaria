import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage, Sequence, Character, Location } from '../types';
import { geminiService } from '../services/geminiService';
import { classifyError } from '../lib/errorClassifier';
import { contextAssembler } from '../services/contextAssembler';
import { 
  useUpdateProjectFieldMutation, 
  useUpdateProjectMetadataMutation,
  useUpdateSubcollectionDocMutation,
  useAddSubcollectionDocMutation 
} from '../services/firebaseApi';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

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
}

export function useProjectActions({
  currentProject,
  setIsTyping,
  setRefiningBlockId,
  setLastUpdatedPrimitiveId,
  addToast,
  handleSubcollectionUpdate,
  characters,
  locations,
  sequences
}: UseProjectActionsProps) {
  const { t } = useTranslation();
  
  const [updateField] = useUpdateProjectFieldMutation();
  const [updateMetadata] = useUpdateProjectMetadataMutation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();
  const [addSubcol] = useAddSubcollectionDocMutation();

  const handleStageRefine = async (stage: WorkflowStage, feedback: string, blockId?: string) => {
    if (!currentProject) return;
    setIsTyping(true);
    if (blockId) setRefiningBlockId(blockId);
    
    try {
      let refinedContent = '';
      let field = '';

      if (['Treatment', 'Script', 'Step Outline'].includes(stage) && blockId) {
        const payload = await contextAssembler.buildPromptPayload(currentProject.id, stage, blockId);
        const prompt = contextAssembler.formatPrompt(payload, `Refine this block based on this feedback: "${feedback}". Return ONLY the refined text.`);
        refinedContent = await geminiService.rewriteSequenceWithContext(prompt);
        
        const subcollection = stage === 'Treatment' ? 'treatment_sequences' : 
                             stage === 'Script' ? 'script_scenes' : 'sequences';
        
        await updateSubcol({ projectId: currentProject.id, collectionName: subcollection, docId: blockId, data: { content: refinedContent }, orderByField: 'order' }).unwrap();
        setLastUpdatedPrimitiveId(blockId);
        setTimeout(() => setLastUpdatedPrimitiveId(null), 2000);
        
        addToast(t('common.blockRefined', { stage }), 'success');
        setIsTyping(false);
        setRefiningBlockId(null);
        return;
      }
      
      if (stage === 'Brainstorming') {
        const dualResult = await geminiService.brainstormDual(
          feedback, 
          currentProject.pitch_result || "", 
          currentProject.metadata || { title: '', format: 'Short Film', genre: '', tone: '', languages: [], targetDuration: '', logline: '' }
        );
        
        // Parallelize the three root-level field writes
        await Promise.all([
          updateField({ id: currentProject.id, field: 'pitch_critique', content: dualResult.critique }),
          updateField({ id: currentProject.id, field: 'pitch_result', content: dualResult.pitch }),
          updateField({ id: currentProject.id, field: 'pitch_validation', content: dualResult.validation }),
        ]);

        const pitchSnap = await getDocs(query(collection(db, 'projects', currentProject.id, 'pitch_primitives'), orderBy('order')));
        if (pitchSnap.docs.length >= 2) {
          // Parallelize the two primitive updates
          await Promise.all([
            updateSubcol({ projectId: currentProject.id, collectionName: 'pitch_primitives', docId: pitchSnap.docs[0].id, data: { content: dualResult.critique }, orderByField: 'order' }),
            updateSubcol({ projectId: currentProject.id, collectionName: 'pitch_primitives', docId: pitchSnap.docs[1].id, data: { content: dualResult.pitch }, orderByField: 'order' }),
          ]);
        } else {
          // Parallelize the two primitive inserts
          await Promise.all([
            addSubcol({ projectId: currentProject.id, collectionName: 'pitch_primitives', data: { title: 'Primitive A: The Critique', content: dualResult.critique, type: 'analysis_block', order: 0 } }),
            addSubcol({ projectId: currentProject.id, collectionName: 'pitch_primitives', data: { title: 'Primitive B: The Final Pitch', content: dualResult.pitch, type: 'pitch_result', order: 1 } }),
          ]);
        }
        
        if (dualResult.metadataUpdates) {
          const newMeta = { ...currentProject.metadata, ...dualResult.metadataUpdates };
          const metaWrites: Promise<any>[] = [updateMetadata({ id: currentProject.id, metadata: newMeta })];
          if (dualResult.metadataUpdates.logline) {
            metaWrites.push(updateField({ id: currentProject.id, field: 'loglineDraft', content: dualResult.metadataUpdates.logline }));
          }
          await Promise.all(metaWrites);
        }
        
        setIsTyping(false);
        setRefiningBlockId(null);
        return;
      } else if (stage === 'Logline') {
        refinedContent = await geminiService.refineLoglineDraft(currentProject.loglineDraft || '', feedback);
        field = 'loglineDraft';
      } else if (stage === 'Synopsis') {
        refinedContent = await geminiService.rewriteSequence(currentProject.synopsisDraft || '', feedback);
        field = 'synopsisDraft';
      } else if (stage === '3-Act Structure') {
        refinedContent = await geminiService.refine3ActStructure(currentProject.structureDraft || '', feedback);
        field = 'structureDraft';
      } else if (stage === 'Treatment') {
        refinedContent = await geminiService.rewriteSequence(currentProject.treatmentDraft || '', feedback);
        field = 'treatmentDraft';
      } else if (stage === 'Script') {
        refinedContent = await geminiService.rewriteSequence(currentProject.scriptDraft || '', feedback);
        field = 'scriptDraft';
      }

      if (field && refinedContent) {
        await updateField({ id: currentProject.id, field, content: refinedContent });
        if (field === 'loglineDraft') {
          await updateMetadata({ id: currentProject.id, metadata: { ...currentProject.metadata, logline: refinedContent } });
        }
        addToast(t('common.refinedSuccessfully', { stage }), 'success');
      }
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
      const prompt = contextAssembler.formatPrompt(payload, "Rewrite this scene to be more dramatic and cinematic. Maintain continuity with the previous and next scenes.");
      const rewritten = await geminiService.rewriteSequenceWithContext(prompt);
      handleSequenceUpdate(id, { content: rewritten });
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
      const deepData = await geminiService.deepDevelopCharacter(
        char, 
        currentProject.brainstorming_story || '', 
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
      const developed = await geminiService.deepDevelopLocation(
        loc, 
        currentProject.brainstorming_story || ''
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
