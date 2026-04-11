import React from 'react';
import { 
  Home, 
  ChevronDown, 
  RefreshCw,
  Info,
  Bot,
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

interface HeaderProps {
  projectName: string;
  onProjectSwitch: () => void;
  onCallStart: () => void;
  onInfoClick: () => void;
  onDoctorToggle: () => void;
  isDoctorOpen: boolean;
  syncStatus: 'synced' | 'syncing' | 'error';
  collaborators: { id: string; name: string; photoURL: string; isActive: boolean }[];
  isCompact?: boolean;
  accessibilitySettings: { highContrast: boolean; largeText: boolean; reducedMotion: boolean };
  onAccessibilityChange: (settings: any) => void;
}

export function Header({ 
  projectName, 
  onProjectSwitch, 
  onCallStart, 
  onInfoClick,
  onDoctorToggle,
  isDoctorOpen,
  syncStatus, 
  collaborators,
  isCompact,
  accessibilitySettings,
  onAccessibilityChange
}: HeaderProps) {
  const { t } = useTranslation();
  const [isAccessOpen, setIsAccessOpen] = React.useState(false);

  const toggleAccess = (key: string) => {
    onAccessibilityChange({
      ...accessibilitySettings,
      [key]: !accessibilitySettings[key as keyof typeof accessibilitySettings]
    });
  };

  return (
    <header className={cn(
      "bg-[#0f0f0f] flex items-center justify-between px-4 md:px-6 z-50 border-b border-white/5 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex-shrink-0 w-full",
      isCompact ? "h-12 md:h-14" : "h-12 md:h-16"
    )}>
      {/* Left — Home + Project name */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <button 
          onClick={onProjectSwitch}
          aria-label="Switch project"
          className="flex items-center gap-2 md:gap-3 group px-2 md:px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-white/50 min-w-0"
        >
          <Home className="w-4 h-4 text-white/40 group-hover:text-white flex-shrink-0" />
          <div className="flex flex-col items-start leading-none min-w-0">
            <span className="hidden md:block text-[9px] uppercase tracking-widest text-secondary font-bold mb-0.5">
              {t('common.project')}
            </span>
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-medium tracking-tight text-white truncate max-w-[120px] md:max-w-[200px]">
                {projectName}
              </span>
              <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" />
            </div>
          </div>
        </button>

        {/* Info — always visible */}
        <button
          onClick={onInfoClick}
          aria-label="Project information"
          className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/50 flex-shrink-0"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Doctor toggle — visible on mobile too (compact version) */}
        <button
          onClick={onDoctorToggle}
          aria-label="Toggle Script Doctor"
          aria-pressed={isDoctorOpen}
          className={cn(
            "flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg transition-all border focus:outline-none focus:ring-2 focus:ring-white/50 flex-shrink-0",
            isDoctorOpen 
              ? "bg-white text-black border-white" 
              : "bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10"
          )}
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:block text-[10px] font-bold uppercase tracking-widest">Doctor</span>
        </button>

        {/* Search — desktop only */}
        <div className={cn("hidden md:flex transition-all duration-300 items-center overflow-hidden", isCompact ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <div className="h-6 w-[1px] bg-white/10 mx-1" />
          <div className="relative group ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              aria-label="Search across project"
              placeholder={t('common.search')} 
              className="bg-white/5 border-none rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all w-48 placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* Right — Sync + Accessibility (+ collaborators on desktop) */}
      <div className="flex items-center gap-2 md:gap-6 flex-shrink-0">
        
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
            <button aria-label="Manage Collaborators" className="w-7 h-7 flex-shrink-0 rounded-full border-2 border-background bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-white/50">
              <Users className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>

          <button 
            onClick={onCallStart}
            aria-label="Start Voice Call"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all group shrink-0 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <PhoneCall className="w-4 h-4 text-white/40 group-hover:text-white" />
          </button>
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg bg-white/5">
          <RefreshCw className={cn(
            "w-3.5 h-3.5",
            syncStatus === 'syncing' ? "animate-spin text-white" : "text-white/20",
            syncStatus === 'error' && "text-red-500"
          )} />
          <span className="hidden sm:block text-[9px] uppercase tracking-widest font-bold text-secondary">
            {syncStatus === 'synced' ? t('common.synced') : syncStatus === 'syncing' ? t('common.syncing') : t('common.error')}
          </span>
        </div>

        {/* Accessibility Toggle */}
        <div className="relative">
          <button 
            onClick={() => setIsAccessOpen(!isAccessOpen)}
            aria-label="Accessibility Settings"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-white/50",
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
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Accessibility</h3>
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
    </header>
  );
}
