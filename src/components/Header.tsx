import React from 'react';
import { 
  ChevronDown, 
  RefreshCw,
  Info,
  Settings,
  Accessibility,
  Eye,
  Type,
  MoveHorizontal,
  PhoneCall,
  Search,
  Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AiFlowToggle } from './AiFlowToggle';

interface HeaderProps {
  projectName: string;
  projectHistory: { id: string; title: string; logline: string; updatedAt: number }[];
  currentProjectId: string;
  onProjectSelect: (projectId: string) => void;
  onNewStory: () => void;
  onCallStart: () => void;
  onInfoClick: () => void;
  syncStatus: 'synced' | 'syncing' | 'error';
  collaborators: { id: string; name: string; photoURL: string; isActive: boolean }[];
  isCompact?: boolean;
  accessibilitySettings: { highContrast: boolean; largeText: boolean; reducedMotion: boolean };
  onAccessibilityChange: (settings: HeaderProps['accessibilitySettings']) => void;
  onTitleClick: () => void;
  isTitleOpen: boolean;
  onSettingsClick: () => void;
}

export function Header({ 
  projectName, 
  projectHistory,
  currentProjectId,
  onProjectSelect,
  onNewStory,
  onCallStart, 
  onInfoClick,
  syncStatus, 
  collaborators,
  isCompact,
  accessibilitySettings,
  onAccessibilityChange,
  onTitleClick,
  isTitleOpen,
  onSettingsClick
}: HeaderProps) {
  const { t } = useTranslation();
  const [isAccessOpen, setIsAccessOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  const toggleAccess = (key: string) => {
    onAccessibilityChange({
      ...accessibilitySettings,
      [key]: !accessibilitySettings[key as keyof typeof accessibilitySettings]
    });
  };

  return (
    <>
    <header 
      className={cn(
        "bg-[#0f0f0f] z-50 border-b border-white/5 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex-shrink-0 w-full overflow-hidden",
        isCompact ? "h-auto" : "h-auto"
      )}
      style={{ 
        paddingTop: 'var(--header-top-padding)' 
      }}
    >
      <div className={cn(
        "flex items-center justify-between px-3 md:px-6 w-full relative",
        isCompact ? "h-14 md:h-14" : "h-14 md:h-16"
      )}>

      {/* Left — Burger + Project name */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <button 
          onClick={() => setIsHistoryOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-xl hover:bg-white/10 transition-all flex-shrink-0 border-none group/menu"
        >
          <div className="flex flex-col items-start gap-1.5">
            <span className="h-[1.5px] w-5 rounded-full bg-white/70 md:bg-white/40 group-hover/menu:bg-white transition-colors" />
            <span className="h-[1.5px] w-3 rounded-full bg-white/70 md:bg-white/40 group-hover/menu:bg-white transition-colors" />
          </div>
        </button>

        {/* Desktop-only project info & tools */}
        <div className="hidden md:flex items-center gap-4 min-w-0">
          <button 
            onClick={onTitleClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity border-none bg-transparent p-0 text-left group/title"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-bold tracking-tight text-white truncate max-w-[200px]">
                {projectName}
              </span>
              <ChevronDown 
                className={cn(
                  "w-3.5 h-3.5 text-white/30 flex-shrink-0 transition-transform duration-300",
                  isTitleOpen && "rotate-180 text-white"
                )} 
              />
            </div>
          </button>

          <div className="h-6 w-[1px] bg-white/10 mx-1" />

          {/* Info */}
          <button
            onClick={onInfoClick}
            aria-label="Project information"
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all flex-shrink-0 border-none"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* AI Flow Toggle */}
          <AiFlowToggle />

        </div>


        {/* Search — desktop only */}
        <div className={cn("hidden md:flex transition-all duration-300 items-center overflow-hidden", isCompact ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <div className="h-6 w-[1px] bg-white/10 mx-1" />
          <div className="relative group ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              aria-label="Search across project"
              placeholder={t('common.search')} 
              className="bg-white/5 border-none rounded-lg pl-9 pr-4 h-9 text-sm transition-all w-48 placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* Mobile-only Centered Project Name */}
      <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center max-w-[44%]">
        <button 
          onClick={onTitleClick}
          className="flex items-center gap-1.5 min-w-0 border-none bg-transparent p-0"
        >
          <span className="text-[15px] font-semibold tracking-tight text-white truncate">
            {projectName}
          </span>
          <ChevronDown 
            className={cn(
              "w-3.5 h-3.5 text-white/30 flex-shrink-0 transition-transform duration-300",
              isTitleOpen && "rotate-180 text-white"
            )} 
          />
        </button>
      </div>


      {/* Right — Sync + Accessibility (+ collaborators on desktop) */}
      <div className="flex items-center gap-1.5 md:gap-6 flex-shrink-0">
        
        {/* Collaborators — desktop only */}
        <div className={cn("hidden md:flex items-center gap-4 transition-all duration-300 overflow-hidden", isCompact ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <div className="flex -space-x-1.5 whitespace-nowrap">
            {collaborators.map((user) => (
              <div 
                key={user.id}
                className={cn(
                  "w-7 h-7 rounded-full border-2 border-background overflow-hidden relative",
                  user.isActive ? "ring-1 ring-white/20" : "opacity-40"
                )}
              >
                <img src={user.photoURL} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
            ))}
            <button aria-label="Manage Collaborators" className="w-7 h-7 flex-shrink-0 rounded-full border-2 border-background bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border-none">
              <Users className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>

          <button 
            onClick={onCallStart}
            aria-label="Start Voice Call"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all group shrink-0 border-none"
          >
            <PhoneCall className="w-4 h-4 text-white/40 group-hover:text-white" />
          </button>
        </div>


        {/* Sync status (desktop only) */}
        <div className="hidden md:flex items-center gap-2 px-2.5 md:px-3 py-2 md:py-1.5 rounded-xl bg-white/10 md:bg-white/5 border border-white/10 md:border-transparent">
          <RefreshCw className={cn(
            "w-4 h-4",
            syncStatus === 'syncing' ? "animate-spin text-white" : "text-white/50 md:text-white/20",
            syncStatus === 'error' && "text-red-500"
          )} />
          <span className="hidden sm:block text-xs uppercase tracking-widest font-bold text-white/30">
            {syncStatus === 'synced' ? t('common.synced') : syncStatus === 'syncing' ? t('common.syncing') : t('common.error')}
          </span>
        </div>

        {/* Accessibility Toggle — desktop only */}
        <div className="relative hidden md:block">
          <button 
            onClick={() => setIsAccessOpen(!isAccessOpen)}
            aria-label="Accessibility Settings"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all border-none",
              isAccessOpen ? "bg-white text-black" : "bg-white/5 text-white/40 hover:text-white"
            )}
          >
            <Accessibility className="w-4 h-4" />
          </button>

          
          <AnimatePresence>
            {isAccessOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-64 bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-4 z-[100] space-y-3"
              >
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Accessibility</h3>
                <button 
                  onClick={() => toggleAccess('highContrast')}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium text-white">High Contrast</span>
                  </div>
                  <div className={cn("w-8 h-4 rounded-full transition-all relative", accessibilitySettings.highContrast ? "bg-white" : "bg-white/10")}>
                    <div className={cn("absolute top-1 w-2 h-2 rounded-full transition-all", accessibilitySettings.highContrast ? "right-1 bg-black" : "left-1 bg-white/40")} />
                  </div>
                </button>

                <button 
                  onClick={() => toggleAccess('largeText')}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Type className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium text-white">Larger Text</span>
                  </div>
                  <div className={cn("w-8 h-4 rounded-full transition-all relative", accessibilitySettings.largeText ? "bg-white" : "bg-white/10")}>
                    <div className={cn("absolute top-1 w-2 h-2 rounded-full transition-all", accessibilitySettings.largeText ? "right-1 bg-black" : "left-1 bg-white/40")} />
                  </div>
                </button>

                <button 
                  onClick={() => toggleAccess('reducedMotion')}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MoveHorizontal className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium text-white">Reduced Motion</span>
                  </div>
                  <div className={cn("w-8 h-4 rounded-full transition-all relative", accessibilitySettings.reducedMotion ? "bg-white" : "bg-white/10")}>
                    <div className={cn("absolute top-1 w-2 h-2 rounded-full transition-all", accessibilitySettings.reducedMotion ? "right-1 bg-black" : "left-1 bg-white/40")} />
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </header>

    <AnimatePresence>
      {isHistoryOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsHistoryOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed left-0 top-0 bottom-0 z-[1010] w-screen max-w-none md:w-[340px] md:max-w-[360px] bg-[#121212] border-r border-white/10 shadow-2xl flex flex-col"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)' }}
          >
            <div className="px-4 pt-2 pb-4 border-b border-white/10">
              <button
                onClick={() => {
                  setIsHistoryOpen(false);
                  onNewStory();
                }}
                className="w-full h-11 rounded-xl bg-white text-black font-semibold text-sm hover:opacity-90 transition-opacity border-none"
              >
                Nouvelle histoire
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {projectHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsHistoryOpen(false);
                    if (item.id !== currentProjectId) onProjectSelect(item.id);
                  }}
                  className={cn(
                    'w-full text-left rounded-xl px-3 py-3 border transition-colors border-solid',
                    item.id === currentProjectId
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/[0.03] border-transparent hover:bg-white/5'
                  )}
                >
                  <p className="text-sm font-semibold text-white truncate">
                    {item.title || 'Projet sans titre'}
                  </p>
                  <p className="text-xs text-white/50 line-clamp-2 mt-1">
                    {item.logline || 'Aucune logline'}
                  </p>
                </button>
              ))}
            </div>

            <div
              className="p-3 border-t border-white/10 bg-[#151515]"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
            >
              <button
                onClick={() => {
                  setIsHistoryOpen(false);
                  onSettingsClick();
                }}
                className="w-full h-11 rounded-xl bg-white/5 text-white flex items-center gap-2 justify-center hover:bg-white/10 transition-colors border-none"
              >
                <Settings className="w-4 h-4" />
                Parametres
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
