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
          "rounded-[28px] md:rounded-[32px]",
          "md:shadow-lg",
          isFocused && "md:shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
          // Mobile fixed at bottom
          "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:rounded-b-none max-md:rounded-t-[32px] max-md:z-[100] max-md:pb-safe"
        )}
      >
        <div className="flex flex-col">
          {/* Row 1: Input Area */}
          <div className="px-6 pt-3 pb-1 md:pt-5 md:pb-2">
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
                "w-full bg-transparent border-none font-normal leading-tight placeholder:text-gray-500 px-0 resize-none no-scrollbar text-white outline-none transition-all",
                "text-[17px] md:text-[18px] min-h-[36px] md:min-h-[44px]"
              )}
            />
          </div>

          {/* Row 2: Action Bar */}
          <div className="px-4 pb-3 md:pb-4 pt-1 flex items-center justify-between">
            {/* Left Actions */}
            <div className="flex items-center gap-1">
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
                className="w-10 h-10 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center border-none"
                title={t('common.importText')}
              >
                <Plus className="w-[22px] h-[22px]" />
              </button>
              
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all border-none bg-transparent">
                <Wand2 className="w-[18px] h-[18px]" />
                <span className="text-[14px] font-medium">Outils</span>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              <button className="hidden md:flex items-center gap-1 px-3 py-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-all border-none bg-transparent">
                <span className="text-[14px] font-medium">Raisonnement</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </button>

              <div className="flex items-center gap-1">
                <DictationButton 
                  onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
                  size="md"
                />
                
                <button 
                  onClick={() => {
                    if (storyIdea.trim() && !isCreating) {
                      triggerHaptic('medium');
                      onSubmit();
                    }
                  }}
                  disabled={!storyIdea.trim() || isCreating}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-none ml-1",
                    storyIdea.trim() 
                      ? "bg-white text-black hover:bg-gray-200" 
                      : "bg-white/5 text-gray-600 cursor-not-allowed"
                  )}
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </button>
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
