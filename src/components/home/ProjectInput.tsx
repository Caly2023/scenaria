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
    <div className="w-full space-y-4 md:space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "w-full bg-white/[0.03] backdrop-blur-2xl transition-all duration-500 overflow-hidden border border-white/10",
          "rounded-[28px] md:rounded-[32px]",
          isFocused ? "border-white/20 bg-white/[0.05] shadow-[0_0_40px_rgba(255,255,255,0.03)]" : ""
        )}
      >
        <div className="flex flex-col">
          {/* Input Area */}
          <div className="p-4 md:p-12 pb-2 md:pb-6">
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
              className={cn(
                "w-full bg-transparent border-none font-normal leading-relaxed placeholder:text-white/30 px-2 resize-none no-scrollbar text-white/95 selection:bg-white/30 outline-none transition-all",
                "text-base md:text-xl min-h-[80px] md:min-h-[150px]"
              )}
            />
          </div>

          {/* Action Bar */}
          <div className="px-4 md:px-12 pb-4 md:pb-10 pt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 md:gap-3 p-1 md:p-1.5 bg-white/5 rounded-full border border-white/5 shrink-0">
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
                className="w-8 h-8 md:w-10 md:h-10 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-all flex items-center justify-center group relative border-none"
                title={t('common.importText')}
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <DictationButton 
                onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
                size={window.innerWidth < 768 ? "sm" : "md"}
              />
            </div>

            <button 
              onClick={() => {
                triggerHaptic('medium');
                onSubmit();
              }}
              disabled={!storyIdea.trim() || isCreating}
              className={cn(
                "h-10 md:h-12 px-5 md:px-10 rounded-full flex items-center gap-2 md:gap-4 transition-all duration-500 border-none",
                storyIdea.trim() && !isCreating
                  ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                  : "bg-white/5 text-white/10 cursor-not-allowed border border-white/10"
              )}
            >
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                {isCreating ? creationStatus : (
                  <span className="flex items-center gap-2">
                    <span className="hidden xs:inline">Create</span>
                    <ArrowUp className="w-4 h-4" />
                  </span>
                )}
              </span>
              {isCreating && (
                <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
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
