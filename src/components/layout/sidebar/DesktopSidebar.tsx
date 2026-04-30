import { Lock, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { WorkflowStage } from '@/types';


interface DesktopSidebarProps {
  stages: any[];
  activeStage: WorkflowStage;
  onStageChange: (id: WorkflowStage) => void;
  isStageUnlocked: (index: number) => boolean;
}

export function DesktopSidebar({ stages, activeStage, onStageChange, isStageUnlocked }: DesktopSidebarProps) {
  const { t } = useTranslation();

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
