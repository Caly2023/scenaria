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

  const { data: pitchPrimitives     = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'pitch_primitives',     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 0  });
  const { data: draftPrimitives     = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'draft_primitives',     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 1  });
  const { data: loglinePrimitives   = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'logline_primitives',   orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 3  });
  const { data: structurePrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'structure_primitives', orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 4  });
  const { data: beatPrimitives      = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'beat_primitives',      orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 5  });
  const { data: synopsisPrimitives  = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'synopsis_primitives',  orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 6  });
  const { data: characters          = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'characters'                                   }, { skip: !currentProjectId                          });
  const { data: locations           = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'locations'                                    }, { skip: !currentProjectId                          });
  const { data: treatmentSequences  = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'treatment_sequences',  orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 9  });
  const { data: sequences           = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'sequences',            orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 10 });
  const { data: scriptScenes        = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'script_scenes',         orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 11 });
  const { data: doctoringPrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'doctoring_primitives',  orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 12 });
  const { data: breakdownPrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'breakdown_primitives',  orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 13 });
  const { data: assetPrimitives     = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'asset_primitives',      orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 14 });
  const { data: previsPrimitives    = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'previs_primitives',     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 15 });
  const { data: exportPrimitives    = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'export_primitives',     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 16 });

  const rawCollections = useMemo<RawCollections>(() => ({
    pitch_primitives:     pitchPrimitives,
    draft_primitives:     draftPrimitives,
    logline_primitives:   loglinePrimitives,
    structure_primitives: structurePrimitives,
    beat_primitives:      beatPrimitives,
    synopsis_primitives:  synopsisPrimitives,
    characters,
    locations,
    treatment_sequences:  treatmentSequences,
    sequences,
    script_scenes:        scriptScenes,
    doctoring_primitives: doctoringPrimitives,
    breakdown_primitives: breakdownPrimitives,
    asset_primitives:     assetPrimitives,
    previs_primitives:    previsPrimitives,
    export_primitives:    exportPrimitives,
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
