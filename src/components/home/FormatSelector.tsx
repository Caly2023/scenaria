import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ProjectFormat } from '@/types';

interface FormatSelectorProps {
  selectedFormat: ProjectFormat | 'Auto';
  setSelectedFormat: (format: ProjectFormat | 'Auto') => void;
}

export function FormatSelector({ selectedFormat, setSelectedFormat }: FormatSelectorProps) {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-3 md:pb-2 px-2 md:px-4"
    >
      {['Auto', 'Short Film', 'Feature', 'Series'].map((format) => (
        <button
          key={format}
          onClick={() => {
            triggerHaptic('light');
            setSelectedFormat(format as ProjectFormat | 'Auto');
          }}
          className={cn(
            "px-6 py-3 rounded-full text-xs md:text-sm font-bold tracking-[0.1em] uppercase transition-all border whitespace-nowrap",
            selectedFormat === format 
              ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110" 
              : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          {format === 'Auto' ? t('common.autoDetect', { defaultValue: 'Auto-détection' }) : format}
        </button>
      ))}
    </motion.div>
  );
}
