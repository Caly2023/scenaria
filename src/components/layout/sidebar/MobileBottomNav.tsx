import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { WorkflowStage } from '@/types';

interface MobileBottomNavProps {
  stages: any[];
  activeStage: WorkflowStage;
  onStageChange: (id: WorkflowStage) => void;
  isStageUnlocked: (index: number) => boolean;
}

export function MobileBottomNav({ stages, activeStage, onStageChange, isStageUnlocked }: MobileBottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5 flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="h-18 flex items-end pb-0 overflow-hidden">
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
      </div>
    </div>
  );
}
