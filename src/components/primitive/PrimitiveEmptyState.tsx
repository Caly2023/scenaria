import { motion } from 'motion/react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrimitiveEmptyStateProps {
  isGenerating: boolean;
  onRegenerate?: () => void;
  onAiRefine?: () => void;
}

export const PrimitiveEmptyState = ({
  isGenerating,
  onRegenerate,
  onAiRefine
}: PrimitiveEmptyStateProps) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 md:py-24 border-2 border-dashed border-white/5 rounded-[24px] bg-white/[0.02]"
    >
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-amber-500/50" />
      </div>
      <h4 className="text-xl font-semibold text-white/90 mb-2">{t('common.emptyPrimitive', { defaultValue: 'This section is empty' })}</h4>
      <p className="text-secondary text-center max-w-md mb-8">
        {t('common.emptyPrimitiveDesc', { defaultValue: 'Launch a generation to let the AI create content for this section based on your project context.' })}
      </p>
      <button
        onClick={() => (onRegenerate || onAiRefine)?.()}
        disabled={isGenerating}
        className="group relative px-8 py-4 bg-white text-black rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 overflow-hidden"
      >
        <div className="relative z-10 flex items-center gap-3">
          {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          <span>{t('common.generateContent', { defaultValue: 'Generate Content' })}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity" />
      </button>
    </motion.div>
  );
};
