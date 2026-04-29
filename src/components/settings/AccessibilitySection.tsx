import React from 'react';
import { Contrast, Type, MoveHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

interface AccessibilitySectionProps {
  settings: AccessibilitySettings;
  isMobile: boolean;
  onToggle: (key: keyof AccessibilitySettings) => void;
}

export function AccessibilitySection({
  settings,
  isMobile,
  onToggle,
}: AccessibilitySectionProps) {
  const items = [
    {
      key: 'highContrast' as keyof AccessibilitySettings,
      label: 'Contraste eleve',
      icon: Contrast,
    },
    {
      key: 'largeText' as keyof AccessibilitySettings,
      label: 'Texte agrandi',
      icon: Type,
    },
    {
      key: 'reducedMotion' as keyof AccessibilitySettings,
      label: 'Animations reduites',
      icon: MoveHorizontal,
    },
  ];

  return (
    <section className={cn("bg-[#161616] p-4 rounded-2xl border border-white/10 space-y-3", isMobile && "rounded-3xl p-5 space-y-4")}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = settings[item.key];
        return (
          <button
            key={item.key}
            onClick={() => {
              triggerHaptic('light');
              onToggle(item.key);
            }}
            className={cn("w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#111111] px-4 py-3 hover:bg-white/5 transition-colors", isMobile && "rounded-2xl px-5 py-4")}
          >
            <span className="flex items-center gap-3 text-white">
              <Icon className={cn("w-4 h-4 text-white/50", isMobile && "w-5 h-5")} />
              <span className={cn("text-sm font-medium", isMobile && "text-base")}>{item.label}</span>
            </span>
            <span
              className={cn(
                'w-10 h-5 rounded-full transition-all relative',
                isActive ? 'bg-white' : 'bg-white/10',
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-3 h-3 rounded-full transition-all',
                  isActive ? 'right-1 bg-black' : 'left-1 bg-white/40',
                )}
              />
            </span>
          </button>
        );
      })}
    </section>
  );
}
