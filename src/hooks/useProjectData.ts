import { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { Project, WorkflowStage } from '../types';
import { useGetProjectsQuery, useGetProjectByIdQuery } from '../services/firebaseService';
import { buildStageContentsMap } from '../lib/stageContent';
import type { ContentPrimitive } from '../types/stageContract';
import { stageRegistry } from '../config/stageRegistry';
import { useStageGatedSubcollections } from './useStageGatedSubcollections';

interface ProjectDataState {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  isProjectLoading: boolean;
  isStageLoading: boolean;
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
  const [activeStage, setActiveStage] = useState<WorkflowStage>('Discovery');
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
  }, [currentProject]);

  // Derive the numeric order of the current stage for gate comparisons
  const activeStageOrder = useMemo(() => {
    try { return stageRegistry.get(activeStage).order; }
    catch { return 0; }
  }, [activeStage]);

  // ── Stage-gated subcollection fetches ──────────────────────────────────────
  const { data: rawCollections, isLoading: isStageLoading } = useStageGatedSubcollections({
    projectId: currentProjectId,
    activeStageOrder
  });

  const stageContents = useMemo(
    () => buildStageContentsMap(rawCollections),
    [rawCollections],
  );

  // ── Sync Telemetry ID-Map ──────────────────────────────────────────────────
  // Keeps the Script Doctor's "eyes" in sync with the RTK Query cache.
  useEffect(() => {
    if (!currentProjectId || !stageContents) return;
    
    // Hydrate each stage into the telemetry service
    Object.entries(stageContents).forEach(([stageName, primitives]) => {
      const collectionName = stageRegistry.getCollectionName(stageName);
      import('../services/telemetryService').then(({ telemetryService }) => {
        telemetryService.hydrateStage(stageName, collectionName, primitives);
      });
    });
  }, [currentProjectId, stageContents]);

  const handleProjectExit = () => {
    setCurrentProjectId(null);
    window.location.hash = '';
  };

  const handleProjectSelect = (id: string, projectObj?: Project) => {
    setCurrentProjectId(id);
    setOptimisticProject(projectObj ?? null);
    const savedStage = localStorage.getItem(`scenaria_stage_${id}`) as WorkflowStage | null;
    const stage = savedStage || 'Discovery';
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
    isStageLoading,
    isProjectNotFound,
    stageContents,
    handleProjectSelect,
    handleProjectExit,
    activeStage,
    setActiveStage,
    handleStageChange,
  };
}
