import { 
  Zap, 
  LayoutGrid, 
  BookOpen, 
  FileText, 
  ListOrdered, 
  PenTool, 
  Image as ImageIcon,
  Lock,
  Wand2,
  Lightbulb,
  MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { WorkflowStage } from '@/types';

interface SidebarProps {
  activeStage: WorkflowStage;
  onStageChange: (stage: WorkflowStage) => void;
  validatedStages: WorkflowStage[];
  /** If true, renders as a horizontal bottom navigation bar (mobile) */
  variant?: 'sidebar' | 'bottom-nav';
}

const stages: { id: WorkflowStage; icon: React.ElementType; step: number; estTime: string }[] = [
  { id: 'Brainstorming', icon: Lightbulb, step: 1, estTime: '15m' },
  { id: 'Logline', icon: Zap, step: 2, estTime: '5m' },
  { id: '3-Act Structure', icon: LayoutGrid, step: 3, estTime: '30m' },
  { id: 'Synopsis', icon: FileText, step: 4, estTime: '45m' },
  { id: 'Character Bible', icon: BookOpen, step: 5, estTime: '1h' },
  { id: 'Location Bible', icon: MapPin, step: 6, estTime: '30m' },
  { id: 'Treatment', icon: PenTool, step: 7, estTime: '2h' },
  { id: 'Step Outline', icon: ListOrdered, step: 8, estTime: '2h' },
  { id: 'Script', icon: FileText, step: 9, estTime: 'Days' },
  { id: 'Storyboard', icon: ImageIcon, step: 10, estTime: 'TBD' },
];

export function Sidebar({ activeStage, onStageChange, validatedStages, variant = 'sidebar' }: SidebarProps) {
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
              onClick={() => !isLocked && onStageChange(stage.id)}
              disabled={isLocked}
              aria-label={`${stage.id}`}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={isLocked}
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center transition-all duration-300 group/nav',
                isActive ? 'px-4' : 'px-2'
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500",
                isActive 
                  ? "bg-white text-black shadow-lg shadow-white/10 scale-110" 
                  : isLocked
                    ? "bg-transparent text-white/10"
                    : "bg-white/5 text-white/40 group-hover/nav:bg-white/10 group-hover/nav:text-white"
              )}>
                <div className="relative">
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive ? "scale-110" : "group-hover/nav:scale-110"
                  )} />
                  {isLocked && (
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-white/5">
                      <Lock className="w-2.5 h-2.5 text-white/30" />
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
                onClick={() => !isLocked && onStageChange(stage.id)}
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
                  "flex flex-col items-start whitespace-nowrap overflow-hidden transition-all duration-300",
                  "w-0 opacity-0 group-hover:w-auto group-hover:opacity-100"
                )}>
                  <span className={cn(
                    "text-xs uppercase tracking-[0.2em] font-bold mb-0.5 whitespace-nowrap",
                    isActive ? "text-black/60" : "text-white/30"
                  )}>
                    Stage {stage.step} <span className="opacity-50 mx-1.5">•</span> {stage.estTime}
                  </span>
                  <span className={cn(
                    "text-base font-bold tracking-tight",
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
