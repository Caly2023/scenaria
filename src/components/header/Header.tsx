import React, { useState, useCallback } from 'react';
import { 
  ChevronDown, 
  RefreshCw,
  Info,
  Accessibility,
  Search,
  Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'motion/react';
import { useProject } from '@/contexts/ProjectContext';

// Sub-components
import { AccessibilityMenu } from './AccessibilityMenu';
import { ProjectHistorySidebar } from './ProjectHistorySidebar';

interface HeaderProps {
  isCompact?: boolean;
  accessibilitySettings: { highContrast: boolean; largeText: boolean; reducedMotion: boolean };
  onAccessibilityChange: (settings: HeaderProps['accessibilitySettings']) => void;
  onSettingsClick: () => void;
  onInfoClick: () => void;
  onTitleClick: () => void;
  isTitleOpen: boolean;
}

export function Header({ 
  isCompact,
  accessibilitySettings,
  onAccessibilityChange,
  onSettingsClick,
  onInfoClick,
  onTitleClick,
  isTitleOpen
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
          "bg-[#0f0f0f] z-50 border-b border-white/5 transition-all duration-500 flex-shrink-0 w-full overflow-hidden"
        )}
        style={{ paddingTop: 'var(--header-top-padding)' }}
      >
        <div className={cn(
          "flex items-center justify-between px-3 md:px-6 w-full relative",
          isCompact ? "h-14 md:h-14" : "h-14 md:h-16"
        )}>
          {/* Left — Burger + Project name */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-xl hover:bg-white/10 transition-all flex-shrink-0 border-none group/menu"
            >
              <div className="flex flex-col items-start gap-1.5">
                <span className="h-[2.5px] md:h-[2px] w-5.5 md:w-5 rounded-full bg-white/70 md:bg-white/40 group-hover/menu:bg-white transition-colors" />
                <span className="h-[2.5px] md:h-[2px] w-3.5 md:w-3 rounded-full bg-white/70 md:bg-white/40 group-hover/menu:bg-white transition-colors" />
              </div>
            </button>

            <div className="hidden md:flex items-center gap-4 min-w-0">
              <button onClick={onTitleClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity border-none bg-transparent p-0 text-left group/title">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-bold tracking-tight text-white truncate max-w-[200px]">{projectName}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 flex-shrink-0 transition-transform duration-300", isTitleOpen && "rotate-180 text-white")} />
                </div>
              </button>
              <div className="h-6 w-[1px] bg-white/10 mx-1" />
              <button onClick={onInfoClick} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all flex-shrink-0 border-none"><Info className="w-4 h-4" /></button>
            </div>

            <div className={cn("hidden md:flex transition-all duration-300 items-center overflow-hidden", isCompact ? "w-0 opacity-0" : "w-auto opacity-100")}>
              <div className="h-6 w-[1px] bg-white/10 mx-1" />
              <div className="relative group ml-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-white transition-colors" />
                <input type="text" placeholder={t('common.search')} className="bg-white/5 border-none rounded-lg pl-9 pr-4 h-9 text-sm transition-all w-48 placeholder:text-white/20" />
              </div>
            </div>
          </div>

          {/* Mobile project name */}
          <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center max-w-[44%]">
            <button onClick={onTitleClick} className="flex items-center gap-1.5 min-w-0 border-none bg-transparent p-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">{projectName}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 flex-shrink-0 transition-transform duration-300", isTitleOpen && "rotate-180 text-white")} />
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5 md:gap-6 flex-shrink-0">
            <div className={cn("hidden md:flex items-center gap-4 transition-all duration-300 overflow-hidden", isCompact ? "w-0 opacity-0" : "w-auto opacity-100")}>
              <div className="flex -space-x-1.5 whitespace-nowrap">
                <button className="w-7 h-7 flex-shrink-0 rounded-full border-2 border-background bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border-none"><Users className="w-3.5 h-3.5 text-white/40" /></button>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 px-2.5 md:px-3 py-2 md:py-1.5 rounded-xl bg-white/10 md:bg-white/5 border border-white/10 md:border-transparent">
              <RefreshCw className={cn("w-4 h-4", syncStatus === 'syncing' ? "animate-spin text-white" : "text-white/50 md:text-white/20", syncStatus === 'error' && "text-red-500")} />
              <span className="hidden sm:block text-xs uppercase tracking-widest font-bold text-white/30">
                {syncStatus === 'synced' ? t('common.synced') : syncStatus === 'syncing' ? t('common.syncing') : t('common.error')}
              </span>
            </div>

            <div className="relative hidden md:block">
              <button 
                onClick={() => setIsAccessOpen(!isAccessOpen)}
                className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all border-none", isAccessOpen ? "bg-white text-black" : "bg-white/5 text-white/40 hover:text-white")}
              >
                <Accessibility className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {isAccessOpen && <AccessibilityMenu settings={accessibilitySettings} onToggle={toggleAccess} />}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <ProjectHistorySidebar 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        projects={projectHistory}
        currentProjectId={currentProjectId}
        onProjectSelect={onProjectSelect}
        onNewStory={onNewStory}
        onSettingsClick={onSettingsClick}
      />
    </>
  );
}
