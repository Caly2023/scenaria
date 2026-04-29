import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScriptDoctorFABProps {
  isOpen: boolean;
  isVisible: boolean;
  isMobile: boolean;
  onOpen: () => void;
}

export function ScriptDoctorFAB({
  isOpen,
  isVisible,
  isMobile,
  onOpen,
}: ScriptDoctorFABProps) {
  return (
    <div className={cn(
      "pointer-events-none z-50 overflow-hidden",
      isMobile ? "fixed inset-0" : "absolute inset-0"
    )}>
      <div
        className={cn(
          "pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-[60]",
          isMobile
            ? "fixed right-5 bottom-[calc(var(--bottom-nav-height)+16px)]"
            : "absolute bottom-6 right-6",
          isOpen || !isVisible
            ? "opacity-0 scale-50 pointer-events-none translate-y-12"
            : "opacity-100 scale-100",
        )}
      >
        <button
          onClick={onOpen}
          className={cn(
            "w-16 h-16 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border border-white/10",
            isMobile ? "bg-surface text-white" : "bg-white text-black"
          )}
        >
          <Bot className="w-8 h-8 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}
