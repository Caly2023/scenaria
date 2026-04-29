import React from 'react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface LanguageSectionProps {
  currentLanguage: string;
  isMobile: boolean;
  onLanguageChange: (lang: string) => void;
  onBack: () => void;
}

export function LanguageSection({
  currentLanguage,
  isMobile,
  onLanguageChange,
  onBack,
}: LanguageSectionProps) {
  return (
    <section className={cn("bg-[#161616] p-4 rounded-2xl border border-white/10 space-y-3", isMobile && "rounded-3xl p-5 space-y-4")}>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'fr', label: 'Francais' },
          { value: 'en', label: 'English' },
        ].map((option) => {
          const isActive = currentLanguage.startsWith(option.value);
          return (
            <button
              key={option.value}
              onClick={() => {
                triggerHaptic('light');
                onLanguageChange(option.value);
                onBack();
              }}
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
                isMobile && 'rounded-2xl py-3.5 text-base',
                isActive
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111111] text-white/80 border-white/10 hover:border-white/20 hover:bg-white/5',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
