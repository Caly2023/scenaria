import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ProjectMetadata } from '@/types';

interface DetailsSectionProps {
  localMeta: ProjectMetadata;
  isSaving: boolean;
  isMobile: boolean;
  handleChange: (field: keyof ProjectMetadata, value: string) => void;
  getFieldError: (field: keyof ProjectMetadata) => string | undefined;
}

export function DetailsSection({
  localMeta,
  isSaving,
  isMobile,
  handleChange,
  getFieldError,
}: DetailsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={cn('space-y-4 bg-[#161616] p-4 rounded-2xl border border-white/10', isMobile && 'space-y-5 rounded-3xl p-5')}>
      {(['format', 'genre', 'tone'] as const).map((field) => (
        <div key={field} className="space-y-2">
          <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
            {field === 'format' ? t('common.format') : field === 'genre' ? t('common.genre') : t('common.tone')}
          </label>
          <input
            type="text"
            value={localMeta[field]}
            disabled={isSaving}
            onChange={(e) => handleChange(field, e.target.value)}
            className={cn(
              'w-full bg-[#121212] border rounded-xl px-4 h-11 text-sm font-medium transition-all text-white focus:border-white/20 outline-none',
              isMobile && 'h-12 text-base rounded-2xl',
              getFieldError(field) ? 'border-red-500/50' : 'border-white/10'
            )}
          />
          {getFieldError(field) && (
            <p className={cn('text-xs text-red-500 ml-2 flex items-center gap-1', isMobile && 'text-sm')}>
              <AlertCircle className={cn('w-3 h-3', isMobile && 'w-4 h-4')} /> {getFieldError(field)}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
