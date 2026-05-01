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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "relative w-full transition-all duration-700 ease-[0.23, 1, 0.32, 1]",
          "bg-white/[0.03] backdrop-blur-3xl border border-white/10",
          "rounded-[32px] md:rounded-[40px]",
          isFocused ? "border-white/20 bg-white/[0.05] shadow-[0_0_80px_rgba(212,175,55,0.05)] ring-1 ring-white/10" : "shadow-2xl"
        )}
      >
        {/* Top Glow Accent */}
        <div className={cn(
          "absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent transition-opacity duration-1000",
          isFocused ? "opacity-100" : "opacity-0"
        )} />

        <div className="flex flex-col">
          {/* Input Area */}
          <div className="p-6 md:p-10 pb-2 md:pb-4">
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
                "w-full bg-transparent border-none font-medium leading-relaxed placeholder:text-white/20 px-2 resize-none no-scrollbar text-white selection:bg-[#D4AF37]/30 outline-none transition-all",
                "text-lg md:text-2xl min-h-[100px] md:min-h-[160px]"
              )}
            />
          </div>

          {/* Action Bar */}
          <div className="px-6 md:px-10 pb-6 md:pb-8 pt-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3 p-1.5 bg-white/5 rounded-2xl border border-white/5 shrink-0">
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
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center group relative border-none"
                title={t('common.importText')}
              >
                <Plus className="w-5 h-5 md:w-6 md:h-6" />
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Import File
                </div>
              </button>
              
              <div className="w-px h-6 bg-white/10 mx-1" />
              
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
                "h-12 md:h-16 px-8 md:px-12 rounded-2xl md:rounded-3xl flex items-center gap-3 md:gap-4 transition-all duration-500 border-none relative overflow-hidden group",
                storyIdea.trim() && !isCreating
                  ? "bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]" 
                  : "bg-white/5 text-white/10 cursor-not-allowed border border-white/10"
              )}
            >
              {storyIdea.trim() && !isCreating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              )}
              
              <span className="text-xs md:text-sm font-black uppercase tracking-[0.25em] relative z-10">
                {isCreating ? creationStatus : (
                  <span className="flex items-center gap-3">
                    <span>Begin Journey</span>
                    <ArrowUp className="w-5 h-5" />
                  </span>
                )}
              </span>
              
              {isCreating && (
                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black/20 border-t-black rounded-full animate-spin relative z-10" />
              )}
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
