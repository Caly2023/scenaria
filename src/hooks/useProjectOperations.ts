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

  const handleProjectCreate = async (brainstormingDraft: string, format?: ProjectFormat) => {
    if (!user) return;
    
    setSyncStatus('syncing');
    setIsTyping(true);
    try {
      addToast(t('common.generatingProject', { defaultValue: 'AI is analyzing your idea...' }), 'info');

      const initResult = await geminiService.initializeProjectAgent(brainstormingDraft, format);
      if (!initResult || !initResult.metadata) {
        throw new Error('AI analysis failed to return valid metadata');
      }

      const newMetadata = {
        title: (initResult.metadata.title || 'Untitled Project').substring(0, 100),
        format: String(initResult.metadata.format || format || 'Auto').substring(0, 50),
        genre: String(initResult.metadata.genre || '').substring(0, 50),
        tone: String(initResult.metadata.tone || '').substring(0, 50),
        logline: String(initResult.metadata.logline || '').substring(0, 500),
        languages: Array.isArray(initResult.metadata.languages) 
          ? Array.from(new Set(initResult.metadata.languages.map(String).filter(Boolean)))
          : [],
        targetDuration: String(initResult.metadata.targetDuration || '').substring(0, 50)
      };

      const projectData = {
        metadata: newMetadata,
        stageAnalyses: {
          'Brainstorming': {
            evaluation: initResult.critique || 'Initial critique',
            issues: initResult.validation?.status === 'NEEDS WORK' ? [initResult.validation.feedback] : [],
            recommendations: [],
            suggestedPrompt: initResult.suggestedPrompt || '',
            updatedAt: Date.now()
          }
        },
        stageStates: {
          'Brainstorming': initResult.validation?.status === 'GOOD TO GO' ? 'excellent' : 'needs_improvement'
        },
        collaborators: [user.uid],
        ownerId: user.uid,
        activeStage: 'Brainstorming' as WorkflowStage,
        validatedStages: [] as WorkflowStage[],
      };

      const primitives = [
        {
          title: 'Brainstorming Result',
          content: initResult.pitch || brainstormingDraft,
          primitiveType: 'brainstorming_result',
          order: 1,
          ownerId: user.uid,
        },
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
