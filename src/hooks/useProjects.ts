import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Project, WorkflowStage } from '../types';
import { useProjectData } from './useProjectData';
import { useProjectLifecycle } from './useProjectLifecycle';
import { useProjectSync } from './useProjectSync';
import { useProjectActions } from './useProjectActions';
import { buildProjectContext } from '../services/orchestratorService';

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
    isProjectNotFound,
    handleProjectSelect,
    handleProjectExit,
    activeStage,
    handleStageChange,
    sequences,
    treatmentSequences,
    scriptScenes,
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives,
    characters,
    locations
  } = useProjectData(user);

  const {
    syncStatus,
    setSyncStatus,
    handleContentUpdate,
    handleSubcollectionUpdate
  } = useProjectSync(currentProject, addToast);

  const getProjectContext = useCallback(() => {
    if (!currentProject) return null;
    return buildProjectContext(
      currentProject.id,
      currentProject.metadata,
      {
        'Brainstorming': pitchPrimitives as any,
        'Logline': loglinePrimitives as any,
        '3-Act Structure': structurePrimitives as any,
        'Synopsis': synopsisPrimitives as any,
        'Character Bible': characters as any,
        'Location Bible': locations as any,
        'Treatment': treatmentSequences as any,
        'Step Outline': sequences as any,
        'Script': scriptScenes as any,
      },
      currentProject.stageAnalyses || {}
    );
  }, [currentProject, pitchPrimitives, loglinePrimitives, structurePrimitives, synopsisPrimitives, characters, locations, treatmentSequences, sequences, scriptScenes]);

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
    handleSequenceUpdate,
    handleSequenceAdd,
    handleAiMagic,
    handleGenerateViews,
    handleCharacterDeepDevelop,
    handleLocationDeepDevelop
  } = useProjectActions({
    currentProject,
    setIsTyping,
    setRefiningBlockId,
    setLastUpdatedPrimitiveId,
    addToast,
    handleSubcollectionUpdate,
    characters,
    locations,
    sequences,
    treatmentSequences,
    scriptScenes,
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives
  });

  const handleStageAnalyze = useCallback(async (stage: WorkflowStage) => {
    if (!currentProject) return;
    setIsTyping(true);
    try {
      const { interpretIntent, dispatchToAgent, persistAgentOutput } = await import('../services/orchestratorService');
      
      let currentContent: any[] = [];
      if (stage === 'Brainstorming') currentContent = pitchPrimitives;
      else if (stage === 'Logline') currentContent = loglinePrimitives;
      else if (stage === '3-Act Structure') currentContent = structurePrimitives;
      else if (stage === 'Synopsis') currentContent = synopsisPrimitives;
      else if (stage === 'Character Bible') currentContent = characters;
      else if (stage === 'Location Bible') currentContent = locations;
      else if (stage === 'Treatment') currentContent = treatmentSequences;
      else if (stage === 'Step Outline') currentContent = sequences;
      else if (stage === 'Script') currentContent = scriptScenes;

      const context = getProjectContext();
      if (!context) throw new Error("Project context is not available.");

      const decision = interpretIntent('analyze', stage);
      const agentOutput = await dispatchToAgent(decision, context, currentContent);
      await persistAgentOutput(currentProject.id, stage, agentOutput);
      
      addToast(`Analysis complete for ${stage}`, 'success');
    } catch (error) {
      addToast(`Analysis failed: ${error}`, 'error');
    } finally {
      setIsTyping(false);
    }
  }, [currentProject, pitchPrimitives, loglinePrimitives, structurePrimitives, synopsisPrimitives, characters, locations, treatmentSequences, sequences, scriptScenes, addToast, setIsTyping, getProjectContext]);

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
    // Subcollections
    sequences,
    treatmentSequences,
    scriptScenes,
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives,
    characters,
    locations,
    // Modal & Action states
    isDeleting,
    setIsDeleting,
    projectToDelete,
    setProjectToDelete,
    refiningBlockId,
    setRefiningBlockId,
    lastUpdatedPrimitiveId,
    setLastUpdatedPrimitiveId,
    // Action functions
    handleSequenceUpdate,
    handleSequenceAdd,
    handleAiMagic,
    handleGenerateViews,
    handleCharacterDeepDevelop,
    handleLocationDeepDevelop
  };
}
