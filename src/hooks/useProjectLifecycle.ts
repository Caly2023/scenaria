import { useTranslation } from 'react-i18next';
import { Project, WorkflowStage, ProjectFormat } from '../types';
import { geminiService } from '../services/geminiService';
import { classifyError } from '../lib/errorClassifier';
import { 
  useUpdateProjectFieldMutation, 
  useDeleteProjectMutation,
  useClearSubcollectionMutation,
  useInitializeProjectWithPrimitivesMutation
} from '../services/firebaseApi';
import { db } from '../lib/firebase';
import { collection, doc } from 'firebase/firestore';
import { agentRegistry } from '../agents/agentRegistry';
import { stageRegistry } from '../config/stageRegistry';
import { persistAgentOutput, buildProjectContext } from '../services/orchestratorService';
import { ProjectContext } from '../types/stageContract';

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
  setIsDeleting,
  setProjectToDelete,
  setDeleteConfirmText,
  hydrationState,
  getProjectContext
}: UseProjectLifecycleProps) {
  const { t } = useTranslation();
  
  const [updateField] = useUpdateProjectFieldMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [clearSubcol] = useClearSubcollectionMutation();
  const [initProjectWithPrims] = useInitializeProjectWithPrimitivesMutation();

  const handleRegenerate = async (stage: WorkflowStage) => {
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
    if (!user) {
      console.warn('[useProjectLifecycle] No user found during creation');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      setIsTyping(true);
      addToast(t('common.generatingProject', { defaultValue: 'AI is analyzing your idea...' }), 'info');

      // 1. Await AI Analysis BEFORE navigating

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

      // Prepare initial analysis and state
      const stageAnalyses = {
        'Brainstorming': {
          evaluation: initResult.critique || 'Initial critique',
          issues: initResult.validation?.status === 'NEEDS WORK' ? [initResult.validation.feedback] : [],
          recommendations: [],
          suggestedPrompt: initResult.suggestedPrompt || '',
          updatedAt: Date.now()
        }
      };
      
      const stageStates = {
        'Brainstorming': initResult.validation?.status === 'GOOD TO GO' ? 'excellent' : 'needs_improvement'
      };

      const projectData = {
        metadata: newMetadata,
        stageAnalyses,
        stageStates,
        collaborators: [user.uid],
        ownerId: user.uid,
        activeStage: 'Brainstorming' as WorkflowStage,
        validatedStages: [] as WorkflowStage[],
      };

      const primitives = [
        {
          title: 'User Input',
          content: brainstormingDraft,
          primitiveType: 'pitch_result',
          order: 1,
          ownerId: user.uid,
        },
        {
          title: 'AI Analysis',
          content: initResult.pitch || initResult.critique || 'Generation complete.',
          primitiveType: 'analysis_block',
          order: 2,
          ownerId: user.uid,
        }
      ];

      // 2. Commit to Database

      // Generate ID locally so we can use it for optimistic navigation
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

      
      // 3. EAGER TRANSITION: Move to project immediately after db write
      handleProjectSelect(docId, newProject);
      
      setIsTyping(false);
      setSyncStatus('synced');
      addToast(t('common.projectCreated', { defaultValue: 'Project ready!' }), 'success');
      
    } catch (error: any) {
      console.error('Project creation failed:', error);
      const errMsg = classifyError(error);
      addToast(`Failed to create project: ${errMsg}`, 'error');
      setSyncStatus('error');
      setIsTyping(false);
      throw error; // RE-THROW so the caller (HomePage) can catch it
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
        triggerProactiveGeneration(triggeredStage, currentProject);
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
    project: Project
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

      // --- DEVFLOW RULE 3: AI Call Optimization ---
      // Before every AI request, check if the required content already exists.
      // If content exists → do not call Gemini. Keep existing content!
      const existingContent = context.stageContents[targetStage];
      if (existingContent && existingContent.length > 0) {
        console.log(`[ProactiveGen] Development check: Content already exists for ${targetStage}. Skipping AI generation.`);
        return; // Content exists, save the API call.
      }

      addToast(`🧠 Drafting ${targetStage}...`, 'info');

      const output = await agent.generate(context);
      
      // Persist with replaceAll since this is a fresh generation
      const result = await persistAgentOutput(project.id, targetStage, output, { replaceAll: true });

      if (result.success) {

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
