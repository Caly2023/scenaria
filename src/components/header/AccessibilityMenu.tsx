import React from 'react';
import { motion } from 'motion/react';
import { Eye, Type, MoveHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

interface AccessibilityMenuProps {
  settings: AccessibilitySettings;
  onToggle: (key: keyof AccessibilitySettings) => void;
}

export function AccessibilityMenu({ settings, onToggle }: AccessibilityMenuProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 mt-3 w-64 bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl p-4 z-[100] space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Accessibility</h3>
      <button 
        onClick={() => onToggle('highContrast')}
        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">High Contrast</span>
        </div>
        <div className={cn("w-8 h-4 rounded-full transition-all relative", settings.highContrast ? "bg-white" : "bg-white/10")}>
          <div className={cn("absolute top-1 w-2 h-2 rounded-full transition-all", settings.highContrast ? "right-1 bg-black" : "left-1 bg-white/40")} />
        </div>
      </button>

      <button 
        onClick={() => onToggle('largeText')}
        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Type className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">Larger Text</span>
        </div>
        <div className={cn("w-8 h-4 rounded-full transition-all relative", settings.largeText ? "bg-white" : "bg-white/10")}>
          <div className={cn("absolute top-1 w-2 h-2 rounded-full transition-all", settings.largeText ? "right-1 bg-black" : "left-1 bg-white/40")} />
        </div>
      </button>

      <button 
        onClick={() => onToggle('reducedMotion')}
        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MoveHorizontal className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">Reduced Motion</span>
        </div>
        <div className={cn("w-8 h-4 rounded-full transition-all relative", settings.reducedMotion ? "bg-white" : "bg-white/10")}>
          <div className={cn("absolute top-1 w-2 h-2 rounded-full transition-all", settings.reducedMotion ? "right-1 bg-black" : "left-1 bg-white/40")} />
        </div>
      </button>
    </motion.div>
  );
}
