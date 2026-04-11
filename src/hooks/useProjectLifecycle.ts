import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage, ProjectFormat } from '../types';
import { geminiService } from '../services/geminiService';
import { contextAssembler } from '../services/contextAssembler';
import { 
  useUpdateProjectFieldMutation, 
  useCreateProjectMutation, 
  useDeleteProjectMutation,
  useAddSubcollectionDocMutation,
  useDeleteSubcollectionDocMutation
} from '../services/firebaseApi';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

interface UseProjectLifecycleProps {
  user: any;
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
  setDoctorMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setIsDoctorOpen: (val: boolean) => void;
  setIsDeleting: (val: boolean) => void;
  setProjectToDelete: (val: string | null) => void;
  setDeleteConfirmText: (val: string) => void;
  hydrationState: any;
}

export function useProjectLifecycle({
  user,
  currentProject,
  currentProjectId,
  setIsTyping,
  setSyncStatus,
  setIsHeavyThinking,
  setIsRegenerating,
  isRegenerating,
  addToast,
  handleProjectSelect,
  handleProjectExit,
  handleStageChange,
  setDoctorMessages,
  setIsDoctorOpen,
  setIsDeleting,
  setProjectToDelete,
  setDeleteConfirmText,
  hydrationState
}: UseProjectLifecycleProps) {
  const { t } = useTranslation();
  
  const [updateField] = useUpdateProjectFieldMutation();
  const [createProject] = useCreateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [addSubcol] = useAddSubcollectionDocMutation();



  const handleRegenerate = async (stage: WorkflowStage) => {
    if (!currentProject || isRegenerating) return;
    
    setIsRegenerating(true);
    setIsTyping(true);
    setIsHeavyThinking(true);
    
    try {
      const subcollectionMap: Record<string, string> = {
        'Treatment': 'treatment_sequences',
        'Script': 'script_scenes',
        'Step Outline': 'sequences',
        'Character Bible': 'characters',
        'Location Bible': 'locations',
        'Brainstorming': 'pitch_primitives',
      };
      
      const subcollection = subcollectionMap[stage];
      if (subcollection) {
        // Keeping manual getDocs and deleteDoc here for subcollections as it's an internal flush process.
        // Doing atomic bulk deletes isn't natively supported in RTK Query without a custom endpoint.
        const existingSnap = await getDocs(collection(db, 'projects', currentProject.id, subcollection));
        for (const docSnap of existingSnap.docs) {
          await deleteDoc(docSnap.ref);
        }
      } else {
        const fieldMap: Record<string, string> = {
          'Logline': 'loglineDraft',
          '3-Act Structure': 'structureDraft',
          'Synopsis': 'synopsisDraft',
        };
        const field = fieldMap[stage];
        if (field) {
          await updateField({ id: currentProject.id, field, content: '' }).unwrap();
        }
      }
      
      addToast(`Regenerating ${stage}...`, 'info');
      hydrationState.resetHydration?.(stage);
    } catch (error) {
      console.error(`Regenerate failed for ${stage}:`, error);
      addToast(`Failed to regenerate ${stage}`, 'error');
    } finally {
      setIsRegenerating(false);
      setIsTyping(false);
      setIsHeavyThinking(false);
    }
  };

  const handleProjectDelete = async (projectId: string) => {
    setIsDeleting(true);
    try {
      await deleteProject(projectId).unwrap();
      
      addToast(t('common.projectDeleted', { defaultValue: 'Project deleted' }), 'success');
      setProjectToDelete(null);
      setDeleteConfirmText('');
      
      if (currentProjectId === projectId || currentProject?.id === projectId) {
        handleProjectExit();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      addToast(t('common.errorDeletingProject', { defaultValue: 'Error deleting project' }), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProjectCreate = async (brainstormingDraft: string, format?: ProjectFormat) => {
    if (!user) return;
    
    setSyncStatus('syncing');
    try {
      setIsTyping(true);
      
      const metadata = await geminiService.extractMetadata(brainstormingDraft);
      if (format) metadata.format = format;
      
      const dualResult = await geminiService.brainstormDual(brainstormingDraft, "", metadata);

      const projectData = {
        metadata: {
          ...metadata,
          logline: dualResult.metadataUpdates?.logline || ''
        },
        pitch_critique: dualResult.critique,
        pitch_result: dualResult.pitch,
        pitch_validation: dualResult.validation,
        insights: {
          'Brainstorming': {
            content: dualResult.critique,
            isReady: dualResult.validation.status === 'GOOD TO GO',
            updatedAt: Date.now()
          }
        },
        loglineDraft: dualResult.metadataUpdates?.logline || '',
        collaborators: [user.uid],
        ownerId: user.uid,
        activeStage: 'Brainstorming' as WorkflowStage,
        validatedStages: [] as WorkflowStage[],
      };

      const docId = await createProject({ projectData }).unwrap();
      
      await addSubcol({ projectId: docId, collectionName: 'pitch_primitives', data: {
        title: 'Primitive A: The Critique',
        content: dualResult.critique,
        type: 'analysis_block',
        order: 0,
      } }).unwrap();

      await addSubcol({ projectId: docId, collectionName: 'pitch_primitives', data: {
        title: 'Primitive B: The Final Pitch',
        content: dualResult.pitch,
        type: 'pitch_result',
        order: 1,
      } }).unwrap();

      const newProject = { id: docId, ...projectData, createdAt: Date.now(), updatedAt: Date.now() } as Project;
      handleProjectSelect(docId, newProject);
      setIsTyping(false);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setSyncStatus('error');
      setIsTyping(false);
    }
  };

  const handleStageValidate = async (stage: WorkflowStage) => {
    if (!currentProject) return;
    
    setSyncStatus('syncing');
    setIsTyping(true);
    try {
      const insight = currentProject.insights?.[stage];
      const isReady = insight?.isReady ?? false;

      if (!isReady) {
        setDoctorMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `${t('common.notReadyYetFeedback', { defaultValue: "I've analyzed this stage and it's not quite ready yet." })}\n\n${insight?.content || t('common.analysisInProgress', { defaultValue: "Let's review what's missing together." })}`,
          timestamp: Date.now()
        }]);
        setIsDoctorOpen(true);
        addToast(t('common.fixRequiredToast', { defaultValue: 'Please address the AI insights before proceeding.' }), 'info');
        return;
      }

      const nextStages: WorkflowStage[] = [
        'Brainstorming', 'Logline', '3-Act Structure', 'Synopsis', 'Character Bible',
        'Location Bible', 'Treatment', 'Step Outline', 'Script', 'Storyboard'
      ];
      const currentIndex = nextStages.indexOf(stage);
      const nextStage = nextStages[currentIndex + 1];
      
      const newValidatedStages = Array.from(new Set([...(currentProject.validatedStages || []), stage]));
      
      await updateField({ id: currentProject.id, field: 'validatedStages', content: newValidatedStages }).unwrap();

      if (nextStage) {
        await updateField({ id: currentProject.id, field: 'activeStage', content: nextStage }).unwrap();
        handleStageChange(nextStage);
        addToast(`Moving to ${nextStage}...`, 'info');
      }

      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      addToast(t('common.failedToGenerate'), 'error');
      setSyncStatus('error');
    } finally {
      setIsTyping(false);
    }
  };

  return {
    handleRegenerate,
    handleProjectDelete,
    handleProjectCreate,
    handleStageValidate
  };
}
