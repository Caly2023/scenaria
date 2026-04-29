import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Bot, Check, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  Project, 
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
import { DeleteProjectModal } from './DeleteProjectModal';
import { useProject } from '../../contexts/ProjectContext';
import { ToastManager } from '../ui/ToastManager';
import { GlobalOverlay } from '../ui/GlobalOverlay';

// Sub-components
import { ScriptDoctorFAB } from './ScriptDoctorFAB';
import { MobileNav } from './MobileNav';

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
}

const MainLayoutComponent = ({
  user, isMobile, isProjectDrawerOpen, isSettingsDrawerOpen, isHelpOpen, isFirstTime, toasts, accessibilitySettings,
  handleOpenDrawer, handleCloseDrawer, handleOpenSettings, handleCloseSettings, setAccessibilitySettings, setIsHelpOpen, setIsFirstTime, setToasts,
  handleLanguageChange, handleThemeChange, handleProfileSave, handleLogout, theme, language,
  renderStage, ScriptDoctor
}: MainLayoutProps) => {
  const project = useProject();
  const {
    currentProject, activeStage, isDoctorOpen, isFocusMode, isTyping, isHeavyThinking, isDeleting, projectToDelete,
    hydrationState, refiningBlockId, handleOpenDoctor, handleProjectDelete, handleCancelDelete, handleDeleteCurrentProject
  } = project;
  
  const [showDoctorBubble, setShowDoctorBubble] = useState(true);
  const lastScrollY = useRef(0);

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
  
  if (!currentProject) return null;

  return (
    <div className={cn("w-full flex flex-col md:flex-row bg-background relative font-sans", isMobile ? "h-auto overflow-visible" : "h-[100dvh] overflow-hidden")}>
      {!isMobile && (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
          <div className="pointer-events-auto absolute left-6 top-1/2 -translate-y-1/2 h-[85dvh] w-20 hover:w-64 group bg-[#111]/90 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-300 z-[60]">
            <Sidebar variant="sidebar" />
          </div>
        </div>
      )}

      {!isFocusMode && (
        <ScriptDoctorFAB 
          isOpen={isDoctorOpen} 
          isVisible={showDoctorBubble} 
          isMobile={isMobile} 
          onOpen={handleOpenDoctor} 
        />
      )}

      <div className={cn("flex-1 flex flex-col relative transition-all duration-500 z-10 min-w-0", isMobile ? "h-auto" : "h-full")}>
        <div className={cn(isMobile && "fixed top-0 left-0 right-0 z-50")}>
          <Header
            isCompact={isDoctorOpen}
            accessibilitySettings={accessibilitySettings}
            onAccessibilityChange={setAccessibilitySettings}
            onTitleClick={handleOpenDrawer}
            isTitleOpen={isProjectDrawerOpen}
            onSettingsClick={handleOpenSettings}
            onInfoClick={() => setIsHelpOpen(true)}
          />
        </div>

        <div className={cn("flex-1 flex flex-col relative w-full", isMobile ? "overflow-visible" : "overflow-hidden")}>
          <div className={cn("w-full relative", isMobile ? "overflow-visible scroll-smooth" : "flex-1 flex flex-col overflow-y-auto no-scrollbar scroll-smooth overscroll-none", isMobile && "pb-safe-nav")}>
            <div className={cn("w-full max-w-4xl mx-auto flex flex-col justify-start relative", isMobile ? "px-3 pb-2 pt-[calc(var(--header-top-padding)+64px)]" : "flex-1 px-6 py-12 md:pl-32 md:pr-12")}>
              <Suspense fallback={<StageSkeleton />}>{renderStage()}</Suspense>
            </div>
          </div>
        </div>
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

      {isMobile && <Suspense fallback={null}><ScriptDoctor /></Suspense>}
      {isMobile && <MobileNav />}

      <FormErrorBoundary>
        <ProjectDrawer isOpen={isProjectDrawerOpen} onClose={handleCloseDrawer} onDelete={handleDeleteCurrentProject} />
      </FormErrorBoundary>

      <SettingsDrawer
        isOpen={isSettingsDrawerOpen} onClose={handleCloseSettings} user={user} theme={theme} language={language} accessibilitySettings={accessibilitySettings}
        onThemeChange={handleThemeChange} onLanguageChange={handleLanguageChange} onAccessibilityChange={setAccessibilitySettings} onSaveProfile={handleProfileSave} onLogout={handleLogout}
      />

      <AnimatePresence>
        {projectToDelete && <DeleteProjectModal projectId={projectToDelete} isDeleting={isDeleting} onCancel={handleCancelDelete} onConfirm={handleProjectDelete} />}
      </AnimatePresence>

      <ToastManager toasts={toasts} setToasts={setToasts} />
      <GlobalOverlay isTyping={isTyping} isHydrating={hydrationState.isHydrating} hydratingLabel={hydrationState.hydratingLabel} isHeavyThinking={isHeavyThinking} activeStage={activeStage} refiningBlockId={refiningBlockId} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <AnimatePresence>
        {isFirstTime && <OnboardingWizard onComplete={() => { setIsFirstTime(false); localStorage.setItem("scenaria_onboarded", "true"); }} />}
      </AnimatePresence>
    </div>
  );
};

export const MainLayout = React.memo(MainLayoutComponent);
