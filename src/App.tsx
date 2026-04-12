import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DictationButton } from './components/DictationButton';
import { HomePage } from './components/HomePage';
import { ProjectDrawer } from './components/ProjectDrawer';
import { FocusMode } from './components/FocusMode';

import { useAutoHydration } from './hooks/useAutoHydration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTranslation } from 'react-i18next';
import { ConnectionErrorPage, NotFoundPage, OfflinePage } from './components/ErrorPages';
import { LoadingPage } from './components/LoadingPage';
import { HelpModal } from './components/HelpModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CanvasErrorBoundary } from './components/ErrorBoundary/CanvasErrorBoundary';
import { FormErrorBoundary } from './components/ErrorBoundary/FormErrorBoundary';
import { SpeechErrorBoundary } from './components/ErrorBoundary/SpeechErrorBoundary';
import { CardSkeleton } from './components/Skeleton';
import { telemetryService, TelemetryStatus } from './services/telemetryService';
import { contextAssembler } from './services/contextAssembler';
import { Check, Wand2, Send, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { cn } from './lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { WorkflowStage } from './types';

// ── Mobile detection hook ─────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

import { useAppAuth } from './hooks/useAppAuth';
import { useProjectData } from './hooks/useProjectData';
import { useProjectSync } from './hooks/useProjectSync';
import { useProjectActions } from './hooks/useProjectActions';
import { useScriptDoctor } from './hooks/useScriptDoctor';
import { useProjectLifecycle } from './hooks/useProjectLifecycle';
import { useStageAnalysis } from './hooks/useStageAnalysis';
import { buildProjectContext } from './services/orchestratorService';
import { useAddSubcollectionDocMutation, useUpdateSubcollectionDocMutation, useDeleteSubcollectionDocMutation, useUpdateProjectMetadataMutation } from './services/firebaseApi';

// ── Lazy-loaded stage components ──────────────────────────────────────────────
// Only the active stage is rendered at a time; load each bundle on first visit.
const BrainstormingStage = React.lazy(() => import('./components/BrainstormingStage').then(m => ({ default: m.BrainstormingStage })));
const LoglineStage       = React.lazy(() => import('./components/LoglineStage').then(m => ({ default: m.LoglineStage })));
const WorkflowStageComponent = React.lazy(() => import('./components/WorkflowStage').then(m => ({ default: m.WorkflowStage })));
const CharacterBible     = React.lazy(() => import('./components/CharacterBible').then(m => ({ default: m.CharacterBible })));
const LocationBible      = React.lazy(() => import('./components/LocationBible').then(m => ({ default: m.LocationBible })));
const MainCanvas         = React.lazy(() => import('./components/MainCanvas').then(m => ({ default: m.MainCanvas })));
const ScriptDoctor       = React.lazy(() => import('./components/ScriptDoctor').then(m => ({ default: m.ScriptDoctor })));

const StageSkeleton = () => <div className="w-full"><CardSkeleton count={3} /></div>;

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

// ── Delete-project modal (extracted to avoid App re-render on input change) ──
interface DeleteModalProps {
  onCancel: () => void;
  onConfirm: (id: string) => void;
  projectId: string;
  isDeleting: boolean;
}
const DeleteProjectModal = React.memo(function DeleteProjectModal({
  onCancel,
  onConfirm,
  projectId,
  isDeleting,
}: DeleteModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-[#212121] rounded-[32px] p-8 shadow-2xl border border-white/10 space-y-6">
        <div className="space-y-2 text-center">
          <h3 className="text-xl font-bold tracking-tight text-white">{t('common.deleteProject', { defaultValue: 'Delete Project' })}</h3>
          <p className="text-white/40 text-sm">{t('common.deleteWarning', { defaultValue: 'This action is permanent. Type "DELETE" to confirm.' })}</p>
        </div>
        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" className="yt-input w-full text-center text-red-500 font-bold tracking-widest" />
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">{t('common.cancel')}</button>
          <button onClick={() => onConfirm(projectId)} disabled={confirmText !== 'DELETE' || isDeleting} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
            {isDeleting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /> : t('common.delete', { defaultValue: 'Delete' })}
          </button>
        </div>
      </motion.div>
    </div>
  );
});

// ── Global AI Bar (extracted to avoid App re-render on input keystrokes) ──────
const GlobalAiBar = React.memo(function GlobalAiBar({ 
  activeStage, 
  isTyping, 
  onAiSubmit,
  isMobile 
}: { 
  activeStage: string; 
  isTyping: boolean; 
  onAiSubmit: (text: string) => void;
  isMobile?: boolean;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const handleSubmit = useCallback(() => {
    if (input.trim()) {
      onAiSubmit(input);
      setInput('');
    }
  }, [input, onAiSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  const handleDictationResult = useCallback((text: string) => {
    setInput(prev => prev + (prev ? ' ' : '') + text);
  }, []);

  if (isMobile) {
    return (
      <div className="px-3 py-2 bg-[#0f0f0f] border-t border-white/5">
        <div className="relative">
          <input 
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('common.askAi', { stage: t(`stages.${activeStage}.label`, { defaultValue: activeStage }) })}
            className="yt-input w-full pr-24 h-11 text-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <SpeechErrorBoundary>
              <DictationButton onResult={handleDictationResult} size="sm" />
            </SpeechErrorBoundary>
            <button 
              onClick={handleSubmit}
              disabled={isTyping || !input.trim()}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5] transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-6 md:px-12 h-24 flex items-center justify-center flex-shrink-0 z-20 pb-4">
      <div className="w-full relative shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-[20px]">
        <input 
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('common.askAi', { stage: t(`stages.${activeStage}.label`, { defaultValue: activeStage }) })}
          className="yt-input w-full pr-28 h-12 text-sm bg-[#1a1a1a]/90 backdrop-blur-md rounded-[20px] border border-white/10 mx-auto block"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <SpeechErrorBoundary>
            <DictationButton onResult={handleDictationResult} size="sm" />
          </SpeechErrorBoundary>
          <button 
            onClick={handleSubmit}
            disabled={isTyping || !input.trim()}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5] transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

const DEFAULT_METADATA = { title: '', format: 'Short Film', genre: '', tone: '', languages: [], targetDuration: '', logline: '' };
const EMPTY_ARRAY: any[] = [];
const NOOP = () => {};

export default function App() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  
  const { user, isAuthReady, isOffline, connectionError } = useAppAuth();
  
  const {
    projects,
    currentProject,
    currentProjectId,
    isProjectLoading,
    isProjectNotFound,
    sequences,
    treatmentSequences,
    scriptScenes,
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives,
    characters,
    locations,
    handleProjectSelect,
    handleProjectExit,
    activeStage,
    setActiveStage,
    handleStageChange
  } = useProjectData(user);

  const [addSubcollectionDoc] = useAddSubcollectionDocMutation();
  const [updateSubcollectionDoc] = useUpdateSubcollectionDocMutation();
  const [deleteSubcollectionDoc] = useDeleteSubcollectionDocMutation();
  const [updateProjectMetadata] = useUpdateProjectMetadataMutation();

  // UI State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusedSequenceId, setFocusedSequenceId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastUpdatedPrimitiveId, setLastUpdatedPrimitiveId] = useState<string | null>(null);
  const [telemetryStatus, setTelemetryStatus] = useState<TelemetryStatus | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    highContrast: false,
    largeText: false,
    reducedMotion: false
  });
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(() => !localStorage.getItem('scenaria_onboarded'));

  // Memoized user collaborators
  const collaborators = useMemo(() => user ? [{ id: user.uid, name: user.displayName || 'You', photoURL: user.photoURL || '', isActive: true }] : EMPTY_ARRAY, [user]);

  useEffect(() => {
    telemetryService.onStatusChange((status) => {
      setTelemetryStatus(status);
    });
  }, []);

  // Sync accessibility settings to body classes
  useEffect(() => {
    const { highContrast, largeText, reducedMotion } = accessibilitySettings;
    document.body.classList.toggle('accessibility-high-contrast', highContrast);
    document.body.classList.toggle('accessibility-large-text', largeText);
    document.body.classList.toggle('accessibility-reduced-motion', reducedMotion);
  }, [accessibilitySettings]);

  useEffect(() => {
    const abortController = new AbortController();
    if (currentProjectId) {
      contextAssembler.hydrateFullIdMap(currentProjectId).catch(err => {
        if (!abortController.signal.aborted) {
          console.warn('Initial ID-Map hydration failed:', err);
        }
      });
    } else {
      telemetryService.invalidateAll();
    }
    return () => { abortController.abort(); };
  }, [currentProjectId]);

  const MAX_TOASTS = 3;
  const addToast = useCallback((message: string, type: Toast['type'] = 'info', action?: any) => {
    const id = Date.now().toString();
    setToasts(prev => {
      const newToasts = [...prev, { id, message, type, action }];
      if (newToasts.length > MAX_TOASTS) {
        return newToasts.slice(newToasts.length - MAX_TOASTS);
      }
      return newToasts;
    });
    
    const timeoutDuration = type === 'error' ? 15000 : 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, timeoutDuration);
  }, []);

  const { syncStatus, setSyncStatus, handleContentUpdate, handleSubcollectionUpdate } = useProjectSync(currentProject, addToast);

  // Use separated analysis hook to avoid cyclic dependency
  const { handleStageAnalyze: handleStageAnalyzeInternal } = useStageAnalysis();
  const handleStageAnalyze = useCallback((stage: any) => {
    return handleStageAnalyzeInternal(currentProject, stage, setIsTyping);
  }, [handleStageAnalyzeInternal, currentProject, setIsTyping]);

  const {
    isDoctorOpen,
    setIsDoctorOpen,
    doctorMessages,
    setDoctorMessages,
    isDoctorTyping,
    isHeavyThinking,
    activeTool,
    aiStatus,
    handleDoctorMessage,
  } = useScriptDoctor({
    currentProject,
    activeStage,
    sequences,
    treatmentSequences,
    scriptScenes,
    pitchPrimitives,
    characters,
    locations,
    addToast,
    setRefiningBlockId,
    setLastUpdatedPrimitiveId,
    handleStageAnalyze,
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
    synopsisPrimitives,
  });

  const hydrationState = useAutoHydration({
    activeStage,
    currentProject,
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives,
    characters,
    locations,
    sequences,
    treatmentSequences,
    scriptScenes,
    addToast,
    onStageAnalyze: handleStageAnalyze,
  });

  // ── Build ProjectContext from live data for proactive ghost generation ──────
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
    setIsHeavyThinking: NOOP, 
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
    setDeleteConfirmText: NOOP, // owned by DeleteProjectModal now
    hydrationState,
    getProjectContext
  });

  // ── Memoized callbacks ───────────────────────────────────────────────────────
  const handleMetadataUpdate = useCallback(async (metadata: any) => {
    if (!currentProject) return;
    setSyncStatus('syncing');
    try {
      await updateProjectMetadata({ id: currentProject.id, metadata }).unwrap();
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setSyncStatus('error');
    }
  }, [currentProject, updateProjectMetadata, setSyncStatus]);

  const handleOpenDoctor = useCallback(() => setIsDoctorOpen(true), [setIsDoctorOpen]);
  const handleToggleDoctor = useCallback(() => setIsDoctorOpen(p => !p), [setIsDoctorOpen]);
  const handleCloseDoctor = useCallback(() => setIsDoctorOpen(false), [setIsDoctorOpen]);
  const handleOpenDrawer = useCallback(() => setIsProjectDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsProjectDrawerOpen(false), []);
  const handleCloseFocus = useCallback(() => setIsFocusMode(false), []);
  const handleOpenDeleteModal = useCallback((id: string) => setProjectToDelete(id), []);
  const handleCancelDelete = useCallback(() => setProjectToDelete(null), []);

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useKeyboardShortcuts({
    onProjectSwitch: handleProjectExit,
    onDoctorToggle: handleToggleDoctor,
    onStageChange: handleStageChange,
    activeStage,
    stages: ['Brainstorming', 'Logline', '3-Act Structure', 'Synopsis', 'Character Bible', 'Location Bible', 'Treatment', 'Step Outline', 'Script', 'Storyboard'] as WorkflowStage[],
    onShowHelp: () => setIsHelpOpen(true)
  });

  const handleFocusMode = useCallback((id: string) => {
    setFocusedSequenceId(id);
    setIsFocusMode(true);
  }, []);

  const handleDeleteCurrentProject = useCallback(() => {
    if (currentProject) handleOpenDeleteModal(currentProject.id);
  }, [currentProject, handleOpenDeleteModal]);

  const handleHomePageProjectSelect = useCallback((id: string) => {
    handleProjectSelect(id, projects.find(p => p.id === id));
  }, [handleProjectSelect, projects]);

  const onLoglineChange = useCallback((c: string) => {
    const id = loglinePrimitives[0]?.id;
    if (id) {
       handleSubcollectionUpdate('logline_primitives', id, c);
    }
  }, [loglinePrimitives, handleSubcollectionUpdate]);

  const onRefineLogline = useCallback((f: string) => handleStageRefine('Logline', f), [handleStageRefine]);
  const onContentChange3Act = useCallback((c: string) => {
    const id = structurePrimitives[0]?.id;
    if (id && structurePrimitives.length === 1) handleSubcollectionUpdate('structure_primitives', id, c);
  }, [structurePrimitives, handleSubcollectionUpdate]);
  const onRefine3Act = useCallback((f: string, blockId?: string) => handleStageRefine('3-Act Structure', f, blockId), [handleStageRefine]);
  const onRegenerate3Act = useCallback(() => handleRegenerate('3-Act Structure'), [handleRegenerate]);

  const onContentChangeSynopsis = useCallback((c: string) => {
    const id = synopsisPrimitives[0]?.id;
    if (id) handleSubcollectionUpdate('synopsis_primitives', id, c);
  }, [synopsisPrimitives, handleSubcollectionUpdate]);
  const onRefineSynopsis = useCallback((f: string, blockId?: string) => handleStageRefine('Synopsis', f, blockId), [handleStageRefine]);
  const onRegenerateSynopsis = useCallback(() => handleRegenerate('Synopsis'), [handleRegenerate]);

  const onContentChangeTreatment = useCallback((c: string) => handleContentUpdate('treatmentDraft', c), [handleContentUpdate]);
  const onItemChangeTreatment = useCallback((id: string, content: string) => handleSubcollectionUpdate('treatment_sequences', id, content), [handleSubcollectionUpdate]);
  const onRefineTreatment = useCallback((f: string, blockId?: string) => handleStageRefine('Treatment', f, blockId), [handleStageRefine]);
  const onRegenerateTreatment = useCallback(() => handleRegenerate('Treatment'), [handleRegenerate]);

  const onContentChangeScript = useCallback((c: string) => handleContentUpdate('scriptDraft', c), [handleContentUpdate]);
  const onItemChangeScript = useCallback((id: string, content: string) => handleSubcollectionUpdate('script_scenes', id, content), [handleSubcollectionUpdate]);
  const onRefineScript = useCallback((f: string, blockId?: string) => handleStageRefine('Script', f, blockId), [handleStageRefine]);
  const onRegenerateScript = useCallback(() => handleRegenerate('Script'), [handleRegenerate]);

  const handleGlobalAiSubmit = useCallback((text: string) => {
    setIsDoctorOpen(true);
    handleDoctorMessage(text);
  }, [handleDoctorMessage, setIsDoctorOpen]);

  const handleStoryChange = useCallback((c: string) => {
    const pitchId = pitchPrimitives.find(p => p.order === 1)?.id;
    if (pitchId) handleSubcollectionUpdate('pitch_primitives', pitchId, c);
    handleContentUpdate('pitch_result', c);
  }, [pitchPrimitives, handleSubcollectionUpdate, handleContentUpdate]);

  const handleCharacterAdd = useCallback(async (name: string, description: string, tier: any) => {
    if (!currentProject) return;
    try {
      await addSubcollectionDoc({ projectId: currentProject.id, collectionName: 'characters', data: { name, description, tier } }).unwrap();
      addToast(t('common.characterAdded'), 'success');
    } catch (e) {
      addToast('Failed to add character', 'error');
    }
  }, [currentProject, addSubcollectionDoc, addToast, t]);

  const handleCharacterUpdate = useCallback(async (id: string, updates: any) => {
    if (!currentProject) return;
    await updateSubcollectionDoc({ projectId: currentProject.id, collectionName: 'characters', docId: id, data: updates }).unwrap();
  }, [currentProject, updateSubcollectionDoc]);

  const handleCharacterDelete = useCallback(async (id: string) => {
    if (!currentProject) return;
    await deleteSubcollectionDoc({ projectId: currentProject.id, collectionName: 'characters', docId: id }).unwrap();
    addToast(t('common.characterDeleted'), 'info');
  }, [currentProject, deleteSubcollectionDoc, addToast, t]);

  const handleLocationAdd = useCallback(async (name: string, description: string) => {
    if (!currentProject) return;
    try {
      await addSubcollectionDoc({ projectId: currentProject.id, collectionName: 'locations', data: { name, description } }).unwrap();
      addToast(t('common.locationAdded'), 'success');
    } catch (e) {
      addToast('Failed to add location', 'error');
    }
  }, [currentProject, addSubcollectionDoc, addToast, t]);

  const handleLocationUpdate = useCallback(async (id: string, updates: any) => {
    if (!currentProject) return;
    await updateSubcollectionDoc({ projectId: currentProject.id, collectionName: 'locations', docId: id, data: updates }).unwrap();
  }, [currentProject, updateSubcollectionDoc]);

  const handleLocationDelete = useCallback(async (id: string) => {
    if (!currentProject) return;
    await deleteSubcollectionDoc({ projectId: currentProject.id, collectionName: 'locations', docId: id }).unwrap();
    addToast(t('common.locationDeleted'), 'info');
  }, [currentProject, deleteSubcollectionDoc, addToast, t]);

  // ── Stage validate / refine stable refs ─────────────────────────────────────
  const onValidateBrainstorming   = useCallback(() => handleStageValidate('Brainstorming'), [handleStageValidate]);
  const onValidateLogline         = useCallback(() => handleStageValidate('Logline'), [handleStageValidate]);
  const onValidate3Act            = useCallback(() => handleStageValidate('3-Act Structure'), [handleStageValidate]);
  const onValidateSynopsis        = useCallback(() => handleStageValidate('Synopsis'), [handleStageValidate]);
  const onValidateCharacterBible  = useCallback(() => handleStageValidate('Character Bible'), [handleStageValidate]);
  const onValidateLocationBible   = useCallback(() => handleStageValidate('Location Bible'), [handleStageValidate]);
  const onValidateTreatment       = useCallback(() => handleStageValidate('Treatment'), [handleStageValidate]);
  const onValidateStepOutline     = useCallback(() => handleStageValidate('Step Outline'), [handleStageValidate]);
  const onValidateScript          = useCallback(() => handleStageValidate('Script'), [handleStageValidate]);
  const onValidateStoryboard      = useCallback(() => handleStageValidate('Storyboard'), [handleStageValidate]);

  // ── Auth / loading gates ─────────────────────────────────────────────────────
  if (!isAuthReady) return <LoadingPage />;
  if (isOffline) return <OfflinePage onRetry={() => window.location.reload()} />;
  if (connectionError) return <ConnectionErrorPage onRetry={() => window.location.reload()} />;
  if (isProjectNotFound) return <NotFoundPage onBackHome={handleProjectExit} />;

  if (!user) {
    const signInWithGoogle = async () => {
      const { signInWithGoogle: signIn } = await import('./lib/firebase');
      signIn();
    };
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="glass p-12 rounded-[40px] text-center space-y-8 max-w-md w-full">
          <img src="/logo.png" alt="ScénarIA" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-4xl font-bold tracking-tighter italic">ScénarIA</h1>
          <p className="text-white/40 text-sm">{t('common.signIn')}</p>
          <button 
            onClick={signInWithGoogle}
            className="w-full py-4 rounded-2xl bg-white text-black font-bold tracking-tight hover:scale-105 transition-all"
          >
            {t('common.signInWithGoogle')}
          </button>
        </div>
      </div>
    );
  }

  if (isProjectLoading || (currentProjectId && !currentProject)) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
        <div className="relative flex flex-col items-center space-y-8 text-center max-w-sm">
          <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="w-16 h-16 relative">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-white rounded-full animate-spin" />
            <div className="absolute inset-0 blur-xl bg-white/20 rounded-full animate-pulse" />
          </motion.div>
          <div className="space-y-2">
            <img src="/logo.png" alt="ScénarIA" className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <h2 className="text-2xl font-bold text-white tracking-tighter italic">ScénarIA</h2>
            <p className="text-secondary text-sm font-medium tracking-tight animate-pulse">Hydrating project snapshot...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isProjectLoading) {
    return <LoadingPage />;
  }

  if (!currentProject) {
    return (
      <HomePage 
        projects={projects} 
        onProjectCreate={handleProjectCreate}
        onProjectSelect={handleHomePageProjectSelect}
        onProjectDelete={handleOpenDeleteModal}
      />
    );
  }

  const focusedSequence = sequences.find(s => s.id === focusedSequenceId);

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-background overflow-hidden relative font-sans">
      {/* ── DESKTOP: floating sidebar + doctor FAB ─────────────────────────── */}
      {!isMobile && (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
          <div className="pointer-events-auto absolute left-6 top-1/2 -translate-y-1/2 h-[85vh] w-20 hover:w-64 group bg-[#111]/90 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-300 z-[60]">
            <Sidebar activeStage={activeStage} onStageChange={handleStageChange} validatedStages={currentProject.validatedStages || EMPTY_ARRAY} isVisible={true} />
          </div>
          <div className={cn("pointer-events-auto absolute bottom-6 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]", isDoctorOpen ? "right-[-100px] opacity-0 scale-50" : "right-6 opacity-100 scale-100")}>
            {!isFocusMode && (
              <button onClick={handleOpenDoctor} className="w-16 h-16 rounded-full bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group">
                <span className="text-xl font-bold italic tracking-tighter group-hover:scale-110 transition-transform">Dr</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main content column ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full relative transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10 min-w-0">
        <Header 
          projectName={currentProject?.metadata?.title || 'Untitled'} 
          onProjectSwitch={handleProjectExit} 
          onCallStart={NOOP}
          onInfoClick={() => setIsHelpOpen(true)}
          onDoctorToggle={handleToggleDoctor}
          isDoctorOpen={isDoctorOpen}
          syncStatus={syncStatus}
          collaborators={collaborators}
          isCompact={isDoctorOpen}
          accessibilitySettings={accessibilitySettings}
          onAccessibilityChange={setAccessibilitySettings}
        />

        <FormErrorBoundary>
          <ProjectDrawer 
            isOpen={isProjectDrawerOpen}
            onClose={handleCloseDrawer}
            metadata={currentProject.metadata || DEFAULT_METADATA}
            onUpdate={handleMetadataUpdate}
            onDelete={handleDeleteCurrentProject}
          />
        </FormErrorBoundary>

        <div className="flex-1 flex flex-col relative overflow-hidden items-center justify-center w-full">
          <div className={cn("w-full flex-1 overflow-y-auto no-scrollbar scroll-smooth relative", isMobile && "pb-safe-nav")}>
            <div className={cn("w-full max-w-4xl mx-auto min-h-full flex flex-col justify-start relative", isMobile ? "px-4 py-6" : "px-6 py-12 md:px-12")}>
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 mb-8 text-xs font-medium text-white/40 uppercase tracking-widest" aria-label="Breadcrumb">
                <span className="hover:text-white cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus:outline-none" tabIndex={0} onClick={handleProjectExit}>Home</span>
                <ChevronRight className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{currentProject.metadata?.title || 'Untitled'}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white bg-white/10 px-2 py-1 rounded-md">{t(`stages.${activeStage}.label`, { defaultValue: activeStage })}</span>
              </div>
              
              <Suspense fallback={<StageSkeleton />}>
                {activeStage === 'Brainstorming' ? (
                  <BrainstormingStage
                    analysis={pitchPrimitives.find(p => p.order === 2)?.content || ''}
                    story={pitchPrimitives.find(p => p.order === 1)?.content || ''}
                    onStoryChange={handleStoryChange}
                    onValidate={onValidateBrainstorming}
                    onDoctorToggle={handleToggleDoctor}
                    isGenerating={isTyping}
                    insight={currentProject.stageAnalyses?.['Brainstorming']}
                  />
                ) : activeStage === 'Logline' ? (
                  <LoglineStage
                    content={loglinePrimitives[0]?.content || ''}
                    onContentChange={onLoglineChange}
                    onValidate={onValidateLogline}
                    onRefine={onRefineLogline}
                    isGenerating={isTyping}
                    insight={currentProject.stageAnalyses?.['Logline']}
                  />
                ) : activeStage === '3-Act Structure' ? (
                  <WorkflowStageComponent
                    stage="3-Act Structure" step={3} title={t('stages.3-Act Structure.title')} subtitle={t('stages.3-Act Structure.subtitle')}
                    content={structurePrimitives.length === 1 ? structurePrimitives[0].content : ''} 
                    items={structurePrimitives.length > 1 ? structurePrimitives : undefined}
                    onContentChange={onContentChange3Act} 
                    onItemChange={(id, content) => handleSubcollectionUpdate('structure_primitives', id, content)}
                    onValidate={onValidate3Act} onRefine={onRefine3Act}
                    onRegenerate={onRegenerate3Act}
                    isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === '3-Act Structure')}
                    isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === '3-Act Structure'}
                    hydrationLabel={hydrationState.hydratingStage === '3-Act Structure' ? hydrationState.hydratingLabel : undefined}
                    refiningBlockId={refiningBlockId} validateLabel={t('stages.3-Act Structure.validateLabel')}
                    lastUpdatedPrimitiveId={lastUpdatedPrimitiveId} insight={currentProject.stageAnalyses?.['3-Act Structure']}
                  />
                ) : activeStage === 'Synopsis' ? (
                  <WorkflowStageComponent
                    stage="Synopsis" step={4} title={t('stages.Synopsis.title')} subtitle={t('stages.Synopsis.subtitle')}
                    content={synopsisPrimitives[0]?.content || ''} 
                    onContentChange={onContentChangeSynopsis}
                    onValidate={onValidateSynopsis} onRefine={onRefineSynopsis}
                    onRegenerate={onRegenerateSynopsis}
                    isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === 'Synopsis')}
                    isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === 'Synopsis'}
                    hydrationLabel={hydrationState.hydratingStage === 'Synopsis' ? hydrationState.hydratingLabel : undefined}
                    refiningBlockId={refiningBlockId} validateLabel={t('stages.Synopsis.validateLabel')}
                    lastUpdatedPrimitiveId={lastUpdatedPrimitiveId} insight={currentProject.stageAnalyses?.['Synopsis']}
                  />
                ) : activeStage === 'Character Bible' ? (
                  <CharacterBible 
                    characters={characters}
                    onCharacterAdd={handleCharacterAdd}
                    onCharacterUpdate={handleCharacterUpdate}
                    onCharacterDelete={handleCharacterDelete}
                    onGenerateViews={handleGenerateViews} onDeepDevelop={handleCharacterDeepDevelop} isGenerating={isTyping} refiningBlockId={refiningBlockId}
                    onValidate={onValidateCharacterBible} lastUpdatedPrimitiveId={lastUpdatedPrimitiveId} insight={currentProject.stageAnalyses?.['Character Bible']}
                  />
                ) : activeStage === 'Location Bible' ? (
                  <LocationBible 
                    locations={locations}
                    onLocationAdd={handleLocationAdd}
                    onLocationUpdate={handleLocationUpdate}
                    onLocationDelete={handleLocationDelete}
                    onGenerateViews={handleGenerateViews} onDeepDevelop={handleLocationDeepDevelop} isGenerating={isTyping} refiningBlockId={refiningBlockId}
                    onValidate={onValidateLocationBible} lastUpdatedPrimitiveId={lastUpdatedPrimitiveId} insight={currentProject.stageAnalyses?.['Location Bible']}
                  />
                ) : activeStage === 'Treatment' ? (
                  <WorkflowStageComponent
                    stage="Treatment" step={7} title={t('stages.Treatment.title')} subtitle={t('stages.Treatment.subtitle')}
                    content={treatmentSequences[0]?.content || ''} items={treatmentSequences}
                    onContentChange={onContentChangeTreatment} onItemChange={onItemChangeTreatment}
                    onValidate={onValidateTreatment} onRefine={onRefineTreatment}
                    onRegenerate={onRegenerateTreatment}
                    isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === 'Treatment')}
                    isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === 'Treatment'}
                    hydrationLabel={hydrationState.hydratingStage === 'Treatment' ? hydrationState.hydratingLabel : undefined}
                    refiningBlockId={refiningBlockId} validateLabel={t('stages.Treatment.validateLabel')}
                    lastUpdatedPrimitiveId={lastUpdatedPrimitiveId} insight={currentProject.stageAnalyses?.['Treatment']}
                  />
                ) : activeStage === 'Step Outline' ? (
                  <CanvasErrorBoundary>
                    <MainCanvas 
                      sequences={sequences} onSequenceUpdate={handleSequenceUpdate} onSequenceAdd={handleSequenceAdd}
                      onFocusMode={handleFocusMode}
                      onAiMagic={handleAiMagic} onTts={NOOP} onValidate={onValidateStepOutline}
                      isGenerating={isTyping} refiningBlockId={refiningBlockId} insight={currentProject.stageAnalyses?.['Step Outline']}
                    />
                  </CanvasErrorBoundary>
                ) : activeStage === 'Script' ? (
                  <WorkflowStageComponent
                    stage="Script" step={9} title={t('stages.Script.title')} subtitle={t('stages.Script.subtitle')}
                    content={scriptScenes[0]?.content || ''} items={scriptScenes}
                    onContentChange={onContentChangeScript} onItemChange={onItemChangeScript}
                    onValidate={onValidateScript} onRefine={onRefineScript}
                    onRegenerate={onRegenerateScript}
                    isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === 'Script')}
                    isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === 'Script'}
                    hydrationLabel={hydrationState.hydratingStage === 'Script' ? hydrationState.hydratingLabel : undefined}
                    refiningBlockId={refiningBlockId} validateLabel={t('stages.Script.validateLabel')}
                    lastUpdatedPrimitiveId={lastUpdatedPrimitiveId} insight={currentProject.stageAnalyses?.['Script']}
                  />
                ) : activeStage === 'Storyboard' ? (
                  <div className="w-full space-y-12 py-24 flex flex-col items-center justify-center text-center">
                    <div className="max-w-2xl space-y-8">
                      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8">
                        <ImageIcon className="w-12 h-12 text-white/20" />
                      </div>
                      <h2 className="text-4xl font-bold tracking-tighter text-white">{t('stages.Storyboard.title')}</h2>
                      <p className="text-secondary text-lg">{t('stages.Storyboard.subtitle')}</p>
                      <div className="bg-surface p-8 rounded-[32px] border border-white/5">
                        <p className="text-white/40 font-medium">{t('stages.Storyboard.comingSoon')}</p>
                      </div>
                      <button onClick={onValidateStoryboard} className="px-12 py-5 rounded-2xl bg-[#2a2a2a] text-white border border-[#444444] font-bold tracking-tight hover:bg-[#333333] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-2xl mx-auto">
                        <Check className="w-5 h-5" />
                        {t('common.completeProject')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white/20">{t('common.selectStage')}</div>
                )}
              </Suspense>
            </div>
          </div>
          
          {/* On desktop: floating AI bar; on mobile: see bottom bar below */}
          {!isMobile && (
            <GlobalAiBar 
              activeStage={activeStage} 
              isTyping={isTyping} 
              onAiSubmit={handleGlobalAiSubmit} 
            />
          )}
        </div>
      </div>

      {/* ── DESKTOP: Script Doctor side panel ─────────────────────────────── */}
      {!isMobile && (
        <div className={cn("h-full border-l border-white/5 bg-[#212121] z-40 flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden relative", isDoctorOpen ? "w-[30%] min-w-[350px] max-w-[450px]" : "w-0 min-w-0 border-none")}>
          <div className="absolute right-0 top-0 w-[30vw] min-w-[350px] max-w-[450px] h-full">
            <Suspense fallback={<div className="h-full flex items-center justify-center text-white/20">Loading Script Doctor...</div>}>
              <ScriptDoctor 
                isOpen={isDoctorOpen} onClose={handleCloseDoctor} messages={doctorMessages} onSendMessage={handleDoctorMessage}
                isTyping={isDoctorTyping} isHeavyThinking={isHeavyThinking} aiStatus={aiStatus} activeStage={activeStage} activeTool={activeTool}
                projectLanguages={currentProject.metadata?.languages} telemetryStatus={telemetryStatus}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* ── MOBILE: Script Doctor as bottom sheet ─────────────────────────── */}
      {isMobile && (
        <Suspense fallback={null}>
          <ScriptDoctor 
            isOpen={isDoctorOpen} onClose={handleCloseDoctor} messages={doctorMessages} onSendMessage={handleDoctorMessage}
            isTyping={isDoctorTyping} isHeavyThinking={isHeavyThinking} aiStatus={aiStatus} activeStage={activeStage} activeTool={activeTool}
            projectLanguages={currentProject.metadata?.languages} telemetryStatus={telemetryStatus}
          />
        </Suspense>
      )}

      {/* ── MOBILE: Bottom navigation bar ─────────────────────────────────── */}
      {isMobile && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5 flex flex-col"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* AI bar above bottom nav */}
          <GlobalAiBar 
            activeStage={activeStage} 
            isTyping={isTyping} 
            onAiSubmit={handleGlobalAiSubmit}
            isMobile={true}
          />
          {/* Stage tabs */}
          <div className="h-16">
            <Sidebar
              activeStage={activeStage}
              onStageChange={handleStageChange}
              validatedStages={currentProject.validatedStages || EMPTY_ARRAY}
              isVisible={true}
              variant="bottom-nav"
            />
          </div>
        </div>
      )}

      <FocusMode 
        isOpen={isFocusMode} onClose={handleCloseFocus} title={focusedSequence?.title || ''} content={focusedSequence?.content || ''}
        onContentChange={(content) => focusedSequenceId && handleSequenceUpdate(focusedSequenceId, { content })}
        onAiMagic={() => focusedSequenceId && handleAiMagic(focusedSequenceId)} onTts={NOOP} isGenerating={isTyping}
      />

      <AnimatePresence>
        {projectToDelete && (
          <DeleteProjectModal
            projectId={projectToDelete}
            isDeleting={isDeleting}
            onCancel={handleCancelDelete}
            onConfirm={handleProjectDelete}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-32 right-8 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.9 }} className={cn("px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px]", toast.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" : toast.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/10 text-white")}>
              {toast.type === 'success' ? <Check className="w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
              <div className="flex flex-col gap-1 items-start">
                <p className="text-sm font-medium tracking-tight">{toast.message}</p>
                {toast.action && (
                  <button onClick={() => { toast.action?.onClick(); setToasts(p => p.filter(t => t.id !== toast.id)); }} className="text-xs font-bold underline opacity-80 hover:opacity-100 transition-opacity">
                    {toast.action.label}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {((isTyping && !refiningBlockId) || (hydrationState.isHydrating && !refiningBlockId)) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0f0f0f]/80 backdrop-blur-sm z-[90] flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold tracking-tight text-white">
                {hydrationState.isHydrating ? (hydrationState.hydratingLabel || 'Auto-generating content...') : isHeavyThinking ? (activeStage === 'Treatment' ? "Structuring narrative primitives..." : "The AI Architect is crafting your project using the Pro engine.") : t('common.aiWorking')}
              </h3>
              <p className="text-secondary text-sm">
                {hydrationState.isHydrating ? "The AI Architect is analyzing validated stages and generating content..." : isHeavyThinking ? "This may take a moment..." : t('common.aiWorkingDesc')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <HelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
      />
      
      <AnimatePresence>
        {isFirstTime && (
          <OnboardingWizard onComplete={() => {
            setIsFirstTime(false);
            localStorage.setItem('scenaria_onboarded', 'true');
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}
