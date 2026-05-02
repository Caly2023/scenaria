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
    <div className="w-full md:max-w-4xl md:mx-auto md:space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "relative w-full transition-all duration-300",
          "bg-[#1e1f20] border-none",
          "rounded-[32px]",
          isFocused ? "shadow-[0_4px_20px_rgba(0,0,0,0.5)]" : "shadow-lg"
        )}
      >
        <div className="flex flex-col">
          {/* Row 1: Input Area */}
          <div className="px-5 pt-5 pb-2">
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
                "w-full bg-transparent border-none font-medium leading-relaxed placeholder:text-gray-400 px-1 resize-none no-scrollbar text-white outline-none transition-all",
                "text-base md:text-[17px] min-h-[44px]"
              )}
            />
          </div>

          {/* Row 2: Action Bar */}
          <div className="px-4 pb-4 pt-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
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
                className="w-10 h-10 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all flex items-center justify-center border-none"
                title={t('common.importText')}
              >
                <Plus className="w-[22px] h-[22px]" />
              </button>
              
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-all">
                <Wand2 className="w-4 h-4" />
                <span className="text-[13px] font-medium">Outils</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer transition-all">
                <span className="text-[13px] font-medium">Raisonnement</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </div>

              <div className="flex items-center gap-2">
                <DictationButton 
                  onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
                  size="md"
                />
                
                {storyIdea.trim() && (
                  <button 
                    onClick={() => {
                      triggerHaptic('medium');
                      onSubmit();
                    }}
                    disabled={isCreating}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-none",
                      "bg-white text-black hover:bg-gray-200"
                    )}
                  >
                    {isCreating ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <ArrowUp className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
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
