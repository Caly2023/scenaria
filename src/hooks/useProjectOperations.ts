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

  const handleProjectCreate = async (initialIdea: string, format?: ProjectFormat, extractedData?: any) => {
    if (!user) return;
    
    setSyncStatus('syncing');
    setIsTyping(true);
    try {
      const newMetadata = {
        title: extractedData?.metadata?.title || 'Untitled Project',
        format: extractedData?.metadata?.format || format || 'Auto',
        genre: extractedData?.metadata?.genre || '',
        tone: extractedData?.metadata?.tone || '',
        logline: extractedData?.logline || '',
        languages: extractedData?.metadata?.languages || [],
        targetDuration: extractedData?.metadata?.targetDuration || '',
        productionNotes: extractedData?.productionNotes || extractedData?.metadata?.productionNotes || '',
        synopsis: extractedData?.synopsis || extractedData?.metadata?.synopsis || ''
      };

      const projectilesRef = doc(collection(db, 'projects'));
      const docId = projectilesRef.id;
      const timestamp = Date.now();

      const projectData = {
        metadata: newMetadata,
        stageAnalyses: {
          'Project Brief': {
            evaluation: 'Project initialized from discovery conversation.',
            isReady: true,
            issues: [],
            recommendations: [],
            suggestedPrompt: '',
            updatedAt: timestamp
          }
        },
        stageStates: {
          'Project Brief': 'ready'
        },
        collaborators: [user.uid],
        ownerId: user.uid,
        activeStage: 'Project Brief' as WorkflowStage,
        validatedStages: [] as WorkflowStage[],
      };

      // Optimistic project
      const newProject = { 
        id: docId, 
        ...projectData, 
        createdAt: timestamp, 
        updatedAt: timestamp,
      } as any;
      
      // STEP 1: Redirect immediately
      handleProjectSelect(docId, newProject);
      addToast(t('common.generatingProject', { defaultValue: 'Creating project...' }), 'info');

      // STEP 2: Perform Firestore initialization
      const primitives = [];
      
      if (extractedData?.logline) {
        primitives.push({
          title: 'Logline',
          content: extractedData.logline,
          primitiveType: 'logline',
          order: 1,
          ownerId: user.uid,
          subcollection: 'brief_primitives'
        });
      }

      if (extractedData?.synopsis) {
        primitives.push({
          title: 'Synopsis',
          content: extractedData.synopsis,
          primitiveType: 'synopsis',
          order: 2,
          ownerId: user.uid,
          subcollection: 'brief_primitives'
        });
      }

      if (extractedData?.productionNotes) {
        primitives.push({
          title: 'Production Notes',
          content: extractedData.productionNotes,
          primitiveType: 'production_notes',
          order: 3,
          ownerId: user.uid,
          subcollection: 'brief_primitives'
        });
      }

      // If no extracted data, use the initial idea as a primitive in Project Brief maybe?
      // But the requirement says "Once sufficient information is collected, present a validation action."
      // So extractedData should be there.

      await initProjectWithPrims({ projectId: docId, projectData, primitives }).unwrap();
      
      setSyncStatus('synced');
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
