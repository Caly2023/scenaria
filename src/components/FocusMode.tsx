import React from 'react';
import { 
  Target, 
  X, 
  Sparkles, 
  Mic,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onContentChange: (content: string) => void;
  onAiMagic: () => void;
  onTts: () => void;
  isGenerating?: boolean;
}

export function FocusMode({ 
  isOpen, 
  onClose, 
  title, 
  content, 
  onContentChange, 
  onAiMagic, 
  onTts,
  isGenerating = false
}: FocusModeProps) {
  const { t } = useTranslation();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#0f0f0f] flex flex-col items-center justify-center p-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-4xl flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <Target className="w-6 h-6 text-white/40" />
                <h2 className="text-2xl font-bold tracking-tighter text-white/80">{title}</h2>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={onAiMagic}
                  disabled={isGenerating}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white flex items-center justify-center disabled:opacity-50"
                  title={t('common.aiRefine')}
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
                <button 
                  onClick={onTts}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white flex items-center justify-center"
                  title={t('common.speaker')}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <div className="w-[1px] h-6 bg-white/10 mx-2" />
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white flex items-center justify-center"
                  title={t('common.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder={t('common.deepNightWriting')}
                className="w-full h-full bg-transparent border-none focus:ring-0 text-white font-sans text-3xl leading-relaxed resize-none no-scrollbar placeholder:text-white/5"
                autoFocus
              />
            </div>

            <div className="mt-12 flex items-center justify-center gap-8">
              <div className="px-6 py-3 rounded-full glass text-[10px] uppercase tracking-widest font-bold text-white/20">
                {t('common.focusModeActive')}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
