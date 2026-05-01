import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Project, 
  WorkflowStage, 
  ProjectMetadata, 
  HydrationState,
  ContentPrimitive
} from '../types';
import { useProjects } from '../hooks/useProjects';
import { useAutoHydration } from '../hooks/useAutoHydration';
import { useAppCallbacks } from '../hooks/useAppCallbacks';
import { useScriptDoctor } from '../hooks/useScriptDoctor';
import { useTelemetry } from '../hooks/useTelemetry';

interface ProjectContextType {
  // Data
  projects: Project[];
  currentProject: Project | null;
  activeStage: WorkflowStage;
  
  stageContents: Record<string, ContentPrimitive[]>;

  // States
  isProjectLoading: boolean;
  isStageLoading: boolean;
  isProjectNotFound: boolean;
  isTyping: boolean;
  isRegenerating: boolean;
  syncStatus: string;
  hydrationState: HydrationState;
  refiningBlockId: string | null;
  lastUpdatedPrimitiveId: string | null;
  telemetryStatus: any;
  
  // Handlers
  handleProjectSelect: (id: string, project?: Project) => void;
  handleProjectExit: () => void;
  handleProjectCreate: (brainstormingDraft: string, format?: any) => Promise<void>;
  handleProjectDelete: (id: string) => Promise<void>;
  handleStageChange: (stage: WorkflowStage) => void;
  handleMetadataUpdate: (metadata: Partial<ProjectMetadata>) => Promise<void>;
  handleContentUpdate: (field: string, content: string) => Promise<void>;
  handleSubcollectionUpdate: (coll: string, id: string, data: Record<string, any>) => void;
  handleRegenerate: (stage: WorkflowStage) => Promise<void>;
  handleStageValidate: (stage: WorkflowStage) => Promise<void>;
  handleStageRefine: (stage: WorkflowStage, feedback: string, blockId?: string) => Promise<void>;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
  triggerStageGeneration: (stage: WorkflowStage) => Promise<void>;
  
  // Specific Handlers
  handleAiMagic: (id: string) => Promise<void>;
  handleGenerateViews: (id: string) => Promise<void>;
  handleCharacterDeepDevelop: (id: string, stage: WorkflowStage) => Promise<void>;
  handleLocationDeepDevelop: (id: string, stage: WorkflowStage) => Promise<void>;
  
  // App Callbacks (Standardized)
  handleStoryChange: (c: string) => void;
  onLoglineChange: (c: string) => void;
  handlePrimitiveAdd: (stage: WorkflowStage, data: any) => Promise<void>;
  handlePrimitiveUpdate: (stage: WorkflowStage, id: string, updates: any) => Promise<void>;
  handlePrimitiveDelete: (stage: WorkflowStage, id: string) => Promise<void>;
  
  // Script Doctor
  isDoctorOpen: boolean;
  setIsDoctorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  doctorMessages: any[];
  isDoctorTyping: boolean;
  isHeavyThinking: boolean;
  activeTool: string | null;
  aiStatus: string | null;
  handleDoctorMessage: (content: string) => Promise<void>;
  pendingToolCall: any;
  handleConfirmTool: () => Promise<void>;
  handleCancelTool: () => void;
  handleToggleDoctor: () => void;
  handleOpenDoctor: () => void;
  handleCloseDoctor: () => void;

  // Validation
  onValidateStage: (stage: WorkflowStage) => void;

  // Focus Mode
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  focusedPrimitiveId: string | null;
  setFocusedPrimitiveId: (id: string | null) => void;
  focusedStageId: WorkflowStage | null;
  setFocusedStageId: (stage: WorkflowStage | null) => void;
  handleFocusMode: (id: string, stage?: WorkflowStage) => void;
  handleCloseFocus: () => void;

  // Action States
  isDeleting: boolean;
  setIsDeleting: (val: boolean) => void;
  projectToDelete: string | null;
  setProjectToDelete: (id: string | null) => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId: (id: string | null) => void;
  handleDeleteCurrentProject: () => void;
  handleCancelDelete: () => void;
  onApplyFix: (prompt: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ user: User | null; addToast: any; children: ReactNode }> = ({ user, addToast, children }) => {
  const projectHook = useProjects(user, addToast);
  const { 
    currentProject, activeStage, handleStageChange, handleStageAnalyze, handleSubcollectionUpdate,
    handleContentUpdate, handleStageValidate, setRefiningBlockId, setLastUpdatedPrimitiveId,
    stageContents, triggerStageGeneration
  } = projectHook;

  const hydrationState = useAutoHydration({
    activeStage,
    currentProject,
    stageContents,
    addToast,
    isStageLoading: projectHook.isStageLoading,
    onStageAnalyze: handleStageAnalyze
  });

  const callbacks = useAppCallbacks({
    currentProject,
    addToast,
    handleSubcollectionUpdate,
    handleContentUpdate,
    handleStageValidate,
    stageContents
  });

  const doctor = useScriptDoctor({
    currentProject,
    activeStage,
    stageContents,
    addToast,
    setRefiningBlockId,
    setLastUpdatedPrimitiveId,
    handleStageAnalyze,
    handleStageChange,
    triggerStageGeneration
  });

  const telemetryStatus = useTelemetry();

  const handleToggleDoctor = useCallback(() => doctor.setIsDoctorOpen(prev => !prev), [doctor]);
  const handleOpenDoctor = useCallback(() => doctor.setIsDoctorOpen(true), [doctor]);
  const handleCloseDoctor = useCallback(() => doctor.setIsDoctorOpen(false), [doctor]);

  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [focusedPrimitiveId, setFocusedPrimitiveId] = React.useState<string | null>(null);
  const [focusedStageId, setFocusedStageId] = React.useState<WorkflowStage | null>(null);

  const handleFocusMode = useCallback((id: string, stage?: WorkflowStage) => {
    setFocusedPrimitiveId(id);
    setFocusedStageId(stage || activeStage);
    setIsFocusMode(true);
  }, [activeStage]);

  const handleCloseFocus = useCallback(() => {
    setIsFocusMode(false);
    setFocusedPrimitiveId(null);
    setFocusedStageId(null);
  }, []);

  const handleDeleteCurrentProject = useCallback(() => {
    if (projectHook.currentProject) {
      projectHook.setProjectToDelete(projectHook.currentProject.id);
    }
  }, [projectHook]);

  const handleCancelDelete = useCallback(() => {
    projectHook.setProjectToDelete(null);
  }, [projectHook]);

  const value: ProjectContextType = {
    ...projectHook,
    ...doctor,
    ...callbacks,
    onValidateStage: callbacks.onValidateStage,
    hydrationState,
    telemetryStatus,
    stageContents: projectHook.stageContents,
    handleToggleDoctor,
    handleOpenDoctor,
    handleCloseDoctor,
    isFocusMode,
    setIsFocusMode,
    focusedPrimitiveId,
    setFocusedPrimitiveId,
    focusedStageId,
    setFocusedStageId,
    handleFocusMode,
    handleCloseFocus,
    handleDeleteCurrentProject,
    handleCancelDelete,
    onApplyFix: doctor.handleDoctorMessage
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
