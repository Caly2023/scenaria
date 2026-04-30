import { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { Project, WorkflowStage } from '../types';
import { useGetProjectsQuery, useGetProjectByIdQuery, useGetSubcollectionQuery } from '../services/firebaseService';
import { buildStageContentsMap, RawCollections } from '../lib/stageContent';
import type { ContentPrimitive } from '../types/stageContract';
import { stageRegistry } from '../config/stageRegistry';
interface ProjectDataState {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  isProjectLoading: boolean;
  isProjectNotFound: boolean;
  stageContents: Record<string, ContentPrimitive[]>;
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

  // Derive the numeric order of the current stage for gate comparisons
  const activeStageOrder = useMemo(() => {
    try { return stageRegistry.get(activeStage).order; }
    catch { return 0; }
  }, [activeStage]);

  // ── Stage-gated subcollection fetches ──────────────────────────────────────
  // Each hook fires only when the active stage order >= the gate's minOrder.
  // Collection names and gate orders come from stageRegistry — add new stages there.
  // RTK Query deduplicates identical queries and caches results.

  const { data: pitchPrimitives     = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Brainstorming'),     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Brainstorming').order });
  const { data: draftPrimitives     = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Initial Draft'),     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Initial Draft').order });
  const { data: loglinePrimitives   = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Logline'),           orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Logline').order });
  const { data: structurePrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('3-Act Structure'),   orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('3-Act Structure').order });
  const { data: beatPrimitives      = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('8-Beat Structure'),   orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('8-Beat Structure').order });
  const { data: synopsisPrimitives  = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Synopsis'),          orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Synopsis').order });
  const { data: characters          = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Character Bible')                                }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Character Bible').order });
  const { data: locations           = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Location Bible')                                 }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Location Bible').order });
  const { data: treatmentSequences  = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Treatment'),       orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Treatment').order });
  const { data: sequences           = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Step Outline'),     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Step Outline').order });
  const { data: scriptScenes        = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Script'),           orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Script').order });
  const { data: doctoringPrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Global Script Doctoring'), orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Global Script Doctoring').order });
  const { data: breakdownPrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Technical Breakdown'), orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Technical Breakdown').order });
  const { data: assetPrimitives     = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Visual Assets'),     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Visual Assets').order });
  const { data: previsPrimitives    = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('AI Previs'),        orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('AI Previs').order });
  const { data: exportPrimitives    = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: stageRegistry.getCollectionName('Production Export'), orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < stageRegistry.get('Production Export').order });

  const rawCollections = useMemo<RawCollections>(() => ({
    [stageRegistry.getCollectionName('Brainstorming')]:           pitchPrimitives,
    [stageRegistry.getCollectionName('Initial Draft')]:           draftPrimitives,
    [stageRegistry.getCollectionName('Logline')]:                 loglinePrimitives,
    [stageRegistry.getCollectionName('3-Act Structure')]:         structurePrimitives,
    [stageRegistry.getCollectionName('8-Beat Structure')]:         beatPrimitives,
    [stageRegistry.getCollectionName('Synopsis')]:                synopsisPrimitives,
    [stageRegistry.getCollectionName('Character Bible')]:         characters,
    [stageRegistry.getCollectionName('Location Bible')]:          locations,
    [stageRegistry.getCollectionName('Treatment')]:               treatmentSequences,
    [stageRegistry.getCollectionName('Step Outline')]:            sequences,
    [stageRegistry.getCollectionName('Script')]:                  scriptScenes,
    [stageRegistry.getCollectionName('Global Script Doctoring')]: doctoringPrimitives,
    [stageRegistry.getCollectionName('Technical Breakdown')]:     breakdownPrimitives,
    [stageRegistry.getCollectionName('Visual Assets')]:           assetPrimitives,
    [stageRegistry.getCollectionName('AI Previs')]:               previsPrimitives,
    [stageRegistry.getCollectionName('Production Export')]:       exportPrimitives,
  }), [
    pitchPrimitives, draftPrimitives, loglinePrimitives, structurePrimitives,
    beatPrimitives, synopsisPrimitives, characters, locations,
    treatmentSequences, sequences, scriptScenes,
    doctoringPrimitives, breakdownPrimitives, assetPrimitives,
    previsPrimitives, exportPrimitives,
  ]);

  const stageContents = useMemo(
    () => buildStageContentsMap(rawCollections),
    [rawCollections],
  );

  const handleProjectExit = () => {
    setCurrentProjectId(null);
    window.location.hash = '';
  };

  const handleProjectSelect = (id: string, projectObj?: Project) => {
    setCurrentProjectId(id);
    setOptimisticProject(projectObj ?? null);
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
    handleProjectSelect,
    handleProjectExit,
    activeStage,
    setActiveStage,
    handleStageChange,
  };
}
