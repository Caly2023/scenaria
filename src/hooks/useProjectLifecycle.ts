import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage, ProjectFormat } from '../types';
import { geminiService } from '../services/geminiService';
import { contextAssembler } from '../services/contextAssembler';
import { 
  useUpdateProjectFieldMutation, 
  useCreateProjectMutation, 
  useDeleteProjectMutation,
  useAddSubcollectionDocMutation,
  useUpdateSubcollectionDocMutation,
  useClearSubcollectionMutation,
  useInitializeProjectWithPrimitivesMutation
} from '../services/firebaseApi';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, query, where, doc } from 'firebase/firestore';
import { agentRegistry } from '../agents/agentRegistry';
import { stageRegistry } from '../config/stageRegistry';
import { persistAgentOutput, buildProjectContext } from '../services/orchestratorService';
import { ProjectContext, ContentPrimitive } from '../types/stageContract';

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
  /** Callback to build a ProjectContext from the live subcollection data in App.tsx */
  getProjectContext?: () => ProjectContext | null;
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
  hydrationState,
  getProjectContext
}: UseProjectLifecycleProps) {
  const { t } = useTranslation();
  
  const [updateField] = useUpdateProjectFieldMutation();
  const [createProject] = useCreateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [addSubcol] = useAddSubcollectionDocMutation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();
  const [clearSubcol] = useClearSubcollectionMutation();
  const [initProjectWithPrims] = useInitializeProjectWithPrimitivesMutation();

  const triggerInitialAnalysis = async (projectId: string, draft: string, format?: ProjectFormat, initPromise?: Promise<any>) => {
    try {
      // Background AI call
      const initResult = await geminiService.initializeProjectAgent(draft, format);
      
      // Ensure the initial project creation has completed before proceeding with doc updates
      if (initPromise) {
        await initPromise.catch(e => console.warn("Init promise error:", e));
      }
      
      const newMetadata = {
        ...initResult.metadata,
        logline: initResult.validation.status === 'GOOD TO GO' ? initResult.metadata.logline : ''
      };
      await updateField({ id: projectId, field: 'metadata', content: newMetadata }).unwrap();
      
      const stageAnalyses = {
        'Brainstorming': {
          evaluation: initResult.critique,
          issues: initResult.validation.status === 'NEEDS WORK' ? [initResult.validation.feedback] : [],
          recommendations: [],
          updatedAt: Date.now()
        }
      };
      await updateField({ id: projectId, field: 'stageAnalyses', content: stageAnalyses }).unwrap();
      
      const stageStates = {
        'Brainstorming': initResult.validation.status === 'GOOD TO GO' ? 'excellent' : 'needs_improvement'
      };
      await updateField({ id: projectId, field: 'stageStates', content: stageStates }).unwrap();

      // Add the Critique primitive
      await addSubcol({ 
        projectId, 
        collectionName: 'pitch_primitives', 
        data: {
          title: 'Initial Critique',
          content: initResult.critique,
          type: 'analysis_block',
          order: 0,
        }
      }).unwrap();

      // Find the pitch primitive and update its content
      const q = query(collection(db, 'projects', projectId, 'pitch_primitives'), where('order', '==', 1));
      const snap = await getDocs(q);
      if (!snap.empty) {
         const docId = snap.docs[0].id;
         await updateSubcol({ projectId, collectionName: 'pitch_primitives', docId, data: { content: initResult.pitch } }).unwrap();
      }
    } catch (error) {
      console.error("Background initial analysis failed:", error);
    }
  };  const handleRegenerate = async (stage: WorkflowStage) => {
    if (!currentProject || isRegenerating) return;
    
    setIsRegenerating(true);
    setIsTyping(true);
    setIsHeavyThinking(true);
    
    try {
      const collectionName = stageRegistry.getCollectionName(stage);
      if (collectionName) {
        await clearSubcol({ projectId: currentProject.id, collectionName }).unwrap();
      }
      
      addToast(`Regenerating ${stage}...`, 'info');
      hydrationState.resetHydration?.(stage);
    } catch (error: any) {
      console.error(`Regenerate failed for ${stage}:`, error);
      const errMsg = classifyError(error);
      addToast(`Failed to regenerate ${stage}: ${errMsg}`, 'error');
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
      
      // 1. INSTANT CREATION: Only metadata and raw user input
      const projectData = {
        metadata: {
          title: 'Untitled Project',
          format: format || 'Auto',
          genre: '',
          tone: '',
          logline: '',
          languages: [],
          targetDuration: ''
        },
        stageAnalyses: {},
        stageStates: {},
        collaborators: [user.uid],
        ownerId: user.uid,
        activeStage: 'Brainstorming' as WorkflowStage,
        validatedStages: [] as WorkflowStage[],
      };

      const primitives = [
        {
          title: 'Story Idea',
          content: brainstormingDraft,
          type: 'pitch_result',
          order: 1,
        }
      ];

      const projectilesRef = doc(collection(db, 'projects'));
      const docId = projectilesRef.id;
      
      const newProject = { id: docId, ...projectData, createdAt: Date.now(), updatedAt: Date.now() } as Project;
      
      // 2. EAGER TRANSITION: Move to project immediately (non-blocking)
      handleProjectSelect(docId, newProject);
      
      setIsTyping(false);
      setSyncStatus('synced');
      
      // 3. FIRE AND FORGET CREATION AND ANALYSIS
      // Don't await the initial creation to avoid blocking the frontend, 
      // but pass the promise to triggerInitialAnalysis so it can await it before updating docs.
      const initPromise = initProjectWithPrims({ projectId: docId, projectData, primitives })
        .unwrap()
        .catch(e => console.error("Failed to commit project to database:", e));
      
      triggerInitialAnalysis(docId, brainstormingDraft, format, initPromise);
      
    } catch (error: any) {
      console.error('Project creation failed:', error);
      const errMsg = classifyError(error);
      addToast(`Failed to create project: ${errMsg}`, 'error');
      setSyncStatus('error');
      setIsTyping(false);
      throw error;
    }
  };

  /**
   * PROACTIVE "GHOST" GENERATION
   * 
   * When a stage is validated, this function:
   * 1. Updates validatedStages and activeStage in Firestore
   * 2. Transitions the UI to the next stage
   * 3. Fires off a background generation for the triggered stage
   *    (as defined in stageRegistry.triggers)
   * 
   * The generation is NON-BLOCKING — the user sees the next stage
   * immediately and content populates via the Firestore onSnapshot listener.
   */
  const handleStageValidate = async (stage: WorkflowStage) => {
    if (!currentProject) return;
    
    setSyncStatus('syncing');
    setIsTyping(true);
    try {
      const insight = currentProject.stageAnalyses?.[stage];
      const state = currentProject.stageStates?.[stage];
      const isReady = state === 'good' || state === 'excellent';

      if (!isReady) {
        setDoctorMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `${t('common.notReadyYetFeedback', { defaultValue: "I've analyzed this stage and it's not quite ready yet." })}\n\n${insight?.evaluation || t('common.analysisInProgress', { defaultValue: "Let's review what's missing together." })}`,
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
        addToast(`✅ ${stage} validated. Moving to ${nextStage}...`, 'success');
      }

      setSyncStatus('synced');
      setIsTyping(false);

      // ── PROACTIVE GHOST GENERATION ──────────────────────────────────────
      // Fire-and-forget: trigger generation for the next stage in the cascade.
      // This runs in the background and writes results via persistAgentOutput.
      // The UI picks up the new content via Firestore onSnapshot listeners.
      const triggeredStage = stageRegistry.getTriggeredStage(stage);
      if (triggeredStage && currentProject) {
        triggerProactiveGeneration(triggeredStage, currentProject, newValidatedStages);
      }

    } catch (error: any) {
      console.error(error);
      const errMsg = classifyError(error);
      addToast(t('common.failedToGenerate') + ` (${errMsg})`, 'error');
      setSyncStatus('error');
      setIsTyping(false);
    }
  };

  /**
   * Proactive generation — runs as a background task after validation.
   * Uses the agent registry to generate content for the triggered stage,
   * then persists it via the orchestrator's Analysis→Content→State pipeline.
   */
  const triggerProactiveGeneration = async (
    targetStage: WorkflowStage,
    project: Project,
    validatedStages: WorkflowStage[]
  ) => {
    try {
      // Skip Storyboard (manual-only per system_logic.md §4)
      if (targetStage === 'Storyboard') return;

      const agent = await agentRegistry.get(targetStage);
      if (!agent) {
        console.warn(`[ProactiveGen] No agent registered for "${targetStage}". Skipping.`);
        return;
      }

      // Build the ProjectContext from the callback (live data in App.tsx)
      // or fallback to building from project metadata alone.
      let context: ProjectContext | null = null;
      if (getProjectContext) {
        context = getProjectContext();
      }
      if (!context) {
        // Fallback: build a minimal context from the project document.
        // This won't have subcollection data but agents pull from Brainstorming source of truth.
        context = buildProjectContext(
          project.id,
          project.metadata,
          {},  // stage contents will be empty — agent will use what it can
          project.stageAnalyses || {}
        );
      }

      console.log(`[ProactiveGen] 🚀 Starting ghost generation for "${targetStage}"...`);
      addToast(`🧠 Drafting ${targetStage}...`, 'info');

      const output = await agent.generate(context);
      
      // Persist with replaceAll since this is a fresh generation
      const result = await persistAgentOutput(project.id, targetStage, output, { replaceAll: true });

      if (result.success) {
        console.log(`[ProactiveGen] ✅ "${targetStage}" ghost generation complete (${result.primitiveIds.length} primitives)`);
        addToast(`✅ ${targetStage} draft ready!`, 'success');
      } else {
        console.warn(`[ProactiveGen] ⚠️ Persist failed for "${targetStage}": ${result.error}`);
        addToast(`⚠️ ${targetStage} draft partially saved`, 'info');
      }
    } catch (error: any) {
      // Ghost generation failure is non-fatal — user can still manually generate
      console.error(`[ProactiveGen] Failed for "${targetStage}":`, error);
      const errMsg = classifyError(error);
      addToast(`Could not auto-draft ${targetStage}: ${errMsg}`, 'info');
    }
  };

  return {
    handleRegenerate,
    handleProjectDelete,
    handleProjectCreate,
    handleStageValidate
  };
}

// ── Error classification helper ────────────────────────────────────────────────

function classifyError(error: any): string {
  const msg = (error?.message || error?.toString() || '').toLowerCase();
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return 'AI quota limit reached — try again later';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnreset') || msg.includes('failed to fetch')) {
    return 'Network error — check your connection';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Request timed out — try again';
  }
  if (msg.includes('permission') || msg.includes('403')) {
    return 'Permission denied';
  }
  return 'Unexpected error';
}
