import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  Project, 
  WorkflowStage, 
  Sequence, 
  Character, 
  Location, 
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
  handleProjectCreate: (metadata: ProjectMetadata) => Promise<string | undefined>;
  handleProjectDelete: (id: string) => Promise<void>;
  handleStageChange: (stage: WorkflowStage) => void;
  handleMetadataUpdate: (metadata: Partial<ProjectMetadata>) => Promise<void>;
  handleContentUpdate: (field: string, content: string) => Promise<void>;
  handleSubcollectionUpdate: (coll: string, id: string, data: Record<string, any>) => Promise<void>;
  handleRegenerate: (stage: WorkflowStage) => Promise<void>;
  handleStageValidate: (stage: WorkflowStage) => Promise<void>;
  handleStageRefine: (stage: WorkflowStage, feedback: string, blockId?: string) => Promise<void>;
  handleStageAnalyze: (stage: WorkflowStage) => Promise<void>;
  
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

  // Validation Shortcuts
  onValidateProjectMetadata: () => void;
  onValidateInitialDraft: () => void;
  onValidateBrainstorming: () => void;
  onValidateLogline: () => void;
  onValidate3Act: () => void;
  onValidate8Beat: () => void;
  onValidateSynopsis: () => void;
  onValidateCharacterBible: () => void;
  onValidateLocationBible: () => void;
  onValidateTreatment: () => void;
  onValidateStepOutline: () => void;
  onValidateScript: () => void;
  onValidateGlobalDoctoring: () => void;
  onValidateTechnicalBreakdown: () => void;
  onValidateVisualAssets: () => void;
  onValidateAiPrevis: () => void;
  onValidateProductionExport: () => void;

  // Focus Mode
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  focusedSequenceId: string | null;
  setFocusedSequenceId: (id: string | null) => void;
  handleFocusMode: (id: string) => void;
  handleCloseFocus: () => void;

  // Action States
  isDeleting: boolean;
  setIsDeleting: (val: boolean) => void;
  projectToDelete: string | null;
  setProjectToDelete: (id: string | null) => void;
  setRefiningBlockId: (id: string | null) => void;
  setLastUpdatedPrimitiveId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ user: User | null; addToast: any; children: ReactNode }> = ({ user, addToast, children }) => {
  const projectHook = useProjects(user, addToast);
  const { 
    currentProject, activeStage, handleStageAnalyze, handleSubcollectionUpdate,
    handleContentUpdate, handleStageValidate, setRefiningBlockId, setLastUpdatedPrimitiveId,
    stageContents
  } = projectHook;

  const hydrationState = useAutoHydration({
    activeStage,
    currentProject,
    stageContents,
    addToast,
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
    handleStageAnalyze
  });

  const telemetryStatus = useTelemetry();

  const handleToggleDoctor = useCallback(() => doctor.setIsDoctorOpen(prev => !prev), [doctor]);
  const handleOpenDoctor = useCallback(() => doctor.setIsDoctorOpen(true), [doctor]);
  const handleCloseDoctor = useCallback(() => doctor.setIsDoctorOpen(false), [doctor]);

  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [focusedSequenceId, setFocusedSequenceId] = React.useState<string | null>(null);

  const handleFocusMode = useCallback((id: string) => {
    setFocusedSequenceId(id);
    setIsFocusMode(true);
  }, []);

  const handleCloseFocus = useCallback(() => setIsFocusMode(false), []);

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
    hydrationState,
    telemetryStatus,
    stageContents: projectHook.stageContents,
    handleToggleDoctor,
    handleOpenDoctor,
    handleCloseDoctor,
    isFocusMode,
    setIsFocusMode,
    focusedSequenceId,
    setFocusedSequenceId,
    handleFocusMode,
    handleCloseFocus,
    handleDeleteCurrentProject,
    handleCancelDelete
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
