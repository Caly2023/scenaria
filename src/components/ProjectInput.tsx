import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { DictationButton } from './DictationButton';

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
    <div className="w-full space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "w-full bg-white/[0.03] backdrop-blur-2xl rounded-[32px] transition-all duration-500 overflow-hidden border border-white/10",
          isFocused ? "border-white/20 bg-white/[0.04]" : ""
        )}
      >
        <div className="p-6 md:p-12 space-y-7 md:space-y-6">
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
            placeholder={t('common.whatsTheStory')}
            className="w-full bg-transparent border-none text-lg md:text-xl font-normal leading-relaxed placeholder:text-white/45 px-2 min-h-[150px] resize-none no-scrollbar text-white/95 selection:bg-white/30"
          />
        </div>

        <div className="px-6 md:px-12 pb-8 md:pb-10 pt-3 md:pt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 p-1.5 bg-white/5 rounded-full border border-white/5 shrink-0">
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
              className="w-10 h-10 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center group relative border-none"
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
              "h-12 px-8 md:px-10 rounded-full flex items-center gap-3 md:gap-4 transition-all duration-500 border-none",
              storyIdea.trim() && !isCreating
                ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
            )}
          >
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              {isCreating ? creationStatus : 'Create'}
            </span>
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {creationError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-6 py-4 bg-red-500/10 border border-red-500/20 backdrop-blur-xl rounded-2xl flex items-center gap-3 text-red-400 text-sm"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <p className="flex-1 font-medium">{creationError}</p>
            <button 
              onClick={() => {
                triggerHaptic('light');
                setCreationError(null);
              }}
              className="text-red-400/50 hover:text-red-400 transition-colors"
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
