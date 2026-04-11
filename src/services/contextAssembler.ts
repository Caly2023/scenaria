import { store } from '../store';
import { firebaseApi } from './firebaseApi';
import { Project, Character, Location, Sequence, WorkflowStage } from '../types';
import { telemetryService } from './telemetryService';

export interface PromptPayload {
  metadata: {
    title: string;
    genre: string;
    languages: string[];
    logline: string;
  };
  logline: string;
  structure: string;
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

const SUBCOLLECTION_MAP: Record<string, string> = {
  'Step Outline': 'sequences',
  'Treatment': 'treatment_sequences',
  'Script': 'script_scenes',
  'Character Bible': 'characters',
  'Location Bible': 'locations',
  'Brainstorming': 'pitch_primitives',
};

class ContextAssembler {
  async getStageStructure(
    projectId: string,
    stageName: string
  ): Promise<Array<{ id: string; title: string; content: string; order: number; [key: string]: any }>> {
    telemetryService.setStatus('Fetching stage', '🧠', `Mapping Primitive IDs for ${stageName}...`);

    const subcollection = SUBCOLLECTION_MAP[stageName];
    
    if (subcollection) {
      const snap = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: subcollection, orderByField: 'order' }));
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

    const projectResult = await store.dispatch(firebaseApi.endpoints.getProjectById.initiate(projectId));
    const project = projectResult.data;
    if (!project) return [];

    const fieldMap: Record<string, string> = {
      'Logline': 'loglineDraft',
      '3-Act Structure': 'structureDraft',
      'Synopsis': 'synopsisDraft',
    };

    const field = fieldMap[stageName];
    if (field && project[field as keyof Project]) {
      const content = project[field as keyof Project] as string;
      const synthetic = [{ id: `${stageName}_root`, title: stageName, content, order: 0 }];
      telemetryService.hydrateStage(stageName, 'project_root', synthetic as any);
      return synthetic;
    }

    return [];
  }

  async hydrateFullIdMap(projectId: string): Promise<void> {
    telemetryService.setStatus('Full Sync', '🧠', 'Mapping ALL Primitive IDs across stages...');

    const allStages = [
      'Brainstorming', 'Logline', '3-Act Structure', 'Synopsis',
      'Character Bible', 'Location Bible', 'Treatment', 'Step Outline', 'Script'
    ];

    const subcollectionStages = allStages.filter(s => SUBCOLLECTION_MAP[s]);
    const fieldStages = allStages.filter(s => !SUBCOLLECTION_MAP[s]);

    await Promise.all(
      subcollectionStages.map(async (stageName) => {
        try {
          await this.getStageStructure(projectId, stageName);
        } catch (e) {}
      })
    );

    try {
      const projectResult = await store.dispatch(firebaseApi.endpoints.getProjectById.initiate(projectId));
      const project = projectResult.data;
      if (project) {
        const fieldMap: Record<string, string> = {
          'Logline': 'loglineDraft',
          '3-Act Structure': 'structureDraft',
          'Synopsis': 'synopsisDraft',
        };
        for (const stageName of fieldStages) {
          const field = fieldMap[stageName];
          if (field && project[field as keyof Project]) {
            const content = project[field as keyof Project] as string;
            telemetryService.hydrateStage(stageName, 'project_root', [
              { id: `${stageName}_root`, title: stageName, content, order: 0 }
            ] as any);
          }
        }
      }
    } catch (e) {}

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
        languages: project.metadata?.languages || [],
        logline: project.metadata?.logline || project.loglineDraft || ''
      },
      logline: project.loglineDraft || '',
      structure: project.structureDraft || '',
      characters: [],
      locations: []
    };

    let cascadingContext = '';
    
    if (currentStage === 'Character Bible' || currentStage === 'Location Bible') {
      cascadingContext += `[BRAINSTORMING MASTER STORY]\n${project.brainstorming_story || 'N/A'}\n\n`;
    } else if (currentStage === '3-Act Structure') {
      cascadingContext += `[BRAINSTORMING MASTER STORY]\n${project.brainstorming_story || 'N/A'}\n\n`;
      cascadingContext += `[CHARACTER PROFILES]\n${JSON.stringify(allCharacters.map(c => ({ name: c.name, role: c.role, description: c.description })), null, 2)}\n\n`;
    } else if (currentStage === 'Synopsis') {
      cascadingContext += `[CHARACTERS]\n${JSON.stringify(allCharacters.map(c => ({ name: c.name, role: c.role })), null, 2)}\n\n`;
      cascadingContext += `[3-ACT STRUCTURE]\n${project.structureDraft || 'N/A'}\n\n`;
    } else if (currentStage === 'Treatment') {
      cascadingContext += `[CHARACTERS]\n${JSON.stringify(allCharacters.map(c => ({ name: c.name, role: c.role })), null, 2)}\n\n`;
      cascadingContext += `[3-ACT STRUCTURE]\n${project.structureDraft || 'N/A'}\n\n`;
      cascadingContext += `[FULL SYNOPSIS]\n${project.synopsisDraft || 'N/A'}\n\n`;
    } else if (currentStage === 'Step Outline' || currentStage === 'Script') {
      cascadingContext += `[3-ACT STRUCTURE]\n${project.structureDraft || 'N/A'}\n\n`;
      cascadingContext += `[FULL SYNOPSIS]\n${project.synopsisDraft || 'N/A'}\n\n`;
      cascadingContext += `[TREATMENT]\n${project.treatmentDraft || 'N/A'}\n\n`;
    }

    let sectionalContent = '';
    if (currentStage === '3-Act Structure') {
      sectionalContent = project.structureDraft || '';
      if (sectionalContent) {
        telemetryService.hydrateStage('3-Act Structure', 'project_root', [
          { id: '3-Act Structure_root', title: '3-Act Structure', content: sectionalContent, order: 0 }
        ] as any);
      }
    } else if (currentStage === 'Synopsis') {
      sectionalContent = project.synopsisDraft || '';
      if (sectionalContent) {
        telemetryService.hydrateStage('Synopsis', 'project_root', [
          { id: 'Synopsis_root', title: 'Synopsis', content: sectionalContent, order: 0 }
        ] as any);
      }
    } else if (currentStage === 'Treatment') {
      sectionalContent = project.treatmentDraft || '';
      const treatResult = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: 'treatment_sequences', orderByField: 'order' }));
      const treatPrimitives = treatResult.data || [];
      telemetryService.hydrateStage('Treatment', 'treatment_sequences', treatPrimitives as any);
      sectionalContent = JSON.stringify(treatPrimitives, null, 2);
    } else if (currentStage === 'Script') {
      sectionalContent = project.scriptDraft || '';
      const scriptResult = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: 'script_scenes', orderByField: 'order' }));
      const scriptPrimitives = scriptResult.data || [];
      telemetryService.hydrateStage('Script', 'script_scenes', scriptPrimitives as any);
      sectionalContent = JSON.stringify(scriptPrimitives, null, 2);
    } else if (currentStage === 'Step Outline') {
      const seqResult = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: 'sequences', orderByField: 'order' }));
      const seqPrimitives = seqResult.data || [];
      telemetryService.hydrateStage('Step Outline', 'sequences', seqPrimitives as any);
      sectionalContent = JSON.stringify(seqPrimitives, null, 2);
    }
    
    payload.sectionalContext = `${cascadingContext}\n[CURRENT STAGE CONTENT]\n${sectionalContent}`;
    payload.idMapContext = telemetryService.getIdMapContext();

    if (activePrimitiveId && (currentStage === 'Step Outline' || currentStage === 'Script' || currentStage === 'Treatment')) {
      const seqsResult = await store.dispatch(firebaseApi.endpoints.getSubcollection.initiate({ projectId, collectionName: SUBCOLLECTION_MAP[currentStage] || 'sequences', orderByField: 'order' }));
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
Genre: ${payload.metadata.genre}
Languages: ${payload.metadata.languages.join(', ')}
Logline: ${payload.metadata.logline}

[SECTIONAL CONTEXT - FULL STAGE CONTENT]
${payload.sectionalContext || 'N/A'}

${payload.idMapContext || ''}

[SCENE ENTITIES]
Characters present: ${JSON.stringify(payload.characters.map(c => ({ name: c.name, role: c.role, description: c.description })), null, 2)}
Location details: ${JSON.stringify(payload.locations.map(l => ({ name: l.name, atmosphere: l.atmosphere, description: l.description })), null, 2)}

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
