import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react';
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

export type PrimitiveType = 'text' | 'analysis' | 'gallery' | 'analysis_block' | 'pitch_result' | 'ai_insight';

interface PrimitiveProps {
  title: string;
  content: string;
  type?: PrimitiveType;
  onContentChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
  onAiRefine?: () => void;
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

export const Primitive = React.memo(function Primitive({ 
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
  tier,
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showGlow, setShowGlow] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Trigger glow effect when isUpdated changes to true
  useEffect(() => {
    if (isUpdated) {
      setShowGlow(true);
      const timer = setTimeout(() => setShowGlow(false), 2000);
      return () => clearTimeout(timer);
    }
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

  // Memoize markdown renders — avoids re-parsing on every keystroke
  const renderedMarkdown = useMemo(() => (
    <ReactMarkdown>{deferredContent}</ReactMarkdown>
  ), [deferredContent]);

  const handleTts = useCallback(() => {
    if (onSpeaker) {
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
        type === 'pitch_result' && "border-white/10 bg-[#252525]",
        showGlow && "ring-4 ring-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)]",
        mode === 'single' ? "min-h-[600px] flex flex-col" : "mb-6"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-8 border-b border-white/5">
        <div className="flex items-center gap-4 flex-1">
          {type === 'ai_insight' ? (
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
          ) : (
            <div className={cn(
              "w-2 h-2 rounded-full shrink-0",
              (type === 'analysis' || type === 'analysis_block') ? "bg-blue-400 animate-pulse" : 
              type === 'pitch_result' ? "bg-green-400" : "bg-white/20"
            )} />
          )}
          {onTitleChange ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="bg-transparent border-none text-base font-bold tracking-tight w-full text-white/80"
              placeholder={t('common.untitled')}
            />
          ) : (
            <h3 className="text-base font-bold tracking-tight text-white/80">{title}</h3>
          )}
        </div>

        <div className="flex items-center gap-2">
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
              onClick={onAiRefine}
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
          
          <button aria-label="More options" className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
          
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
                      <span className="text-[8px] font-bold uppercase tracking-widest">{t('common.add')}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col">
              {/* Text Area */}
              <div className="p-10 space-y-8">
                <div className="relative group/text">
                  {onContentChange ? (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => onContentChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-transparent border-none text-white font-sans text-base leading-relaxed resize-none no-scrollbar placeholder:text-white/5 min-h-[100px]"
                    />
                  ) : (
                    <div className="prose prose-invert max-w-none font-sans text-xl leading-relaxed text-white/80">
                      {renderedMarkdown}
                    </div>
                  )}
                  
                  {onContentChange && content && (
                    <div className="mt-8 pt-8 border-t border-white/5 prose prose-invert max-w-none text-base">
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
                      className="px-8 py-3 rounded-full bg-[#2a2a2a] text-white/60 border border-white/5 text-[10px] uppercase font-bold hover:bg-[#333333] hover:text-white transition-all active:scale-95 disabled:opacity-50"
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
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-widest block">{t('common.visualDescriptionReady')}</span>
                      {visualPrompt && (
                        <p className="text-[10px] text-secondary italic max-w-xs mx-auto">"{visualPrompt}"</p>
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
