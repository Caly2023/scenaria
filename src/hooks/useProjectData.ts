import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Project, Sequence, Character, Location, WorkflowStage } from '../types';
import { useGetProjectsQuery, useGetProjectByIdQuery, useGetSubcollectionQuery } from '../services/firebaseApi';
import { buildStageContentsMap } from '../lib/stageContent';
import { ContentPrimitive } from '../types/stageContract';

// Subcollections required for each active stage — avoids loading all collections at once
// Foundational stages must be loaded continuously because downstream AI agents require them for context
const STAGE_NEEDS_SEQUENCES = new Set<WorkflowStage>(['Step Outline', 'Script', 'AI Previs', 'Production Export']);
const STAGE_NEEDS_TREATMENT_SEQ = new Set<WorkflowStage>(['Treatment', 'Step Outline', 'Script', 'Technical Breakdown']);
const STAGE_NEEDS_SCRIPT_SCENES = new Set<WorkflowStage>(['Script', 'Global Script Doctoring', 'Technical Breakdown']);
const STAGE_NEEDS_PITCH = new Set<WorkflowStage>(['Project Metadata', 'Initial Draft', 'Brainstorming', 'Logline', '3-Act Structure', '8-Beat Structure', 'Synopsis', 'Character Bible', 'Location Bible', 'Treatment', 'Step Outline', 'Script', 'Global Script Doctoring', 'Technical Breakdown', 'Visual Assets', 'AI Previs', 'Production Export']);
const STAGE_NEEDS_LOGLINE = new Set<WorkflowStage>(['Logline', '3-Act Structure', '8-Beat Structure', 'Synopsis', 'Treatment', 'Step Outline', 'Script', 'Global Script Doctoring', 'Technical Breakdown', 'Visual Assets', 'AI Previs', 'Production Export']);
const STAGE_NEEDS_STRUCTURE = new Set<WorkflowStage>(['3-Act Structure', '8-Beat Structure', 'Synopsis', 'Treatment', 'Step Outline', 'Script', 'Global Script Doctoring', 'Technical Breakdown']);
const STAGE_NEEDS_SYNOPSIS = new Set<WorkflowStage>(['Synopsis', 'Treatment', 'Step Outline', 'Script', 'Global Script Doctoring', 'Technical Breakdown']);
const STAGE_NEEDS_DRAFT = new Set<WorkflowStage>(['Initial Draft', 'Brainstorming', 'Logline', '3-Act Structure', '8-Beat Structure', 'Synopsis', 'Character Bible', 'Location Bible', 'Treatment', 'Step Outline', 'Script', 'Global Script Doctoring', 'Technical Breakdown', 'Visual Assets', 'AI Previs', 'Production Export']);
const STAGE_NEEDS_BEATS = new Set<WorkflowStage>(['8-Beat Structure', 'Synopsis', 'Treatment', 'Step Outline', 'Script', 'Global Script Doctoring', 'Technical Breakdown']);
const STAGE_NEEDS_DOCTORING = new Set<WorkflowStage>(['Global Script Doctoring']);
const STAGE_NEEDS_BREAKDOWN = new Set<WorkflowStage>(['Technical Breakdown']);
const STAGE_NEEDS_ASSETS = new Set<WorkflowStage>(['Visual Assets', 'AI Previs']);
const STAGE_NEEDS_PREVIS = new Set<WorkflowStage>(['AI Previs']);
const STAGE_NEEDS_EXPORT = new Set<WorkflowStage>(['Production Export']);

interface ProjectDataState {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  isProjectLoading: boolean;
  isProjectNotFound: boolean;
  stageContents: Record<string, ContentPrimitive[]>;
  characters: Character[];
  locations: Location[];
  handleProjectSelect: (id: string, projectObj?: Project) => void;
  handleProjectExit: () => void;
  activeStage: WorkflowStage;
  setActiveStage: (stage: WorkflowStage) => void;
  handleStageChange: (stage: WorkflowStage) => void;
}

export function useProjectData(user: User | null): ProjectDataState {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<WorkflowStage>('Project Metadata');
  const [optimisticProject, setOptimisticProject] = useState<Project | null>(null);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const match = hash.match(/^\/project\/([^/]+)(?:\/stage\/(.+))?$/);
      if (match) {
        const id = match[1];
        const stage = decodeURIComponent(match[2] || '') as WorkflowStage;
        setCurrentProjectId(id);
        if (stage) setActiveStage(stage);
      } else {
        setCurrentProjectId(null);
      }
    };
    
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const { data: projects = [] } = useGetProjectsQuery(user?.uid || '', { skip: !user });
  
  const { 
    data: currentProject = null, 
    isLoading: isProjectLoading, 
    isError: isProjectNotFound 
  } = useGetProjectByIdQuery(currentProjectId || '', { skip: !user || !currentProjectId });

  // Run migration if needed when the project loads
  useEffect(() => {
    if (currentProject?.id) {
      import('../services/migrationService').then(m => m.migrateProjectIfNeeded(currentProject));
    }
  }, [currentProject?.id]);

  // ── Stage-gated subcollection fetches ─────────────────────────────────────
  
  const { data: sequences = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'sequences', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_SEQUENCES.has(activeStage) }
  );

  const { data: treatmentSequences = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'treatment_sequences', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_TREATMENT_SEQ.has(activeStage) }
  );

  const { data: scriptScenes = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'script_scenes', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_SCRIPT_SCENES.has(activeStage) }
  );

  const { data: pitchPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'pitch_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_PITCH.has(activeStage) }
  );

  const { data: draftPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'draft_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_DRAFT.has(activeStage) }
  );

  const { data: loglinePrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'logline_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_LOGLINE.has(activeStage) }
  );

  const { data: structurePrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'structure_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_STRUCTURE.has(activeStage) }
  );

  const { data: beatPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'beat_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_BEATS.has(activeStage) }
  );

  const { data: synopsisPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'synopsis_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_SYNOPSIS.has(activeStage) }
  );

  const { data: doctoringPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'doctoring_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_DOCTORING.has(activeStage) }
  );

  const { data: breakdownPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'breakdown_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_BREAKDOWN.has(activeStage) }
  );

  const { data: assetPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'asset_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_ASSETS.has(activeStage) }
  );

  const { data: previsPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'previs_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_PREVIS.has(activeStage) }
  );

  const { data: exportPrimitives = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'export_primitives', orderByField: 'order' },
    { skip: !currentProjectId || !STAGE_NEEDS_EXPORT.has(activeStage) }
  );

  const { data: characters = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'characters' },
    { skip: !currentProjectId }
  );

  const { data: locations = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'locations' },
    { skip: !currentProjectId }
  );

  const stageContents = useMemo(() => buildStageContentsMap({
    pitchPrimitives,
    draftPrimitives,
    loglinePrimitives,
    structurePrimitives,
    beatPrimitives,
    synopsisPrimitives,
    doctoringPrimitives,
    breakdownPrimitives,
    assetPrimitives,
    previsPrimitives,
    exportPrimitives,
    characters,
    locations,
    treatmentSequences,
    sequences,
    scriptScenes,
  }), [
    pitchPrimitives, draftPrimitives, loglinePrimitives, structurePrimitives, 
    beatPrimitives, synopsisPrimitives, doctoringPrimitives, breakdownPrimitives, 
    assetPrimitives, previsPrimitives, exportPrimitives, characters, locations, 
    treatmentSequences, sequences, scriptScenes
  ]);

  const handleProjectExit = () => {
    setCurrentProjectId(null);
    window.location.hash = '';
  };

  const handleProjectSelect = (id: string, projectObj?: Project) => {
    setCurrentProjectId(id);
    if (projectObj) {
      setOptimisticProject(projectObj);
    } else {
      setOptimisticProject(null);
    }
    
    const savedStage = localStorage.getItem(`scenaria_stage_${id}`) as WorkflowStage | null;
    const stage = savedStage || 'Project Metadata';
    setActiveStage(stage);
    window.location.hash = `/project/${id}/stage/${encodeURIComponent(stage)}`;
  };

  const handleStageChange = (stage: WorkflowStage) => {
    setActiveStage(stage);
    if (currentProjectId) {
      localStorage.setItem(`scenaria_stage_${currentProjectId}`, stage);
      window.location.hash = `/project/${currentProjectId}/stage/${encodeURIComponent(stage)}`;
    }
  };

  const returnedProject = currentProject || (optimisticProject?.id === currentProjectId ? optimisticProject : null);
  const loading = isProjectLoading && !!currentProjectId && !returnedProject;

  return {
    projects,
    currentProject: returnedProject,
    currentProjectId,
    isProjectLoading: loading,
    isProjectNotFound,
    stageContents,
    characters,
    locations,
    handleProjectSelect,
    handleProjectExit,
    activeStage,
    setActiveStage,
    handleStageChange
  };
}
