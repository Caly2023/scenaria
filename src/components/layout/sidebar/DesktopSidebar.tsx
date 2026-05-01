import { Lock, Wand2, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { WorkflowStage } from '@/types';
import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';

interface DesktopSidebarProps {
  stages: any[];
  activeStage: WorkflowStage;
  onStageChange: (id: WorkflowStage) => void;
  isStageUnlocked: (index: number) => boolean;
}

const StageItem = memo(({ stage, isActive, isLocked, onClick, t, onHover }: any) => {
  const Icon = stage.icon;
  return (
    <div className="relative flex flex-col w-full flex-shrink-0 px-3 py-1">
      <button
        onClick={onClick}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onHover({ 
            label: t(`stages.${stage.id}.label`, { defaultValue: stage.id }), 
            top: rect.top + rect.height / 2,
            left: rect.right + 16,
            visible: true 
          });
        }}
        onMouseLeave={() => onHover(null)}
        disabled={isLocked}
        aria-current={isActive ? "step" : undefined}
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative mx-auto group/btn",
          isActive 
            ? "bg-white text-black shadow-lg" 
            : isLocked
              ? "bg-transparent text-white/10 cursor-not-allowed opacity-50"
              : "bg-transparent text-white/40 hover:text-white hover:bg-white/5 active:scale-95"
        )}
      >
        <div className="relative">
          <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover/btn:scale-110")} />
          {isLocked && (
            <div className="absolute -bottom-1 -right-1 bg-[#0f0f0f] rounded-full p-0.5">
              <Lock className="w-2.5 h-2.5 text-white/40" />
            </div>
          )}
        </div>
      </button>
    </div>
  );
});

StageItem.displayName = 'StageItem';

export function DesktopSidebar({ stages, activeStage, onStageChange, isStageUnlocked }: DesktopSidebarProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);
  const [tooltip, setTooltip] = useState<{ label: string, top: number, left: number, visible: boolean } | null>(null);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 5);
    setCanScrollDown(Math.ceil(scrollTop + clientHeight) < scrollHeight - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [stages]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[aria-current="step"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(checkScroll, 300);
      }
    }
  }, [activeStage]);

  const scroll = (direction: 'up' | 'down') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === 'up' ? -(el.clientHeight - 60) : (el.clientHeight - 60);
    el.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  };

  return (
    <aside className="h-full w-full bg-[#0f0f0f] flex flex-col py-6 relative overflow-visible">
      <div className="flex-1 flex flex-col min-h-0 w-full relative">
        {canScrollUp && (
          <button 
            onClick={() => scroll('up')}
            className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent z-10 flex items-start justify-center pt-1 text-white/50 hover:text-white transition-colors"
          >
            <ChevronUp className="w-5 h-5 animate-pulse" />
          </button>
        )}
        
        <nav 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col px-1 w-full py-2 scroll-smooth"
        >
          {stages.map((stage, index) => (
            <StageItem
              key={stage.id}
              stage={stage}
              isActive={activeStage === stage.id}
              isLocked={!isStageUnlocked(index)}
              t={t}
              onHover={setTooltip}
              onClick={() => {
                if (isStageUnlocked(index)) {
                  triggerHaptic('light');
                  onStageChange(stage.id);
                }
              }}
            />
          ))}
        </nav>

        {canScrollDown && (
          <button 
            onClick={() => scroll('down')}
            className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent z-10 flex items-end justify-center pb-1 text-white/50 hover:text-white transition-colors"
          >
            <ChevronDown className="w-5 h-5 animate-pulse" />
          </button>
        )}
      </div>

      <div className="mt-4 px-4 w-full flex justify-center flex-shrink-0">
        <button 
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({ 
              label: 'Outils Magiques', 
              top: rect.top + rect.height / 2,
              left: rect.right + 16,
              visible: true 
            });
          }}
          onMouseLeave={() => setTooltip(null)}
          className="w-12 h-12 rounded-2xl text-white/20 flex items-center justify-center hover:text-white hover:bg-white/5 transition-all group/magic border-none"
        >
          <Wand2 className="w-5 h-5 group-hover/magic:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Render the fixed tooltip */}
      {typeof document !== 'undefined' && createPortal(
        <div 
          className={cn(
            "fixed px-3 py-2 bg-white text-black text-sm font-bold rounded-xl whitespace-nowrap shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 pointer-events-none transition-all duration-200 z-[9999]",
            tooltip && tooltip.visible ? "opacity-100 scale-100" : "opacity-0 scale-90 translate-x-[-10px]"
          )}
          style={{
            top: tooltip ? tooltip.top : 0,
            left: tooltip ? tooltip.left : 0,
            transform: `translateY(-50%) ${!(tooltip && tooltip.visible) ? 'translateX(-10px) scale(0.9)' : 'scale(1)'}`
          }}
        >
          {tooltip ? tooltip.label : ''}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-white" />
        </div>,
        document.body
      )}
    </aside>
  );
}
