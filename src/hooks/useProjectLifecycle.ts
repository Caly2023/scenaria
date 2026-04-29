import { User } from 'firebase/auth';
import { Project, WorkflowStage, ProjectFormat } from '../types';
import { ProjectContext } from '../types/stageContract';

// Sub-hooks
import { useProjectOperations } from './useProjectOperations';
import { useStageLifecycle } from './useStageLifecycle';

interface UseProjectLifecycleProps {
  user: User | null;
  currentProject: Project | null;
  currentProjectId: string | null;
  setIsTyping: (val: boolean) => void;
  setSyncStatus: (status: 'synced' | 'syncing' | 'error') => void;
  setIsHeavyThinking: (val: boolean) => void;
  setIsRegenerating: (val: boolean) => void;
  isRegenerating: boolean;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  handleProjectSelect: (id: string, project: Project) => void;
  handleProjectExit: () => void;
  handleStageChange: (stage: WorkflowStage) => void;
  setIsDeleting: (val: boolean) => void;
  setProjectToDelete: (val: string | null) => void;
  setDeleteConfirmText: (val: string) => void;
  hydrationState: {
    isHydrating?: boolean;
    hydratingStage?: WorkflowStage | null;
    hydratingLabel?: string | null;
    resetHydration?: (stage: WorkflowStage) => void;
  };
  getProjectContext?: () => ProjectContext | null;
}

export function useProjectLifecycle(props: UseProjectLifecycleProps) {
  const {
    handleProjectDelete: baseDelete,
    handleProjectCreate,
    isDeleting
  } = useProjectOperations({
    user: props.user,
    addToast: props.addToast,
    setSyncStatus: props.setSyncStatus,
    setIsTyping: props.setIsTyping,
    handleProjectSelect: props.handleProjectSelect,
    handleProjectExit: props.handleProjectExit,
    currentProjectId: props.currentProjectId
  });

  const {
    handleRegenerate,
    handleStageValidate
  } = useStageLifecycle({
    currentProject: props.currentProject,
    setIsTyping: props.setIsTyping,
    setSyncStatus: props.setSyncStatus,
    setIsHeavyThinking: props.setIsHeavyThinking,
    setIsRegenerating: props.setIsRegenerating,
    isRegenerating: props.isRegenerating,
    addToast: props.addToast,
    handleStageChange: props.handleStageChange,
    getProjectContext: props.getProjectContext,
    hydrationState: props.hydrationState
  });

  // Proxy the delete function to handle the local UI state
  const handleProjectDelete = async (projectId: string) => {
    props.setIsDeleting(true);
    try {
      await baseDelete(projectId);
      props.setProjectToDelete(null);
      props.setDeleteConfirmText('');
    } finally {
      props.setIsDeleting(false);
    }
  };

  return {
    handleRegenerate,
    handleProjectDelete,
    handleProjectCreate,
    handleStageValidate
  };
}
