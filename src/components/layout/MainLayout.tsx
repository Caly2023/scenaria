import React, { Suspense, useState, useEffect, useRef } from 'react';

import { AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  Toast,
} from '../../types';
import { Sidebar } from './sidebar/Sidebar';
import { Header } from '../header/Header';
import { ProjectDrawer } from '../project-drawer/ProjectDrawer';
import { SettingsDrawer } from '../settings/SettingsDrawer';
import { HelpModal } from './HelpModal';
import { OnboardingWizard } from './OnboardingWizard';
import { OrbitingLoader } from '../ui/OrbitingLoader';
import { FormErrorBoundary } from '../ui/FormErrorBoundary';
import { StageSkeleton } from '../stages/StageSkeleton';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useProject } from '../../contexts/ProjectContext';
import { ToastManager } from '../ui/ToastManager';
import { GlobalOverlay } from '../ui/GlobalOverlay';
import { ProjectHistorySidebar } from '../header/ProjectHistorySidebar';

// Sub-components
import { ScriptDoctorFAB } from './ScriptDoctorFAB';

type AccessibilitySettings = {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
};

interface MainLayoutProps {
  user: any;
  isMobile: boolean;
  isProjectDrawerOpen: boolean;
  isSettingsDrawerOpen: boolean;
  isHelpOpen: boolean;
  isFirstTime: boolean;
  toasts: Toast[];
  accessibilitySettings: AccessibilitySettings;
  handleOpenDrawer: () => void;
  handleCloseDrawer: () => void;
  handleOpenSettings: () => void;
  handleCloseSettings: () => void;
  setAccessibilitySettings: (s: AccessibilitySettings) => void;
  setIsHelpOpen: (v: boolean) => void;
  setIsFirstTime: (v: boolean) => void;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  handleLanguageChange: (language: string) => void;
  handleThemeChange: (theme: 'dark' | 'light' | 'system') => void;
  handleProfileSave: (profile: { displayName: string; photoURL: string }) => Promise<void>;
  handleLogout: () => Promise<void>;
  theme: 'dark' | 'light' | 'system';
  language: string;
  renderStage: () => React.ReactNode;
  ScriptDoctor: React.ComponentType<any>;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (v: boolean) => void;
}

const MainLayoutComponent = ({
  user, isMobile, isProjectDrawerOpen, isSettingsDrawerOpen, isHelpOpen, isFirstTime, toasts, accessibilitySettings,
  handleOpenDrawer, handleCloseDrawer, handleOpenSettings, handleCloseSettings, setAccessibilitySettings, setIsHelpOpen, setIsFirstTime, setToasts,
  handleLanguageChange, handleThemeChange, handleProfileSave, handleLogout, theme, language,
  renderStage, ScriptDoctor, isHistoryOpen, setIsHistoryOpen
}: MainLayoutProps) => {
  const project = useProject();
  const {
    currentProject, activeStage, isDoctorOpen, isFocusMode, isTyping, isHeavyThinking, isDeleting, projectToDelete,
    hydrationState, refiningBlockId, handleOpenDoctor, handleProjectDelete, handleCancelDelete, handleDeleteCurrentProject,
    projects: projectHistory, handleProjectSelect: onProjectSelect, handleProjectExit: onNewStory,
  } = project;
  
  const [showDoctorBubble, setShowDoctorBubble] = useState(true);
  const lastScrollY = useRef(0);
  const currentProjectId = currentProject?.id || "";

  useEffect(() => {
    if (!isMobile) return;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowDoctorBubble(currentScrollY <= lastScrollY.current || currentScrollY <= 20);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);
  

  return (
    <div className={cn("w-full flex flex-col md:flex-row bg-background relative font-sans", isMobile ? "h-auto overflow-visible" : "h-[100dvh] overflow-hidden")}>
      {/* Gemini-style Sidebar (Left) */}
      {!isMobile && (
        <aside className="w-16 h-full flex flex-col items-center py-4 bg-background border-r border-white/5 transition-all duration-300 z-[60] flex-shrink-0">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="w-10 h-10 rounded-full hover:bg-white/5 transition-all flex items-center justify-center mb-4 border-none"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="h-[2px] w-5 rounded-full bg-white/40" />
              <span className="h-[2px] w-3 rounded-full bg-white/40" />
            </div>
          </button>
          
          <button 
            onClick={onNewStory}
            className="w-10 h-10 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all flex items-center justify-center mb-auto border-none"
            title="Nouveau projet"
          >
            <span className="text-xl">+</span>
          </button>

          {currentProject && (
            <div className="w-10 flex-1 flex flex-col items-center py-4 space-y-4 overflow-y-auto no-scrollbar">
              <Sidebar variant="sidebar" />
            </div>
          )}

          <button 
            onClick={handleOpenSettings}
            className="w-10 h-10 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all flex items-center justify-center border-none relative group"
            title="Paramètres"
          >
            <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-white transition-colors flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white/40 group-hover:bg-white" />
            </div>
          </button>
        </aside>
      )}

      {/* Main Content Area */}
      <div className={cn("flex-1 flex flex-col relative transition-all duration-500 z-10 min-w-0", isMobile ? "h-auto" : "h-full")}>
        <Header
          isCompact={isDoctorOpen}
          accessibilitySettings={accessibilitySettings}
          onAccessibilityChange={setAccessibilitySettings}
          onTitleClick={handleOpenDrawer}
          isTitleOpen={isProjectDrawerOpen}
          onSettingsClick={handleOpenSettings}
          onInfoClick={() => setIsHelpOpen(true)}
          isHistoryOpen={isHistoryOpen}
          setIsHistoryOpen={setIsHistoryOpen}
          user={user}
        />

        <main className={cn("flex-1 flex flex-col relative w-full", isMobile ? "overflow-visible" : "overflow-hidden")}>
          <div className={cn("w-full relative h-full", isMobile ? "overflow-visible scroll-smooth" : "overflow-y-auto no-scrollbar scroll-smooth overscroll-none", isMobile && "pb-safe-nav")}>
            <div className={cn("w-full h-full max-w-5xl mx-auto flex flex-col justify-start relative", isMobile ? "px-3 pb-2 pt-4" : "px-6 py-6")}>
              <Suspense fallback={<StageSkeleton />}>{renderStage()}</Suspense>
            </div>
          </div>
        </main>
      </div>

      {!isMobile && (
        <div className={cn("h-full border-l border-white/5 bg-background z-40 flex-shrink-0 transition-all duration-500 overflow-hidden relative", isDoctorOpen ? "w-[30%] min-w-[350px] max-w-[450px]" : "w-0 min-w-0 border-none")}>
          <div className="absolute right-0 top-0 w-[30vw] min-w-[350px] max-w-[450px] h-full">
            <Suspense fallback={<div className="h-full flex flex-col items-center justify-center p-12 space-y-4"><OrbitingLoader size="small" showText={false} /><span className="text-white/20 text-xs font-bold uppercase tracking-widest">Initialisation...</span></div>}>
              <ScriptDoctor />
            </Suspense>
          </div>
        </div>
      )}

      {isMobile && currentProject && <Suspense fallback={null}><ScriptDoctor /></Suspense>}
      {isMobile && currentProject && <Sidebar variant="bottom-nav" />}

      <FormErrorBoundary>
        <ProjectDrawer isOpen={isProjectDrawerOpen} onClose={handleCloseDrawer} onDelete={handleDeleteCurrentProject} />
      </FormErrorBoundary>

      <SettingsDrawer
        isOpen={isSettingsDrawerOpen} onClose={handleCloseSettings} user={user} theme={theme} language={language} accessibilitySettings={accessibilitySettings}
        onThemeChange={handleThemeChange} onLanguageChange={handleLanguageChange} onAccessibilityChange={setAccessibilitySettings} onSaveProfile={handleProfileSave} onLogout={handleLogout}
      />

      <ConfirmationModal
        isOpen={!!projectToDelete}
        onClose={handleCancelDelete}
        onConfirm={() => projectToDelete && handleProjectDelete(projectToDelete)}
        title="Supprimer le projet ?"
        description="Cette action est irréversible. Toutes les données associées seront perdues."
        variant="danger"
        isReady={!isDeleting}
        confirmLabel={isDeleting ? 'Suppression...' : 'Supprimer'}
      />

      <ToastManager toasts={toasts} setToasts={setToasts} />
      <GlobalOverlay isTyping={isTyping} isHydrating={hydrationState.isHydrating} hydratingLabel={hydrationState.hydratingLabel} isHeavyThinking={isHeavyThinking} activeStage={activeStage} refiningBlockId={refiningBlockId} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <ScriptDoctorFAB 
        isOpen={isDoctorOpen}
        isVisible={showDoctorBubble && !!currentProject && activeStage !== 'Discovery'}
        isMobile={isMobile}
        isTyping={isTyping}
        isHeavyThinking={isHeavyThinking}
        onOpen={handleOpenDoctor}
      />

      <AnimatePresence>
        {isFirstTime && <OnboardingWizard onComplete={() => { setIsFirstTime(false); localStorage.setItem("scenaria_onboarded", "true"); }} />}
      </AnimatePresence>

      <ProjectHistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        projects={projectHistory}
        currentProjectId={currentProjectId}
        onProjectSelect={onProjectSelect}
        onNewStory={onNewStory}
        onSettingsClick={handleOpenSettings}
      />
    </div>
  );
};

export const MainLayout = React.memo(MainLayoutComponent);
