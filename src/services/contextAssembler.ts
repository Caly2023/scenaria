import { store } from '../store';
import { firebaseApi } from './firebaseApi';
import { Character, Location, Sequence, WorkflowStage } from '../types';
import { telemetryService } from './telemetryService';
import { stageRegistry } from '../config/stageRegistry';
import { PromptPayload } from '../types/context';

// ── Shared helper ─────────────────────────────────────────────────────────────
/**
 * Builds the cascading context string from already-resolved stage text.
 * Both the async (Firebase) and sync (in-memory) paths use the same ordering logic.
 */
async function buildCascadingContext(
  getStageText: (stageName: string) => string | Promise<string>,
  currentStage: string,
  isUnlocked?: (stageName: string) => boolean,
): Promise<string> {
    const unlocked = isUnlocked ?? (() => true);
    let ctx = '';
    const currentDef = stageRegistry.get(currentStage);
    const currentCategory = currentDef.category;

    // Always include Brainstorming if we are beyond it
    if (currentDef.order > 2) {
      const bStory = await Promise.resolve(getStageText('Brainstorming'));
      if (bStory) ctx += `[BRAINSTORMING]\n${bStory}\n\n`;
    }

    // Foundation/Structure Stages
    if (currentCategory === 'FOUNDATION') {
      const allStages = stageRegistry.getAll();
      for (let i = 0; i < currentDef.order; i++) {
        const s = allStages[i];
        if (s.id === 'Logline' || s.id === 'Brainstorming' || s.id === 'Project Metadata') continue;
        const text = await Promise.resolve(getStageText(s.id));
        if (text) ctx += `[${s.name.toUpperCase()}]\n${text}\n\n`;
      }
    } 
    // Narrative/Production Stages
    else if (currentCategory === 'NARRATIVE' || currentCategory === 'PRODUCTION') {
      const logline = await Promise.resolve(getStageText('Logline'));
      if (logline) ctx += `[LOGLINE]\n${logline}\n\n`;

      if (unlocked('Synopsis')) {
        const synopsis = await Promise.resolve(getStageText('Synopsis'));
        if (synopsis) ctx += `[SYNOPSIS]\n${synopsis}\n\n`;
      }

      // Include Bibles if we are past them
      if (currentDef.order > 8) {
        if (unlocked('Character Bible') && currentStage !== 'Character Bible') {
          const chars = await Promise.resolve(getStageText('__characterBible__'));
          if (chars) ctx += chars;
        }
        if (unlocked('Location Bible') && currentStage !== 'Location Bible') {
          const locs = await Promise.resolve(getStageText('__locationBible__'));
          if (locs) ctx += locs;
        }
      }
    } 
    // Early Stages
    else {
      const draft = await Promise.resolve(getStageText('Initial Draft'));
      if (draft) ctx += `[INITIAL DRAFT]\n${draft}\n\n`;
    }

    return ctx;
}

class ContextAssembler {
  private async getStageTextInternal(
    projectId: string, 
    stageName: string, 
    allCharacters: any[], 
    allLocations: any[]
  ): Promise<string> {
    if (stageName === '__characterBible__') {
      return `[CHARACTER BIBLE]\n${JSON.stringify(allCharacters.map(c => ({ 
        name: c.name || c.title, 
        role: c.role, 
        description: c.description || c.content, 
        wantsNeeds: c.deepDevelopment?.nowStory?.wantsNeeds || '' 
      })), null, 2)}\n\n`;
    }
    if (stageName === '__locationBible__') {
      return `[LOCATION BIBLE]\n${JSON.stringify(allLocations.map(l => ({ 
        name: l.name || l.title, 
        atmosphere: l.atmosphere, 
        description: l.description || l.content 
      })), null, 2)}\n\n`;
    }
    const primitives = await this.getStageStructure(projectId, stageName);
    return primitives.map(p => p.content).join('\n\n');
  }

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

    const getStageText = (sName: string) => this.getStageTextInternal(projectId, sName, allCharacters, allLocations);

    const isUnlocked = (sName: string): boolean => {
      const state = project.stageStates?.[sName];
      return !!(state && state !== 'empty');
    };

    const currentOrder = stageRegistry.get(currentStage).order;
    const cascadingContext = await buildCascadingContext(
      getStageText, 
      currentStage, 
      isUnlocked
    );

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

  async getContextForStage(
    projectId: string, 
    currentStage: WorkflowStage, 
    activePrimitiveId?: string
  ): Promise<string> {
    const payload = await this.buildPromptPayload(projectId, currentStage, activePrimitiveId);
    return this.formatPrompt(payload, "");
  }

  async buildPayloadFromProjectContext(
    context: any, 
    currentStage: WorkflowStage
  ): Promise<PromptPayload> {
    const { metadata, stageContents } = context;
    
    const payload: PromptPayload = {
      metadata: {
        title: metadata.title || 'Untitled',
        genre: metadata.genre || 'N/A',
        format: metadata.format || 'Feature',
        tone: metadata.tone || 'N/A',
        languages: metadata.languages || [],
        logline: metadata.logline || '',
        targetDuration: metadata.targetDuration
      },
      characters: (stageContents['Character Bible'] || []).map((c: any) => ({
        id: c.id, name: c.title || c.name, role: c.role,
        description: c.content || c.description, deepDevelopment: c.deepDevelopment
      })),
      locations: (stageContents['Location Bible'] || []).map((l: any) => ({
        id: l.id, name: l.title || l.name, atmosphere: l.atmosphere, description: l.content || l.description
      })),
    };

    const getStageText = (sName: string) => {
      if (sName === '__characterBible__') {
        return `[CHARACTER BIBLE]\n${JSON.stringify((stageContents['Character Bible'] || []).map((c: any) => ({ name: c.title || c.name, description: c.content || c.description })), null, 2)}\n\n`;
      }
      if (sName === '__locationBible__') {
        return `[LOCATION BIBLE]\n${JSON.stringify((stageContents['Location Bible'] || []).map((l: any) => ({ name: l.title || l.name, description: l.content || l.description })), null, 2)}\n\n`;
      }
      return (stageContents[sName] || []).map((p: any) => p.content).join('\n\n');
    };

    const cascadingContext = await buildCascadingContext(
      getStageText, 
      currentStage
    );
    
    const currentItems = stageContents[currentStage] || [];
    payload.sectionalContext = `${cascadingContext}\n[CURRENT STAGE CONTENT: ${currentStage}]\n${JSON.stringify(currentItems, null, 2)}`;

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
