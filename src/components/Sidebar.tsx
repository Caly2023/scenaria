import { 
  Zap, 
  LayoutGrid, 
  BookOpen, 
  FileText, 
  ListOrdered, 
  PenTool, 
  ImageIcon,
  Lock,
  Wand2,
  Lightbulb,
  MapPin,
  Info,
  Edit3,
  Layers,
  Bot,
  Cpu,
  Film,
  Share
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { WorkflowStage } from '@/types';

import { useProject } from '@/contexts/ProjectContext';

interface SidebarProps {
  /** If true, renders as a horizontal bottom navigation bar (mobile) */
  variant?: 'sidebar' | 'bottom-nav';
}

const stageUIMetadata: Record<string, { icon: React.ElementType; estTime: string }> = {
  'Project Metadata': { icon: Info, estTime: '5m' },
  'Initial Draft': { icon: Edit3, estTime: '10m' },
  'Brainstorming': { icon: Lightbulb, estTime: '15m' },
  'Logline': { icon: Zap, estTime: '5m' },
  '3-Act Structure': { icon: LayoutGrid, estTime: '30m' },
  '8-Beat Structure': { icon: Layers, estTime: '30m' },
  'Synopsis': { icon: FileText, estTime: '45m' },
  'Character Bible': { icon: BookOpen, estTime: '1h' },
  'Location Bible': { icon: MapPin, estTime: '30m' },
  'Treatment': { icon: PenTool, estTime: '2h' },
  'Step Outline': { icon: ListOrdered, estTime: '2h' },
  'Script': { icon: FileText, estTime: 'Days' },
  'Global Script Doctoring': { icon: Bot, estTime: '1h' },
  'Technical Breakdown': { icon: Cpu, estTime: '3h' },
  'Visual Assets': { icon: ImageIcon, estTime: '2h' },
  'AI Previs': { icon: Film, estTime: '2h' },
  'Production Export': { icon: Share, estTime: '5m' },
};

import { stageRegistry } from '@/config/stageRegistry';

const stages = stageRegistry.getAll().map(s => ({
  id: s.id,
  step: s.order + 1,
  ...stageUIMetadata[s.id]
}));

export function Sidebar({ variant = 'sidebar' }: SidebarProps) {
  const { activeStage, handleStageChange: onStageChange, currentProject } = useProject();
  const validatedStages = currentProject?.validatedStages || [];
  
  const { t } = useTranslation();

  const isStageUnlocked = (index: number) => {
    if (index === 0) return true;
    const previousStage = stages[index - 1].id;
    return validatedStages.includes(previousStage);
  };

  // ── Bottom Navigation (Mobile) ──────────────────────────────────────────────
  if (variant === 'bottom-nav') {
    return (
      <nav
        className="flex items-center gap-1 px-2 overflow-x-auto no-scrollbar h-full w-full"
        aria-label="Stage navigation"
      >
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          const isUnlocked = isStageUnlocked(index);
          const isLocked = !isUnlocked;

          return (
            <button
              key={stage.id}
              onClick={() => {
                if (!isLocked) {
                  triggerHaptic('light');
                  onStageChange(stage.id);
                }
              }}
              disabled={isLocked}
              aria-label={`${stage.id}`}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={isLocked}
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center transition-all duration-300 group/nav',
                isActive ? 'px-5' : 'px-3'
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500",
                isActive 
                  ? "bg-white text-black shadow-lg shadow-white/20 scale-105" 
                  : isLocked
                    ? "bg-transparent text-white/5"
                    : "bg-white/5 text-white/60 group-hover/nav:bg-white/10 group-hover/nav:text-white"
              )}>
                <div className="relative">
                  <Icon className={cn(
                    "w-7 h-7 transition-transform duration-300",
                    isActive ? "scale-105" : "group-hover/nav:scale-110"
                  )} />
                  {isLocked && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-white/5">
                      <Lock className="w-3 h-3 text-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    );
  }

  // ── Sidebar (Desktop) ───────────────────────────────────────────────────────
  return (
    <aside className="h-full w-full bg-[#0f0f0f] flex flex-col py-8 relative overflow-hidden">
      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 px-4 w-full">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          const isUnlocked = isStageUnlocked(index);
          const isLocked = !isUnlocked;
          
          return (
            <div key={stage.id} className="relative group/btn flex flex-col w-full">
              <button
                onClick={() => {
                  if (!isLocked) {
                    triggerHaptic('light');
                    onStageChange(stage.id);
                  }
                }}
                disabled={isLocked}
                aria-label={`Stage ${stage.step} of ${stages.length}: ${stage.id}`}
                aria-current={isActive ? "step" : undefined}
                aria-disabled={isLocked}
                className={cn(
                  "w-full h-12 rounded-2xl flex items-center gap-4 px-3 transition-all duration-300 relative",
                  isActive 
                    ? "bg-white text-black shadow-lg" 
                    : isLocked
                      ? "bg-transparent text-white/10 cursor-not-allowed grayscale opacity-50"
                      : "bg-transparent text-white/40 hover:text-white hover:bg-white/5 active:scale-95"
                )}
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center relative">
                  <Icon className={cn(
                    "w-5 h-5 transition-all duration-300",
                    isActive ? "scale-110" : "group-hover/btn:scale-110"
                  )} />
                  {isLocked && (
                    <div className="absolute -bottom-1 -right-1 bg-[#0f0f0f] rounded-full p-0.5">
                      <Lock className="w-2.5 h-2.5 text-white/40" />
                    </div>
                  )}
                </div>
                
                {/* Expanded Text Content */}
                <div className={cn(
                  "flex items-center whitespace-nowrap overflow-hidden transition-all duration-300",
                  "w-0 opacity-0 group-hover:w-auto group-hover:opacity-100"
                )}>
                  <span className={cn(
                    "text-base font-bold tracking-tight truncate",
                    isActive ? "text-black" : "text-white/90"
                  )}>
                    {t(`stages.${stage.id}.label`, { defaultValue: stage.id })}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Bottom Action */}
      <div className="mt-auto px-4 w-full flex justify-center group-hover:justify-start transition-all">
        <button 
          aria-label="Magic Tools"
          className="w-12 h-12 rounded-2xl text-white/20 flex items-center justify-center hover:text-white hover:bg-white/5 transition-all group/magic border-none"
        >
          <Wand2 className="w-5 h-5 group-hover/magic:rotate-12 transition-transform" />
        </button>
      </div>
    </aside>
  );
}
