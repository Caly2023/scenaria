import React, { useState, useEffect, useRef } from 'react';
import { Bot, LayoutGrid, Check, Lock, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { WorkflowStage } from '@/types';
import { StageDefinition } from '@/config/stageRegistry';
import { useTranslation } from 'react-i18next';

interface MobileUnifiedNavigationProps {
  stages: StageDefinition[];
  activeStage: WorkflowStage;
  onStageChange: (id: WorkflowStage) => void;
  isStageUnlocked: (index: number) => boolean;
  isDoctorOpen: boolean;
  onOpenDoctor: () => void;
  isTyping?: boolean;
  isHeavyThinking?: boolean;
  isVisible: boolean;
}

export function MobileUnifiedNavigation({
  stages,
  activeStage,
  onStageChange,
  isStageUnlocked,
  isDoctorOpen,
  onOpenDoctor,
  isTyping,
  isHeavyThinking,
  isVisible
}: MobileUnifiedNavigationProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const activeStageIndex = stages.findIndex(s => s.id === activeStage);
  const activeStageDef = stages[activeStageIndex];
  const ActiveIcon = activeStageDef?.icon || LayoutGrid;

  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-24 opacity-0 scale-90 pointer-events-none"
    )}>
      {/* Stages Menu Popover */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            className="absolute bottom-full mb-5 left-1/2 -translate-x-1/2 w-[90vw] max-w-[340px] bg-[#121212]/95 backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="p-3 space-y-1.5">
              <div className="px-4 py-2 mb-1 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  {t('common.steps', { defaultValue: 'Workflow' })}
                </span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                </div>
              </div>
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = activeStage === stage.id;
                const isUnlocked = isStageUnlocked(index);
                
                return (
                  <button
                    key={stage.id}
                    onClick={() => {
                      if (isUnlocked) {
                        triggerHaptic('light');
                        onStageChange(stage.id);
                        setIsMenuOpen(false);
                      }
                    }}
                    disabled={!isUnlocked}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-all border-none relative group overflow-hidden",
                      isActive ? "bg-white text-black shadow-xl" : "text-white/60 hover:bg-white/5",
                      !isUnlocked && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-bg"
                        className="absolute inset-0 bg-white"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center relative z-10 transition-colors",
                      isActive ? "bg-black/5" : "bg-white/5 group-hover:bg-white/10"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left relative z-10">
                      <p className={cn(
                        "text-sm font-bold tracking-tight leading-none",
                        isActive ? "text-black" : "text-white"
                      )}>
                        {t(`stages.${stage.id}.label`, { defaultValue: stage.id })}
                      </p>
                    </div>
                    <div className="relative z-10">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" strokeWidth={3} />
                        </div>
                      ) : !isUnlocked ? (
                        <Lock className="w-3.5 h-3.5 opacity-40" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab Pill */}
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-white/5 to-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-center bg-[#111111]/85 backdrop-blur-3xl border border-white/10 rounded-full p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
          {/* Steps Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsMenuOpen(!isMenuOpen);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-full transition-all border-none relative overflow-hidden",
              isMenuOpen ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
            )}
          >
            <ActiveIcon className={cn(
              "w-5 h-5 transition-transform duration-500",
              isMenuOpen ? "scale-110 rotate-12" : "group-active:scale-90"
            )} />
            <span className="text-sm font-black tracking-tight uppercase">Étapes</span>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full bg-white/20 transition-all duration-500",
              isMenuOpen ? "scale-150 bg-white" : "scale-100"
            )} />
          </button>

          {/* Divider */}
          <div className="w-[1px] h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-1" />

          {/* Script Doctor Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              onOpenDoctor();
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-full transition-all border-none relative overflow-hidden group/btn",
              isDoctorOpen ? "text-white" : "text-white/70 hover:text-white",
              (isTyping || isHeavyThinking) && "text-white"
            )}
          >
            <div className="relative">
              <Bot className={cn(
                "w-5 h-5 transition-transform group-active/btn:scale-90",
                isTyping && "animate-bounce"
              )} />
              {(isTyping || isHeavyThinking) && (
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(168,85,247,1)]" />
              )}
            </div>
            <span className="text-sm font-black tracking-tight uppercase">Doctor</span>
            
            {isHeavyThinking && (
              <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" 
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
