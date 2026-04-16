import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, memo } from 'react';
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
  Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export type PrimitiveType =
  | 'text'
  | 'analysis'
  | 'gallery'
  | 'analysis_block'
  | 'pitch_result'
  | 'brainstorming_result'
  | 'ai_insight';

interface PrimitiveProps {
  title: string;
  content: string;
  type?: PrimitiveType;
  onContentChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
  onAiRefine?: (feedback?: string) => void;
  onGenerateImage?: () => void;
  onDeepDevelop?: () => void;
  onFocus?: () => void;
  onSpeaker?: () => void;
  onDelete?: () => void;
  images?: string[];
  onImageClick?: (url: string) => void;
  isGenerating?: boolean;
  placeholder?: string;
  tier?: 1 | 2 | 3;
  mode?: 'single' | 'stacked' | 'split';
  visualPrompt?: string;
  isUpdated?: boolean;
}

export const Primitive = memo(function Primitive({ 
  title, 
  content, 
  type = 'text',
  onContentChange, 
  onAiRefine, 
  onGenerateImage,
  onDeepDevelop,
  onFocus,
  onSpeaker,
  onDelete,
  onTitleChange,
  images = [],
  onImageClick,
  isGenerating = false,
  placeholder = "Start writing...",
  mode = 'single',
  visualPrompt,
  isUpdated = false
}: PrimitiveProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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

  // Trigger glow effect when isUpdated changes to true
  useEffect(() => {
    if (isUpdated) {
      setTimeout(() => setShowGlow(true), 0);
      const timer = setTimeout(() => setShowGlow(false), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isUpdated]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Defer content updates for markdown to prevent lag on every keystroke
  const deferredContent = useDeferredValue(content);

  const renderedMarkdown = useMemo(() => (
    <ReactMarkdown>
      {typeof deferredContent === 'string' ? deferredContent : JSON.stringify(deferredContent, null, 2)}
    </ReactMarkdown>
  ), [deferredContent]);

  const handleTts = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    if (onSpeaker) {
      setIsSpeaking(prev => !prev);
      onSpeaker();
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    const isFrench = /[éàèùâêîôûëïü]/.test(content.toLowerCase());
    const lang = isFrench ? 'fr-FR' : 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === lang && v.name.includes('Premium')) || 
                  voices.find(v => v.lang === lang && v.name.includes('Google')) ||
                  voices.find(v => v.lang === lang);
    
    if (voice) utterance.voice = voice;
    utterance.lang = lang;
    utterance.rate = 0.9;

    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [content, isSpeaking, onSpeaker]);

  const handleToggleExpand = useCallback(() => setIsExpanded(prev => !prev), []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group w-full rounded-[32px] overflow-hidden transition-all duration-500",
        type === 'ai_insight' ? "bg-white/5 border border-white/10 shadow-none" : "bg-[#212121] shadow-2xl border border-white/5",
        (type === 'analysis' || type === 'analysis_block') && "border-white/20 bg-white/5",
        (type === 'pitch_result' || type === 'brainstorming_result') && "border-white/10 bg-[#252525]",
        showGlow && "ring-2 ring-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]",
        mode === 'single' ? "min-h-[400px] md:min-h-[600px] flex flex-col" : "mb-4 md:mb-6"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 md:px-12 md:py-10 border-b border-white/5">
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
              className="bg-transparent border-none text-lg md:text-xl font-semibold tracking-tight w-full text-white/90 focus:outline-none truncate"
              placeholder={t('common.untitled')}
            />
          ) : (
            <h3 className="text-lg md:text-xl font-semibold tracking-tight text-white/90 truncate">{title}</h3>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-2 relative" ref={menuRef}>
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={handleTts}
              aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
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
                onClick={() => onAiRefine?.()}
                disabled={isGenerating}
                aria-label="Refine with AI"
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
                aria-label="Generate Image"
                className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-50"
                title={t('common.generateImage')}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {onFocus && (
              <button 
                onClick={onFocus}
                aria-label="Enter Focus Mode"
                className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
                title={t('common.focus')}
              >
                <Target className="w-4 h-4" />
              </button>
            )}

            {mode === 'stacked' && (
              <button 
                onClick={handleToggleExpand}
                aria-label={isExpanded ? "Collapse" : "Expand"}
                className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}

            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            
            {onDelete && (
              <button 
                onClick={onDelete}
                aria-label="Delete block"
                className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Actions Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="More options" 
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
                  onClick={() => { handleTts(); setIsMenuOpen(false); }}
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
                    onClick={() => { handleToggleExpand(); setIsMenuOpen(false); }}
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

      {/* Body */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Horizontal Image Gallery (for characters/locations) */}
            {type === 'gallery' && images.length > 0 && (
              <div className="px-10 py-4 border-b border-white/5 bg-black/10">
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {images.map((url, i) => (
                    <motion.div
                      key={url}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative h-32 aspect-square rounded-2xl overflow-hidden group/img cursor-pointer shrink-0"
                      onClick={() => onImageClick?.(url)}
                    >
                      <img 
                        src={url} 
                        alt={`View ${i + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  ))}
                  {onGenerateImage && (
                    <button
                      onClick={onGenerateImage}
                      disabled={isGenerating}
                      aria-label="Add new view"
                      className="h-32 aspect-square rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all shrink-0 text-white/20 hover:text-white/40"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-[8px] font-semibold uppercase tracking-widest">{t('common.add')}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col">
              {/* Text Area */}
              <div className="p-8 md:p-12 space-y-8 md:space-y-12">
                <div className="relative group/text">
                  {onContentChange ? (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => onContentChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-transparent border-none text-white font-sans text-base md:text-lg leading-relaxed resize-none no-scrollbar placeholder:text-white/30 min-h-[120px]"
                    />
                  ) : (
                    <div className="prose prose-invert max-w-none font-sans text-lg md:text-xl leading-[1.6] text-white/90">
                      {renderedMarkdown}
                    </div>
                  )}
                  
                  {onContentChange && content && (
                    <div className="mt-8 md:mt-12 pt-8 md:pt-12 border-t border-white/5 prose prose-invert max-w-none text-base md:text-lg opacity-80">
                      {renderedMarkdown}
                    </div>
                  )}
                </div>

                {/* Deep Develop Button (Gray style) */}
                {type === 'gallery' && onDeepDevelop && (
                  <div className="flex justify-start">
                    <button
                      onClick={onDeepDevelop}
                      disabled={isGenerating}
                      aria-label="Deep Develop"
                      className="px-8 py-3.5 rounded-full bg-[#2a2a2a] text-white/70 border border-white/5 text-xs uppercase font-bold hover:bg-[#333333] hover:text-white transition-all active:scale-95 disabled:opacity-50 tracking-wider"
                    >
                      {t('common.deepDevelop', { defaultValue: 'Deep Develop' })}
                    </button>
                  </div>
                )}
              </div>

              {/* Empty State for Gallery (if no images yet) */}
              {type === 'gallery' && images.length === 0 && (
                <div className="px-10 pb-10">
                  <div 
                    onClick={onGenerateImage}
                    className="aspect-video rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center p-8 text-center gap-4 opacity-40 cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <Sparkles className="w-10 h-10" />
                    <div className="space-y-3">
                      <span className="text-sm font-bold uppercase tracking-[0.2em] block text-white/60">{t('common.visualDescriptionReady')}</span>
                      {visualPrompt && (
                        <p className="text-xs text-secondary italic max-w-xs mx-auto leading-relaxed">"{visualPrompt}"</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
