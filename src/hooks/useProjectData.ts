import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Project, WorkflowStage } from '../types';
import { useGetProjectsQuery, useGetProjectByIdQuery, useGetSubcollectionQuery } from '../services/firebaseApi';
import { buildStageContentsMap } from '../lib/stageContent';
import { ContentPrimitive } from '../types/stageContract';

// ── Stage-gated subcollection loading ─────────────────────────────────────────
// Each collection is only fetched when the activeStage is at or past the stage
// where that data first becomes relevant. This avoids loading all Firebase
// subcollections on every stage change.
//
// Design rule: add a new entry here when you add a new subcollection.
// Each entry maps a Firestore collection name → the minimum stage order at which it's needed.
// The `stageRegistry` assigns numeric order values; check stageRegistry.ts for the full list.
//
// order 0  = Project Metadata
// order 1  = Initial Draft
// order 2  = Brainstorming       ← pitch primitives start here
// order 3  = Logline
// order 4  = 3-Act Structure
// order 5  = 8-Beat Structure
// order 6  = Synopsis
// order 7  = Character Bible
// order 8  = Location Bible
// order 9  = Treatment           ← treatment sequences start here
// order 10 = Step Outline        ← sequences start here
// order 11 = Script              ← script scenes start here
// order 12 = Global Script Doctoring
// order 13 = Technical Breakdown
// order 14 = Visual Assets
// order 15 = AI Previs
// order 16 = Production Export

import { stageRegistry } from '../config/stageRegistry';

type CollectionGate = {
  /** Firestore collection name */
  collection: string;
  /** Minimum stage order at which this collection is needed (inclusive) */
  minOrder: number;
  /** Optional: fetch sorted by this field */
  orderByField?: string;
};

const COLLECTION_GATES: CollectionGate[] = [
  { collection: 'pitch_primitives',    minOrder: 0,  orderByField: 'order' },
  { collection: 'draft_primitives',    minOrder: 1,  orderByField: 'order' },
  { collection: 'logline_primitives',  minOrder: 3,  orderByField: 'order' },
  { collection: 'structure_primitives',minOrder: 4,  orderByField: 'order' },
  { collection: 'beat_primitives',     minOrder: 5,  orderByField: 'order' },
  { collection: 'synopsis_primitives', minOrder: 6,  orderByField: 'order' },
  { collection: 'characters',          minOrder: 0  }, // always needed (Script Doctor, context)
  { collection: 'locations',           minOrder: 0  }, // always needed
  { collection: 'treatment_sequences', minOrder: 9,  orderByField: 'order' },
  { collection: 'sequences',           minOrder: 10, orderByField: 'order' },
  { collection: 'script_scenes',       minOrder: 11, orderByField: 'order' },
  { collection: 'doctoring_primitives',minOrder: 12, orderByField: 'order' },
  { collection: 'breakdown_primitives',minOrder: 13, orderByField: 'order' },
  { collection: 'asset_primitives',    minOrder: 14, orderByField: 'order' },
  { collection: 'previs_primitives',   minOrder: 15, orderByField: 'order' },
  { collection: 'export_primitives',   minOrder: 16, orderByField: 'order' },
];

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
  const { data: sequences           = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'sequences',           orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 10 });
  const { data: scriptScenes        = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'script_scenes',        orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 11 });
  const { data: doctoringPrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'doctoring_primitives', orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 12 });
  const { data: breakdownPrimitives = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'breakdown_primitives', orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 13 });
  const { data: assetPrimitives     = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'asset_primitives',     orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 14 });
  const { data: previsPrimitives    = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'previs_primitives',    orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 15 });
  const { data: exportPrimitives    = [] } = useGetSubcollectionQuery({ projectId: currentProjectId || '', collectionName: 'export_primitives',    orderByField: 'order' }, { skip: !currentProjectId || activeStageOrder < 16 });

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
    treatmentSequences, sequences, scriptScenes,
  ]);

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
