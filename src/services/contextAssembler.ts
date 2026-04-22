import { store } from '../store';
import { firebaseApi } from './firebaseApi';
import { Character, Location, Sequence, WorkflowStage } from '../types';
import { telemetryService } from './telemetryService';
import { stageRegistry } from '../config/stageRegistry';

export interface PromptPayload {
  metadata: {
    title: string;
    genre: string;
    format: string;
    tone: string;
    languages: string[];
    logline: string;
    targetDuration?: string;
  };
  sectionalContext?: string;
  characters: Character[];
  locations: Location[];
  previousSequence?: {
    content: string;
    title: string;
  };
  currentSequence?: {
    title: string;
    content: string;
  };
  nextSequence?: {
    title: string;
    content: string;
  };
  idMapContext?: string;
}

class ContextAssembler {
  async getStageStructure(
    projectId: string,
    stageName: string
  ): Promise<Array<{ id: string; title: string; content: string; order: number; [key: string]: any }>> {
    try {
      telemetryService.setStatus('Fetching stage', '🧠', `Mapping Primitive IDs for ${stageName}...`);

      let subcollection: string | undefined;
      try {
        subcollection = stageRegistry.getCollectionName(stageName);
      } catch {
        return [];
      }
      
      if (subcollection) {
        const stageDef = stageRegistry.get(stageName);
        const snap = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ 
          projectId, 
          collectionName: subcollection, 
          orderByField: stageDef.orderField 
        }));
        
        const docs = snap.data || [];
        const primitives = docs.map((d: any) => ({
          ...d,
          title: d.title || d.name || '',
          content: d.content || d.description || '',
          order: d.order ?? 0,
        }));

        telemetryService.hydrateStage(stageName, subcollection, primitives as any);
        return primitives;
      }
    } catch (error) {
      console.error(`[ContextAssembler] Error fetching stage ${stageName}:`, error);
    }

    return [];
  }

  async hydrateFullIdMap(projectId: string): Promise<void> {
    telemetryService.setStatus('Full Sync', '🧠', 'Mapping ALL Primitive IDs across stages...');

    const allStages = stageRegistry.getAllIds();

    // Fetch all stages in parallel to populate telemetry ID-Map
    await Promise.all(
      allStages.map(async (stageName) => {
        try {
          await this.getStageStructure(projectId, stageName);
        } catch (_e) {
          console.warn(`[ContextAssembler] Failed to hydrate stage: ${stageName}`);
        }
      })
    );

    telemetryService.setStatus('Sync Complete', '✅', 'All Primitive IDs mapped.');
    setTimeout(() => telemetryService.clearStatus(), 2000);
  }

  async buildPromptPayload(
    projectId: string, 
    currentStage: WorkflowStage, 
    activePrimitiveId?: string
  ): Promise<PromptPayload> {
    const projectResult = await store.dispatch(firebaseApi.endpoints.getProjectById.initiate(projectId));
    const project = projectResult.data;
    if (!project) throw new Error('Project not found');

    const charResult = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: 'characters' }));
    const allCharacters = (charResult.data || []) as Character[];
    
    const locResult = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: 'locations' }));
    const allLocations = (locResult.data || []) as Location[];

    telemetryService.hydrateStage('Character Bible', 'characters', allCharacters as any);
    telemetryService.hydrateStage('Location Bible', 'locations', allLocations as any);

    const payload: PromptPayload = {
      metadata: {
        title: project.metadata?.title || 'Untitled',
        genre: project.metadata?.genre || 'N/A',
        format: project.metadata?.format || 'Feature',
        tone: project.metadata?.tone || 'N/A',
        languages: project.metadata?.languages || [],
        logline: project.metadata?.logline || '',
        targetDuration: project.metadata?.targetDuration
      },
      characters: [],
      locations: []
    };

    // Helper to get text representation of a stage
    const getStageText = async (sName: string) => {
      const primitives = await this.getStageStructure(projectId, sName);
      return primitives.map(p => p.content).join('\n\n');
    };

    // Helper to check if a stage is unlocked
    const isUnlocked = (sName: string) => {
      const state = project.stageStates?.[sName];
      return state && state !== 'empty';
    };

    const currentOrder = stageRegistry.get(currentStage).order;
    let cascadingContext = '';

    // Helpers for specific content blocks
    const getCharacterBibleText = () => `[CHARACTER BIBLE]\n${JSON.stringify(allCharacters.map(c => ({ 
      name: c.name, 
      role: c.role, 
      description: c.description,
      wantsNeeds: c.deepDevelopment?.nowStory?.wantsNeeds || ''
    })), null, 2)}\n\n`;

    const getLocationBibleText = () => `[LOCATION BIBLE]\n${JSON.stringify(allLocations.map(l => ({ 
      name: l.name, 
      atmosphere: l.atmosphere, 
      description: l.description 
    })), null, 2)}\n\n`;

    if (currentOrder >= 2 && currentOrder <= 4) {
      // --- STEPS 2, 3, 4: BRAINSTORMING + PREVIOUS (NO LOGLINE) ---
      const bStory = await getStageText('Brainstorming');
      if (bStory) cascadingContext += `[BRAINSTORMING]\n${bStory}\n\n`;

      const allStages = stageRegistry.getAll();
      for (let i = 0; i < currentOrder; i++) {
        const s = allStages[i];
        if (s.id === 'Logline' || s.id === 'Brainstorming') continue;
        const text = await getStageText(s.id);
        if (text) cascadingContext += `[${s.name.toUpperCase()}]\n${text}\n\n`;
      }
    } else if (currentOrder > 4) {
      // --- NEXT STAGES: LOGLINE + SYNOPSIS + BIBLES ---
      if (isUnlocked('Synopsis')) {
        const logline = await getStageText('Logline');
        if (logline) cascadingContext += `[LOGLINE]\n${logline}\n\n`;

        const synopsis = await getStageText('Synopsis');
        if (synopsis) cascadingContext += `[SYNOPSIS]\n${synopsis}\n\n`;

        if (isUnlocked('Character Bible') && currentStage !== 'Character Bible') cascadingContext += getCharacterBibleText();
        if (isUnlocked('Location Bible') && currentStage !== 'Location Bible') cascadingContext += getLocationBibleText();
      } else {
        // Fallback if synopsis not unlocked: Basic foundation
        const bStory = await getStageText('Brainstorming');
        if (bStory) cascadingContext += `[BRAINSTORMING]\n${bStory}\n\n`;
        const logline = await getStageText('Logline');
        if (logline) cascadingContext += `[LOGLINE]\n${logline}\n\n`;
      }
    } else {
      // --- STEPS 0, 1 (BRAINSTORMING, LOGLINE) ---
      const bStory = await getStageText('Brainstorming');
      if (bStory) cascadingContext += `[BRAINSTORMING]\n${bStory}\n\n`;
    }

    const primitives = await this.getStageStructure(projectId, currentStage);
    const sectionalContent = JSON.stringify(primitives, null, 2);
    
    payload.sectionalContext = `${cascadingContext}\n[CURRENT STAGE CONTENT: ${currentStage}]\n${sectionalContent}`;
    payload.idMapContext = telemetryService.getIdMapContext();

    if (activePrimitiveId && (currentStage === 'Step Outline' || currentStage === 'Script' || currentStage === 'Treatment')) {
      const collName = stageRegistry.getCollectionName(currentStage) || 'sequences';
      const seqsResult = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: collName, orderByField: 'order' }));
      const allSeqs = (seqsResult.data || []) as Sequence[];
      const currentSeqIndex = allSeqs.findIndex(s => s.id === activePrimitiveId);
      
      if (currentSeqIndex !== -1) {
        const currentSeq = allSeqs[currentSeqIndex];
        payload.currentSequence = { title: currentSeq.title, content: currentSeq.content };

        if (currentSeq.characterIds && currentSeq.characterIds.length > 0) {
          payload.characters = allCharacters.filter(c => currentSeq.characterIds?.includes(c.id));
        }
        if (currentSeq.locationIds && currentSeq.locationIds.length > 0) {
          payload.locations = allLocations.filter(l => currentSeq.locationIds?.includes(l.id));
        }

        if (currentSeqIndex > 0) {
          const prevSeq = allSeqs[currentSeqIndex - 1];
          payload.previousSequence = { title: prevSeq.title, content: prevSeq.content };
        }
        if (currentSeqIndex < allSeqs.length - 1) {
          const nextSeq = allSeqs[currentSeqIndex + 1];
          payload.nextSequence = { title: nextSeq.title, content: nextSeq.content };
        }
      }
    }

    return payload;
  }

  formatPrompt(payload: PromptPayload, task: string): string {
    return `
[SYSTEM INSTRUCTIONS]
You are a professional screenwriter. Use the provided context to maintain continuity and narrative depth.

[GLOBAL CONSTANTS]
Project Title: ${payload.metadata.title}
Format: ${payload.metadata.format}
Genre: ${payload.metadata.genre}
Tone: ${payload.metadata.tone}
Languages: ${payload.metadata.languages.join(', ')}
Logline: ${payload.metadata.logline}
${payload.metadata.targetDuration ? `Target Duration: ${payload.metadata.targetDuration}` : ''}

[FOUNDATION & CURRENT CONTEXT]
${payload.sectionalContext || 'N/A'}

${payload.idMapContext || ''}

[SCENE-SPECIFIC ENTITIES]
${payload.characters.length > 0 ? `Characters present: ${JSON.stringify(payload.characters.map(c => ({ name: c.name, role: c.role, description: c.description })), null, 2)}` : ''}
${payload.locations.length > 0 ? `Location details: ${JSON.stringify(payload.locations.map(l => ({ name: l.name, atmosphere: l.atmosphere, description: l.description })), null, 2)}` : ''}

[SLIDING WINDOW]
${payload.previousSequence ? `Previous Scene Text: ${payload.previousSequence.content}` : 'Previous Scene: [Start of Story]'}
Current Scene Outline: ${payload.currentSequence?.content || 'N/A'}
${payload.nextSequence ? `Next Scene Outline: ${payload.nextSequence.content}` : 'Next Scene: [End of Story]'}

[TASK]
${task}
`;
  }
}

export const contextAssembler = new ContextAssembler();
