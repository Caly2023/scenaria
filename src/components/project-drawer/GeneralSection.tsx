import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ProjectMetadata } from '@/types';

interface GeneralSectionProps {
  localMeta: ProjectMetadata;
  isSaving: boolean;
  isMobile: boolean;
  handleChange: (field: keyof ProjectMetadata, value: string) => void;
  getFieldError: (field: keyof ProjectMetadata) => string | undefined;
}

export function GeneralSection({
  localMeta,
  isSaving,
  isMobile,
  handleChange,
  getFieldError,
}: GeneralSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={cn('space-y-4 bg-[#161616] p-4 rounded-2xl border border-white/10', isMobile && 'space-y-5 rounded-3xl p-5')}>
      <div className="space-y-2">
        <div className="flex items-center justify-between ml-1">
          <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold', isMobile && 'text-[11px]')}>
            {t('common.title')}
          </label>
          <span className={cn('text-[10px] text-white/30 font-mono', isMobile && 'text-xs')}>
            {localMeta.title?.length || 0}/100
          </span>
        </div>
        <input
          type="text"
          value={localMeta.title}
          disabled={isSaving}
          onChange={(e) => handleChange('title', e.target.value)}
          className={cn(
            'w-full bg-[#121212] border rounded-xl px-4 h-12 text-base font-semibold transition-all text-white focus:border-white/20 outline-none',
            isMobile && 'h-14 text-lg rounded-2xl',
            getFieldError('title') ? 'border-red-500/50' : 'border-white/10'
          )}
        />
        {getFieldError('title') && (
          <p className={cn('text-xs text-red-500 ml-2 flex items-center gap-1', isMobile && 'text-sm')}>
            <AlertCircle className={cn('w-3 h-3', isMobile && 'w-4 h-4')} /> {getFieldError('title')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
          {t('stages.Logline.label', { defaultValue: 'Logline' })}
        </label>
        <textarea
          value={localMeta.logline}
          disabled={isSaving}
          onChange={(e) => handleChange('logline', e.target.value)}
          rows={isMobile ? 3 : 2}
          className={cn(
            'w-full bg-[#121212] border border-white/10 rounded-2xl px-4 py-3 text-sm font-medium transition-all text-white resize-none no-scrollbar focus:border-white/20 outline-none',
            isMobile && 'text-base py-4 px-5'
          )}
        />
      </div>

      <div className="space-y-2">
        <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
          Synopsis
        </label>
        <textarea
          value={localMeta.synopsis || ''}
          disabled={isSaving}
          onChange={(e) => handleChange('synopsis', e.target.value)}
          rows={isMobile ? 5 : 4}
          className={cn(
            'w-full bg-[#121212] border border-white/10 rounded-2xl px-4 py-3 text-sm font-medium transition-all text-white resize-none no-scrollbar focus:border-white/20 outline-none',
            isMobile && 'text-base py-4 px-5'
          )}
        />
      </div>

      <div className="space-y-2">
        <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
          Notes de Production
        </label>
        <textarea
          value={localMeta.productionNotes || ''}
          disabled={isSaving}
          onChange={(e) => handleChange('productionNotes', e.target.value)}
          rows={isMobile ? 5 : 4}
          className={cn(
            'w-full bg-[#121212] border border-white/10 rounded-2xl px-4 py-3 text-sm font-medium transition-all text-white resize-none no-scrollbar focus:border-white/20 outline-none',
            isMobile && 'text-base py-4 px-5'
          )}
        />
      </div>
    </section>
  );
}
