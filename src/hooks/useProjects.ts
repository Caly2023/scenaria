import React, { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Project, WorkflowStage } from '../types';
import { useProjectData } from './useProjectData';
import { useProjectLifecycle } from './useProjectLifecycle';
import { useProjectSync } from './useProjectSync';
import { useProjectActions } from './actions/useProjectActions';
import { useCharacterActions } from './actions/useCharacterActions';
import { useLocationActions } from './actions/useLocationActions';
import { useSequenceActions } from './actions/useSequenceActions';
import { buildProjectContext } from '../services/orchestrator';
import { ContentPrimitive } from '../types/stageContract';

type BrainstormPrimitive = ContentPrimitive & { primitiveType?: string };

export function useProjects(user: User | null, addToast: (msg: string, type: 'error' | 'info' | 'success') => void) {
  const [isTyping, setIsTyping] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  const [lastUpdatedPrimitiveId, setLastUpdatedPrimitiveId] = useState<string | null>(null);
  const autoAnalyzeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const {
    projects,
    currentProject,
    currentProjectId,
    isProjectLoading,
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
  } = useProjectSync(currentProject, addToast, (coll, id) => {
    // Auto-trigger analysis when content changes, with a longer debounce
    if (autoAnalyzeTimeoutRef.current) clearTimeout(autoAnalyzeTimeoutRef.current);
    autoAnalyzeTimeoutRef.current = setTimeout(() => {
      handleStageAnalyze(activeStage);
    }, 3000); // 3 second delay after last sync
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
    handleStageValidate
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
    setIsTyping(true);
    try {
      const { interpretIntent, dispatchToAgent, persistAgentOutput } = await import('../services/orchestrator');
      
      let currentContent: ContentPrimitive[] = [];
      if (stage === 'Brainstorming') {
        const typedBrainstorming = stageContents.Brainstorming as BrainstormPrimitive[];
        const existing =
          typedBrainstorming.find((p) => p.primitiveType === 'brainstorming_result') ||
          typedBrainstorming.find((p) => p.primitiveType === 'pitch_result') ||
          typedBrainstorming.find((p) => p.order === 1) ||
          typedBrainstorming[0];

        currentContent = existing
          ? [
              {
                ...existing,
                title: existing.title || 'Brainstorming Result',
                primitiveType: 'brainstorming_result',
                order: 1,
              },
            ]
          : [];
      }
      else {
        currentContent = stageContents[stage] || [];
      }

      const context = getProjectContext();
      if (!context) throw new Error("Project context is not available.");

      const decision = interpretIntent('analyze', stage);
      const agentOutput = await dispatchToAgent(decision, context, currentContent);
      await persistAgentOutput(currentProject.id, stage, agentOutput, { replaceAll: stage === 'Brainstorming' });
      
      addToast(`Analysis complete for ${stage}`, 'success');
    } catch (error) {
      addToast(`Analysis failed: ${error}`, 'error');
    } finally {
      setIsTyping(false);
    }
  }, [currentProject, stageContents, addToast, setIsTyping, getProjectContext]);

  const handleMetadataUpdate = useCallback(async (metadata: Partial<Project['metadata']>) => {
    if (!currentProject) return;
    const newMetadata = { ...currentProject.metadata, ...metadata };
    await handleContentUpdate('metadata', JSON.stringify(newMetadata));
  }, [currentProject, handleContentUpdate]);

  return {
    projects,
    currentProject,
    currentProjectId,
    isProjectLoading,
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
    handleContentUpdate,
    handleSubcollectionUpdate,
    handleRegenerate,
    handleStageValidate,
    handleStageRefine,
    handleStageAnalyze,
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
  };
}
