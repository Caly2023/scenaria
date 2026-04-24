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
  Plus,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MarkdownDisplay } from '@/components/ui/MarkdownDisplay';
import { ttsService } from '@/services/ttsService';

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
  onRegenerate?: () => void;
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
  onRegenerate,
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

  // Defer content updates to prevent lag
  const deferredContent = useDeferredValue(content);

  const safeContent = typeof deferredContent === 'string' ? deferredContent : JSON.stringify(deferredContent, null, 2);

  const handleTts = useCallback(() => {
    if (onSpeaker) {
      setIsSpeaking(prev => !prev);
      onSpeaker();
      return;
    }

    const msgId = `primitive-${title}-${content.slice(0, 20)}`;
    
    if (ttsService.isSpeaking(msgId)) {
      ttsService.cancel();
      setIsSpeaking(false);
      return;
    }

    ttsService.speak(
      content,
      msgId,
      [], // No project languages available here, falls back to content detection
      () => setIsSpeaking(false)
    );
    setIsSpeaking(true);
  }, [content, title, onSpeaker]);

  const isEmpty = useMemo(() => {
    if (!content) return true;
    const trimmed = content.trim();
    return trimmed === '' || trimmed === '...' || trimmed === '[]' || trimmed === '{}';
  }, [content]);

  const handleToggleExpand = useCallback(() => setIsExpanded(prev => !prev), []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group w-full rounded-[32px] overflow-hidden transition-all duration-500 relative",
        type === 'ai_insight' ? "bg-white/5 border border-white/10 shadow-none" : "bg-[#212121] shadow-2xl border border-white/5",
        (type === 'analysis' || type === 'analysis_block') && "border-white/20 bg-white/5",
        (type === 'pitch_result' || type === 'brainstorming_result') && "border-white/10 bg-[#252525]",
        isEmpty && type !== 'ai_insight' && "border-amber-500/30 bg-amber-500/[0.02]",
        showGlow && "ring-2 ring-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]",
        mode === 'single' ? "min-h-[400px] md:min-h-[600px] flex flex-col" : "mb-4 md:mb-6"
      )}
    >
      {isEmpty && type !== 'ai_insight' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/50 z-10" />
      )}
      {/* Header */}
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
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{t('common.empty', { defaultValue: 'Empty' })}</span>
            </div>
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
              <div className="px-5 py-4 md:px-10 border-b border-white/5 bg-black/10">
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
              <div className="p-5 md:p-12 space-y-6 md:space-y-12">
                <div className="relative group/text">
                  {onContentChange ? (
                    <RichTextEditor
                      content={content}
                      onChange={onContentChange}
                      placeholder={placeholder}
                      className="text-lg md:text-lg"
                    />
                  ) : (
                    <MarkdownDisplay
                      content={safeContent}
                      className="text-lg md:text-lg"
                    />
                  )}
                </div>

                {/* Empty State Action */}
                {isEmpty && (onRegenerate || onAiRefine) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-12 md:py-24 border-2 border-dashed border-white/5 rounded-[24px] bg-white/[0.02]"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                      <Sparkles className="w-8 h-8 text-amber-500/50" />
                    </div>
                    <h4 className="text-xl font-semibold text-white/90 mb-2">{t('common.emptyPrimitive', { defaultValue: 'This section is empty' })}</h4>
                    <p className="text-secondary text-center max-w-md mb-8">
                      {t('common.emptyPrimitiveDesc', { defaultValue: 'Launch a generation to let the AI create content for this section based on your project context.' })}
                    </p>
                    <button
                      onClick={() => (onRegenerate || onAiRefine)?.()}
                      disabled={isGenerating}
                      className="group relative px-8 py-4 bg-white text-black rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 overflow-hidden"
                    >
                      <div className="relative z-10 flex items-center gap-3">
                        {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        <span>{t('common.generateContent', { defaultValue: 'Generate Content' })}</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                    </button>
                  </motion.div>
                )}

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
                <div className="px-5 pb-6 md:px-10 md:pb-10">
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
