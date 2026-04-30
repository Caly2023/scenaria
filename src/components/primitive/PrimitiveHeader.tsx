import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Maximize2, 
  ChevronDown, 
  ChevronUp,
  MoreVertical,
  Trash2,
  RefreshCw,
  Target,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PrimitiveType } from './Primitive';

interface PrimitiveHeaderProps {
  title: string;
  type: PrimitiveType;
  isEmpty: boolean;
  isGenerating: boolean;
  isSpeaking: boolean;
  isExpanded: boolean;
  mode: 'single' | 'stacked' | 'split';
  onTitleChange?: (title: string) => void;
  onTts: () => void;
  onAiRefine?: () => void;
  onGenerateImage?: () => void;
  onFocus?: () => void;
  onDelete?: () => void;
  onToggleExpand: () => void;
}

export const PrimitiveHeader = ({
  title,
  type,
  isEmpty,
  isGenerating,
  isSpeaking,
  isExpanded,
  mode,
  onTitleChange,
  onTts,
  onAiRefine,
  onGenerateImage,
  onFocus,
  onDelete,
  onToggleExpand
}: PrimitiveHeaderProps) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="flex items-center justify-between px-5 py-4 md:px-12 md:py-10 border-b border-white/5">
      <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
        {type === 'ai_insight' ? (
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-blue-400 shrink-0" />
        ) : (
          <div className={cn(
            "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0",
            (type === 'analysis' || type === 'analysis_block') ? "bg-blue-400 animate-pulse" : 
            (type === 'pitch_result' || type === 'brainstorming_result') ? "bg-green-400" : "bg-white/20"
          )} />
        )}
        {onTitleChange ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-transparent border-none text-lg md:text-lg font-semibold tracking-tight w-full text-white/90 focus:outline-none truncate"
            placeholder={t('common.untitled')}
          />
        ) : (
          <h3 className="text-lg md:text-lg font-semibold tracking-tight text-white/90 truncate">{title}</h3>
        )}
        {isEmpty && type !== 'ai_insight' && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 ml-2 shrink-0">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{t('common.empty')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2 relative" ref={menuRef}>
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={onTts}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isSpeaking ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
            )}
            title={t('common.speaker')}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          {onAiRefine && (
            <button 
              onClick={onAiRefine}
              disabled={isGenerating}
              className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-50"
              title={t('common.aiRefine')}
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </button>
          )}

          {onGenerateImage && (
            <button 
              onClick={onGenerateImage}
              disabled={isGenerating}
              className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-50"
              title={t('common.generateImage')}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {onFocus && (
            <button 
              onClick={onFocus}
              className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
              title={t('common.focus')}
            >
              <Target className="w-4 h-4" />
            </button>
          )}

          {mode === 'stacked' && (
            <button 
              onClick={onToggleExpand}
              className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          <div className="w-[1px] h-6 bg-white/10 mx-1" />
          
          {onDelete && (
            <button 
              onClick={onDelete}
              className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Actions Menu Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center transition-all hover:bg-white/10"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 top-full mt-2 w-56 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden py-2"
            >
              <button 
                onClick={() => { onTts(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-white/80"
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="text-sm font-medium">{isSpeaking ? 'Stop' : t('common.speaker')}</span>
              </button>

              {onAiRefine && (
                <button 
                  onClick={() => { onAiRefine?.(); setIsMenuOpen(false); }}
                  disabled={isGenerating}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-white/80 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('common.aiRefine')}</span>
                </button>
              )}

              {onGenerateImage && (
                <button 
                  onClick={() => { onGenerateImage(); setIsMenuOpen(false); }}
                  disabled={isGenerating}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-white/80 disabled:opacity-50"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('common.generateImage')}</span>
                </button>
              )}

              {onFocus && (
                <button 
                  onClick={() => { onFocus(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-white/80"
                >
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('common.focus')}</span>
                </button>
              )}

              {mode === 'stacked' && (
                <button 
                  onClick={() => { onToggleExpand(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-white/80"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span className="text-sm font-medium">{isExpanded ? 'Collapse' : 'Expand'}</span>
                </button>
              )}

              {onDelete && (
                <>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <button 
                    onClick={() => { onDelete(); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Delete</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
