import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ProjectMetadata } from '@/types';
import { triggerHaptic } from '@/lib/haptics';

interface LanguagesSectionProps {
  localMeta: ProjectMetadata;
  isSaving: boolean;
  isMobile: boolean;
  handleChange: (field: keyof ProjectMetadata, value: string) => void;
}

export function LanguagesSection({
  localMeta,
  isSaving,
  isMobile,
  handleChange,
}: LanguagesSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={cn('space-y-4 bg-[#161616] p-4 rounded-2xl border border-white/10', isMobile && 'space-y-5 rounded-3xl p-5')}>
      <div className="space-y-2">
        <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
          {t('common.targetDuration')}
        </label>
        <input
          type="text"
          value={localMeta.targetDuration}
          disabled={isSaving}
          onChange={(e) => handleChange('targetDuration', e.target.value)}
          className={cn(
            'w-full bg-[#121212] border border-white/10 rounded-xl px-4 h-11 text-sm font-medium transition-all text-white focus:border-white/20 outline-none',
            isMobile && 'h-12 text-base rounded-2xl'
          )}
        />
      </div>

      <div className="space-y-3">
        <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
          {t('common.languages')}
        </label>
        <div className="flex flex-wrap gap-2">
          {localMeta.languages?.map((lang, idx) => (
            <span key={idx} className={cn('yt-chip bg-white/5 text-white/70 border-white/10', isMobile && 'text-sm px-3 py-1.5')}>
              {lang}
            </span>
          ))}
          <button
            disabled={isSaving}
            onClick={() => triggerHaptic('light')}
            className={cn('yt-chip bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all border-dashed', isMobile && 'text-sm px-3 py-1.5')}
          >
            + {t('common.add', { defaultValue: 'Add' })}
          </button>
        </div>
      </div>
    </section>
  );
}
