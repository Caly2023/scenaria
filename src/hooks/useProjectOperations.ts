import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'firebase/auth';
import { collection, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { geminiService } from '../services/geminiService';
import { classifyError } from '../lib/errorClassifier';
import { 
  useDeleteProjectMutation,
  useInitializeProjectWithPrimitivesMutation 
} from '../services/firebaseService';
import { Project, WorkflowStage, ProjectFormat } from '../types';

interface UseProjectOperationsProps {
  user: User | null;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  setSyncStatus: (status: 'synced' | 'syncing' | 'error') => void;
  setIsTyping: (val: boolean) => void;
  handleProjectSelect: (id: string, project: Project) => void;
  handleProjectExit: () => void;
  currentProjectId: string | null;
}

export function useProjectOperations({
  user,
  addToast,
  setSyncStatus,
  setIsTyping,
  handleProjectSelect,
  handleProjectExit,
  currentProjectId
}: UseProjectOperationsProps) {
  const { t } = useTranslation();
  const [deleteProject] = useDeleteProjectMutation();
  const [initProjectWithPrims] = useInitializeProjectWithPrimitivesMutation();

  const handleProjectDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId).unwrap();
      addToast(t('common.projectDeleted', { defaultValue: 'Project deleted' }), 'success');
      if (currentProjectId === projectId) {
        handleProjectExit();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      addToast(t('common.errorDeletingProject', { defaultValue: 'Error deleting project' }), 'error');
    }
  };

  const handleProjectCreate = async (initialIdea: string, format?: ProjectFormat) => {
    if (!user) return;
    
    setSyncStatus('syncing');
    setIsTyping(true);
    try {
      addToast(t('common.generatingProject', { defaultValue: 'Starting discovery...' }), 'info');

      const newMetadata = {
        title: 'Untitled Project',
        format: format || 'Auto',
        genre: '',
        tone: '',
        logline: '',
        languages: [],
        targetDuration: ''
      };

      const projectData = {
        metadata: newMetadata,
        stageAnalyses: {
          'Discovery': {
            evaluation: 'Initial discovery phase.',
            issues: [],
            recommendations: [],
            suggestedPrompt: '',
            updatedAt: Date.now()
          }
        },
        stageStates: {
          'Discovery': 'needs_improvement'
        },
        collaborators: [user.uid],
        ownerId: user.uid,
        activeStage: 'Discovery' as WorkflowStage,
        validatedStages: [] as WorkflowStage[],
      };

      const primitives = [
        {
          title: 'Initial Idea',
          content: initialIdea,
          primitiveType: 'discovery',
          order: 1,
          ownerId: user.uid,
          subcollection: 'discovery_primitives'
        }
      ];

      const projectilesRef = doc(collection(db, 'projects'));
      const docId = projectilesRef.id;
      const timestamp = Date.now();
      
      const newProject = { 
        id: docId, 
        ...projectData, 
        createdAt: timestamp, 
        updatedAt: timestamp 
      } as Project;
      
      await initProjectWithPrims({ projectId: docId, projectData, primitives }).unwrap();
      handleProjectSelect(docId, newProject);
      
      setSyncStatus('synced');
      addToast(t('common.projectCreated', { defaultValue: 'Project ready!' }), 'success');
    } catch (error) {
      console.error('Project creation failed:', error);
      const classified = classifyError(error);
      addToast(`Failed to create project: ${classified.userMessage}`, 'error');
      setSyncStatus('error');
      throw error;
    } finally {
      setIsTyping(false);
    }
  };

  return {
    handleProjectDelete,
    handleProjectCreate,
  };
}
