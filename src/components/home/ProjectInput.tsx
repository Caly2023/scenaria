import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { DictationButton } from '../ui/DictationButton';

interface ProjectInputProps {
  storyIdea: string;
  setStoryIdea: React.Dispatch<React.SetStateAction<string>>;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  isCreating: boolean;
  creationStatus: string;
  creationError: string | null;
  setCreationError: (error: string | null) => void;
  onSubmit: () => void;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProjectInput({
  storyIdea,
  setStoryIdea,
  isFocused,
  setIsFocused,
  isCreating,
  creationStatus,
  creationError,
  setCreationError,
  onSubmit,
  handleFileImport
}: ProjectInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full md:max-w-4xl md:mx-auto md:space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "relative w-full transition-all duration-700 ease-[0.23, 1, 0.32, 1]",
          "bg-[#1e1e1e] border border-white/10",
          "rounded-[28px] md:rounded-[32px]",
          isFocused ? "bg-[#252525] border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]" : "shadow-xl"
        )}
      >
        <div className="flex flex-col min-h-[100px]">
          {/* Input Area */}
          <div className="p-4 md:p-5 pb-1">
            <textarea
              ref={textareaRef}
              value={storyIdea}
              onChange={(e) => {
                setStoryIdea(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 400)}px`;
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={t('common.homePlaceholder')}
              className={cn(
                "w-full bg-transparent border-none font-semibold leading-relaxed placeholder:text-white/40 px-2 resize-none no-scrollbar text-white selection:bg-[#D4AF37]/30 outline-none transition-all",
                "text-base md:text-lg min-h-[40px]"
              )}
            />
          </div>

          {/* Action Bar */}
          <div className="px-4 md:px-6 pb-4 pt-2 flex items-center justify-between gap-3 mt-auto">
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                className="hidden" 
                accept=".txt,.md"
              />
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  fileInputRef.current?.click();
                }}
                className="w-10 h-10 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all flex items-center justify-center border-none"
                title={t('common.importText')}
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <DictationButton 
                onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
                size="md"
              />
            </div>

            <button 
              onClick={() => {
                triggerHaptic('medium');
                onSubmit();
              }}
              disabled={!storyIdea.trim() || isCreating}
              className={cn(
                "h-10 px-6 rounded-full flex items-center gap-2 transition-all duration-300 border-none relative overflow-hidden group",
                storyIdea.trim() && !isCreating
                  ? "bg-white text-black hover:bg-white/90 scale-100 hover:scale-[1.02]" 
                  : "bg-white/5 text-white/10 cursor-not-allowed"
              )}
            >
              <span className="text-xs font-bold uppercase tracking-widest relative z-10">
                {isCreating ? creationStatus : (
                  <span className="flex items-center gap-2">
                    <span>Envoyer</span>
                    <ArrowUp className="w-4 h-4" />
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {creationError && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="px-8 py-5 bg-red-500/10 border border-red-500/20 backdrop-blur-3xl rounded-[24px] flex items-center gap-4 text-red-400 text-sm shadow-2xl"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            <p className="flex-1 font-semibold tracking-wide">{creationError}</p>
            <button 
              onClick={() => {
                triggerHaptic('light');
                setCreationError(null);
              }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              title="Dismiss"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
