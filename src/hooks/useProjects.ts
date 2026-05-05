import React, { useState, useCallback, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import { Project, WorkflowStage } from '../types';
import { useProjectData } from './useProjectData';
import { useProjectLifecycle } from './useProjectLifecycle';
import { useProjectSync } from './useProjectSync';
import { useProjectActions } from './actions/useProjectActions';
import { useCharacterActions } from './actions/useCharacterActions';
import { useLocationActions } from './actions/useLocationActions';
import { useSequenceActions } from './actions/useSequenceActions';
import { buildProjectContext } from '../services/orchestration';

import { classifyError } from '../lib/errorClassifier';
import { useUpdateProjectFieldsMutation } from '../services/firebaseService';


export function useProjects(user: User | null, addToast: (msg: string, type: 'error' | 'info' | 'success') => void) {
  const [isTyping, setIsTyping] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  const [lastUpdatedPrimitiveId, setLastUpdatedPrimitiveId] = useState<string | null>(null);

  const {
    projects,
    currentProject,
    currentProjectId,
    isProjectLoading,
    isStageLoading,
    isProjectNotFound,
    handleProjectSelect,
    handleProjectExit,
    activeStage,
    handleStageChange,
    stageContents
  } = useProjectData(user);

  const {
    syncStatus,
    setSyncStatus,
    handleContentUpdate,
    handleSubcollectionUpdate
  } = useProjectSync(currentProject, addToast, (_coll, _id) => {
    // Sync complete - no automatic AI calls here to minimize tokens
  });

  const getProjectContext = useCallback(() => {
    if (!currentProject) return null;
    return buildProjectContext(
      currentProject.id,
      currentProject.metadata,
      stageContents,
      currentProject.stageAnalyses || {}
    );
  }, [currentProject, stageContents]);

  const {
    handleRegenerate,
    handleProjectDelete,
    handleProjectCreate,
    handleStageValidate,
    triggerStageGeneration
  } = useProjectLifecycle({
    user,
    currentProject,
    currentProjectId,
    setIsTyping,
    setSyncStatus,
    setIsHeavyThinking: () => {},
    setIsRegenerating,
    isRegenerating,
    addToast,
    handleProjectSelect,
    handleProjectExit,
    handleStageChange,
    setIsDeleting,
    setProjectToDelete,
    setDeleteConfirmText: () => {},
    hydrationState: {},
    getProjectContext
  });

  const {
    handleStageRefine,
  } = useProjectActions({
    currentProject,
    setIsTyping,
    setRefiningBlockId,
    setLastUpdatedPrimitiveId,
    addToast,
    stageContents
  });

  const characterActions = useCharacterActions({
    currentProject,
    setIsTyping,
    setRefiningBlockId,
    addToast,
    stageContents
  });

  const locationActions = useLocationActions({
    currentProject,
    setIsTyping,
    setRefiningBlockId,
    addToast,
    stageContents
  });

  const sequenceActions = useSequenceActions({
    currentProject,
    setIsTyping,
    addToast,
    handleSubcollectionUpdate,
    stageContents
  });

  const handleStageAnalyze = useCallback(async (stage: WorkflowStage) => {
    if (!currentProject) return;

    const currentContent = stageContents[stage] || [];
    // Skip analysis if the stage has no content yet — nothing to analyze.
    if (currentContent.length === 0) {
      console.debug(`[StageAnalyze] Skipped for "${stage}" — no content yet.`);
      return;
    }

    setIsTyping(true);
    try {
      const { interpretIntent, dispatchToAgent, persistAgentOutput } = await import('../services/orchestration');

      const context = getProjectContext();
      if (!context) throw new Error("Project context is not available.");

      const decision = interpretIntent('analyze', stage);
      const agentOutput = await dispatchToAgent(decision, context, currentContent);
      await persistAgentOutput(currentProject.id, stage, agentOutput, { replaceAll: false });
      
      addToast(`Analysis complete for ${stage}`, 'success');
    } catch (error) {
      const classification = classifyError(error);
      addToast(classification.userMessage, 'error');
    } finally {
      setIsTyping(false);
    }
  }, [currentProject, stageContents, addToast, setIsTyping, getProjectContext]);

  // Ref holds the latest merged metadata so we always write a complete object,
  // even when multiple fields are changed in rapid succession before the timer fires.
  const pendingMetadataRef = useRef<Project['metadata'] | null>(null);
  const metadataDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [updateProjectFields] = useUpdateProjectFieldsMutation();

  const handleFieldsUpdate = useCallback(async (updates: Record<string, any>) => {
    if (!currentProject) return;
    try {
      await updateProjectFields({ id: currentProject.id, updates }).unwrap();
    } catch (e) {
      const classified = classifyError(e);
      addToast(classified.userMessage, 'error');
    }
  }, [currentProject, updateProjectFields, addToast]);

  const handleMetadataUpdate = useCallback(async (metadata: Partial<Project['metadata']>) => {
    if (!currentProject) return;
    
    // Sanitize: ensure we don't accidentally write undefined/null values
    const cleaned = { ...metadata };
    Object.keys(cleaned).forEach(key => {
      if ((cleaned as any)[key] === undefined || (cleaned as any)[key] === null) {
        delete (cleaned as any)[key];
      }
    });

    const updated = { ...(currentProject.metadata || {}), ...cleaned };
    await handleFieldsUpdate({ metadata: updated });
  }, [currentProject, handleFieldsUpdate]);

  return useMemo(() => ({
    projects,
    currentProject,
    currentProjectId,
    isProjectLoading,
    isStageLoading,
    isProjectNotFound,
    isTyping,
    setIsTyping,
    isRegenerating,
    syncStatus,
    setSyncStatus,
    handleProjectSelect,
    handleProjectExit,
    handleProjectCreate,
    handleProjectDelete,
    handleStageChange,
    handleMetadataUpdate,
    handleFieldsUpdate,
    handleContentUpdate,
    handleSubcollectionUpdate,
    handleRegenerate,
    handleStageValidate,
    handleStageRefine,
    handleStageAnalyze,
    triggerStageGeneration,
    activeStage,
    stageContents,
    // Modal & Action states
    isDeleting,
    setIsDeleting,
    projectToDelete,
    setProjectToDelete,
    refiningBlockId,
    setRefiningBlockId,
    lastUpdatedPrimitiveId,
    setLastUpdatedPrimitiveId,
    // Action functions (spread from specialized hooks)
    ...characterActions,
    ...locationActions,
    ...sequenceActions
  }), [
    projects, currentProject, currentProjectId, isProjectLoading, isStageLoading, isProjectNotFound,
    isTyping, isRegenerating, syncStatus, activeStage, stageContents,
    isDeleting, projectToDelete, refiningBlockId, lastUpdatedPrimitiveId,
    handleProjectSelect, handleProjectExit, handleProjectCreate, handleProjectDelete,
    handleStageChange, handleMetadataUpdate, handleFieldsUpdate, handleContentUpdate,
    handleSubcollectionUpdate, handleRegenerate, handleStageValidate,
    handleStageRefine, handleStageAnalyze, triggerStageGeneration, characterActions, locationActions, sequenceActions,
    setSyncStatus
  ]);
}
