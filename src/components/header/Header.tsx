import React, { useState, useCallback } from 'react';
import { 
  ChevronRight, 
  RefreshCw,
  Info,
  Accessibility,
  Search,
  Users,
  Sparkles,
  Check,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '@/contexts/ProjectContext';
import { triggerHaptic } from '@/lib/haptics';

// Sub-components
import { AccessibilityMenu } from './AccessibilityMenu';
import { ProjectHistorySidebar } from './ProjectHistorySidebar';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface HeaderProps {
  isCompact?: boolean;
  accessibilitySettings: { highContrast: boolean; largeText: boolean; reducedMotion: boolean };
  onAccessibilityChange: (settings: HeaderProps['accessibilitySettings']) => void;
  onSettingsClick: () => void;
  onInfoClick: () => void;
  onTitleClick: () => void;
  isTitleOpen: boolean;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (v: boolean) => void;
  user: {
    displayName: string | null;
    photoURL: string | null;
  } | null;
}

export function Header({ 
  isCompact,
  accessibilitySettings,
  onAccessibilityChange,
  onSettingsClick,
  onInfoClick,
  onTitleClick,
  isTitleOpen,
  isHistoryOpen,
  setIsHistoryOpen,
  user
}: HeaderProps) {
  const project = useProject();
  const { 
    currentProject, 
    projects: projectHistory, 
    handleProjectSelect: onProjectSelect, 
    handleProjectExit: onNewStory,
    syncStatus 
  } = project;

  const projectName = currentProject?.metadata?.title || "Untitled";
  const currentProjectId = currentProject?.id || "";
  const { t } = useTranslation();
  
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const {
    activeStage,
    handleStageValidate,
    handleStageAnalyze,
    isTyping,
    hydrationState
  } = project;

  const insight = currentProject?.stageAnalyses?.[activeStage];
  const isReady = insight
    ? ('isReady' in insight ? (insight as any).isReady : (('issues' in insight && (insight as any).issues) ? (insight as any).issues.length === 0 : false))
    : false;

  const isGenerating = isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === activeStage);

  const handleVerifier = async () => {
    setIsValidating(true);
    triggerHaptic('light');
    try {
      await handleStageAnalyze(activeStage);
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = () => {
    triggerHaptic('medium');
    setShowConfirmModal(true);
  };

  const toggleAccess = useCallback((key: keyof typeof accessibilitySettings) => {
    onAccessibilityChange({
      ...accessibilitySettings,
      [key]: !accessibilitySettings[key]
    });
  }, [accessibilitySettings, onAccessibilityChange]);

  return (
    <>
      <header 
        className={cn(
          "bg-background/80 backdrop-blur-md border-b border-white/5 z-50 transition-all duration-500 flex-shrink-0 w-full overflow-hidden"
        )}
        style={{ paddingTop: 'var(--header-top-padding)' }}
      >
        <div className={cn(
          "flex items-center justify-between px-4 md:px-6 w-full relative",
          isCompact ? "h-14 md:h-14" : "h-14 md:h-16"
        )}>
          {/* Left — Logo + Project name */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {/* Burger Menu for Mobile */}
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="md:hidden w-10 h-10 -ml-2 rounded-full hover:bg-white/5 transition-all flex items-center justify-center border-none flex-shrink-0"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="h-[2px] w-5 rounded-full bg-white/80" />
                <span className="h-[2px] w-3 rounded-full bg-white/80" />
              </div>
            </button>

            {!currentProject ? (
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity border-none bg-transparent p-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl font-medium tracking-tight text-white/90">S C E N A R I A</span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-4 min-w-0">
                  <button onClick={onTitleClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity border-none bg-transparent p-0 text-left group/title">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold tracking-tight text-white truncate max-w-[120px] md:max-w-[200px]">{projectName}</span>
                      <ChevronRight className={cn("w-3.5 h-3.5 text-white/30 flex-shrink-0 transition-transform duration-300", isTitleOpen && "rotate-90 text-white")} />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
            {!currentProject && (
              <button className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#004a77]/30 text-[#c2e7ff] text-[14px] font-medium hover:bg-[#004a77]/50 transition-all border-none">
                <Sparkles className="w-4 h-4" />
                <span>Passez à S C E N A R I A Pro</span>
              </button>
            )}

            {currentProject && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <RefreshCw className={cn("w-3.5 h-3.5", syncStatus === 'syncing' ? "animate-spin text-white" : "text-white/20")} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/20">
                  {syncStatus === 'synced' ? 'Synchronisé' : 'Sync...'}
                </span>
              </div>
            )}

            {/* Mobile Actions */}
            {currentProject && (
              <div className="flex md:hidden items-center gap-2">
                <button
                  onClick={handleVerifier}
                  disabled={isValidating || isGenerating}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95 disabled:opacity-50",
                    isReady 
                      ? "bg-green-500/10 text-green-400 border-green-500/20" 
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}
                >
                  {isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isReady ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleNext}
                  disabled={isGenerating}
                  className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-bold active:scale-95 disabled:opacity-50"
                >
                  {t('common.next', { defaultValue: 'Next' })}
                </button>
              </div>
            )}

            <button 
              className="hidden md:flex w-10 h-10 rounded-full hover:bg-white/5 items-center justify-center transition-all border-none text-white/70"
            >
              <div className="grid grid-cols-2 gap-0.5 opacity-60">
                <div className="w-1.5 h-1.5 rounded-[1px] border border-current" />
                <div className="w-1.5 h-1.5 rounded-[1px] border border-current" />
                <div className="w-1.5 h-1.5 rounded-[1px] border border-current" />
                <div className="w-1.5 h-1.5 rounded-[1px] border border-current" />
              </div>
            </button>

            <button 
              onClick={onSettingsClick}
              className="hidden md:flex w-8 h-8 rounded-full border-none items-center justify-center hover:opacity-90 transition-all overflow-hidden"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-500 to-blue-500">
                  <span className="text-xs font-bold text-white">
                    {user?.displayName?.[0] || 'U'}
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          handleStageValidate(activeStage);
          setShowConfirmModal(false);
        }}
        title={isReady ? t('common.continuePrompt', { defaultValue: 'Continuer ?' }) : t('common.nextStepPrompt', { defaultValue: 'Passer à l\'étape suivante ?' })}
        description={
          <>
            {!isReady && <span className="text-amber-500/80 block mb-2">{t('common.notValidatedYet', { defaultValue: "Note : Cette étape n'a pas encore été validée." })}</span>}
            {t('common.lockStageDescription', { 
              defaultValue: "Cette action verrouille l'étape {{stage}} et génère la prochaine.",
              stage: t(`stages.${activeStage}.label`, { defaultValue: activeStage })
            })}
          </>
        }
        confirmLabel={isReady ? t('common.continue', { defaultValue: 'Continuer' }) : t('common.continueAnyway', { defaultValue: 'Continuer quand même' })}
      />
    </>
  );
}
