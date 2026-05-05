import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUp, ChevronDown, Wand2, Sparkles } from 'lucide-react';
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
    <div className="w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "relative w-full transition-all duration-500",
          "bg-[#161616]/40 backdrop-blur-3xl border border-white/5 focus-within:border-white/10",
          "rounded-[28px] p-2 pl-6",
          isFocused ? "bg-[#161616]/60 shadow-2xl" : "shadow-lg"
        )}
      >
        <div className="flex items-end gap-4">
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
              "flex-1 bg-transparent border-none font-light leading-relaxed placeholder:text-white/20 px-0 py-4 resize-none no-scrollbar text-white outline-none transition-all",
              "text-base md:text-[18px] min-h-[56px] max-h-[400px]"
            )}
          />

          <div className="flex items-center gap-2 pb-1.5 pr-1.5">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileImport} 
              className="hidden" 
              accept=".txt,.md"
            />
            
            <DictationButton 
              onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
              size="md"
            />

            <button 
              onClick={() => {
                triggerHaptic('medium');
                onSubmit();
              }}
              disabled={isCreating || !storyIdea.trim()}
              className={cn(
                "w-12 h-12 rounded-[20px] flex items-center justify-center transition-all duration-500 border-none",
                "bg-white text-black hover:bg-neutral-200 disabled:opacity-0 disabled:scale-90"
              )}
            >
              {isCreating ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-6 h-6 stroke-[2.5px]" />
              )}
            </button>
          </div>
        </div>
      </motion.div>


      <AnimatePresence>
        {creationError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-[20px] flex items-center gap-4 text-red-400 text-sm shadow-xl"
          >
            <p className="flex-1 font-medium">{creationError}</p>
            <button 
              onClick={() => {
                triggerHaptic('light');
                setCreationError(null);
              }}
              className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
