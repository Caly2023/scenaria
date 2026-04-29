import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface DangerSectionProps {
  isSaving: boolean;
  isMobile: boolean;
  onDelete: () => void;
  onClose: () => void;
}

export function DangerSection({
  isSaving,
  isMobile,
  onDelete,
  onClose,
}: DangerSectionProps) {
  const { t } = useTranslation();

  return (
    <section className={cn('bg-red-500/5 p-4 rounded-2xl border border-red-500/20 space-y-3', isMobile && 'rounded-3xl p-5 space-y-4')}>
      <button
        onClick={() => {
          triggerHaptic('warning');
          onClose();
          onDelete();
        }}
        disabled={isSaving}
        className={cn(
          'w-full h-12 rounded-2xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50',
          isMobile && 'h-14 text-base'
        )}
      >
        <Trash2 className={cn('w-4 h-4', isMobile && 'w-5 h-5')} />
        {t('common.deleteProject', { defaultValue: 'Delete Project' })}
      </button>
    </section>
  );
}
