import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeSectionProps {
  theme: ThemeMode;
  isMobile: boolean;
  onThemeChange: (theme: ThemeMode) => void;
  onBack: () => void;
}

export function ThemeSection({
  theme,
  isMobile,
  onThemeChange,
  onBack,
}: ThemeSectionProps) {
  return (
    <section className={cn("bg-[#161616] p-4 rounded-2xl border border-white/10 space-y-3", isMobile && "rounded-3xl p-5 space-y-4")}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { value: 'dark' as ThemeMode, label: 'Sombre', icon: Moon },
          { value: 'light' as ThemeMode, label: 'Clair', icon: Sun },
          { value: 'system' as ThemeMode, label: 'Systeme', icon: Monitor },
        ].map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              onClick={() => {
                triggerHaptic('light');
                onThemeChange(option.value);
                onBack();
              }}
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                isMobile && 'rounded-2xl py-3.5 text-base',
                isActive
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111111] text-white/80 border-white/10 hover:border-white/20 hover:bg-white/5',
              )}
            >
              <Icon className={cn("w-4 h-4", isMobile && "w-5 h-5")} />
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
