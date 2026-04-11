import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Project, Sequence, Character, Location, WorkflowStage } from '../types';
import { useGetProjectsQuery, useGetProjectByIdQuery, useGetSubcollectionQuery } from '../services/firebaseApi';

// Subcollections required for each active stage — avoids loading all collections at once
const STAGE_NEEDS_SEQUENCES = new Set<WorkflowStage>(['Step Outline']);
const STAGE_NEEDS_TREATMENT_SEQ = new Set<WorkflowStage>(['Treatment']);
const STAGE_NEEDS_SCRIPT_SCENES = new Set<WorkflowStage>(['Script']);
const STAGE_NEEDS_PITCH = new Set<WorkflowStage>(['Brainstorming']);
// Characters + locations are reused across several stages; fetch whenever a project is open

interface ProjectDataState {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  isProjectLoading: boolean;
  isProjectNotFound: boolean;
  sequences: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  pitchPrimitives: Sequence[];
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
  const [activeStage, setActiveStage] = useState<WorkflowStage>('Brainstorming');

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const match = hash.match(/^\/project\/([^\/]+)(?:\/stage\/(.+))?$/);
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

  // ── Stage-gated subcollection fetches ─────────────────────────────────────
  // Each large sequence collection is only subscribed when its stage is active.
  // Characters/locations are shared across multiple stages and always loaded.

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

  const { data: characters = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'characters' },
    { skip: !currentProjectId }
  );

  const { data: locations = [] } = useGetSubcollectionQuery(
    { projectId: currentProjectId || '', collectionName: 'locations' },
    { skip: !currentProjectId }
  );

  const handleProjectExit = () => {
    setCurrentProjectId(null);
    window.location.hash = '';
  };

  const handleProjectSelect = (id: string, projectObj?: Project) => {
    setCurrentProjectId(id);
    const savedStage = localStorage.getItem(`scenaria_stage_${id}`) as WorkflowStage | null;
    const stage = savedStage || 'Brainstorming';
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

  return {
    projects,
    currentProject,
    currentProjectId,
    isProjectLoading: isProjectLoading && !!currentProjectId,
    isProjectNotFound,
    sequences,
    treatmentSequences,
    scriptScenes,
    pitchPrimitives,
    characters,
    locations,
    handleProjectSelect,
    handleProjectExit,
    activeStage,
    setActiveStage,
    handleStageChange
  };
}
