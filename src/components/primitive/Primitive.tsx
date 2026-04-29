import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Maximize2, 
  Plus,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MarkdownDisplay } from '@/components/ui/MarkdownDisplay';
import { ttsService } from '@/services/ttsService';
import { PrimitiveHeader } from './PrimitiveHeader';
import { PrimitiveEmptyState } from './PrimitiveEmptyState';

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
  const [showGlow, setShowGlow] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Trigger glow effect when isUpdated changes to true
  useEffect(() => {
    if (isUpdated) {
      setTimeout(() => setShowGlow(true), 0);
      const timer = setTimeout(() => setShowGlow(false), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isUpdated]);

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
      [],
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
      
      <PrimitiveHeader 
        title={title}
        type={type}
        isEmpty={isEmpty}
        isGenerating={isGenerating}
        isSpeaking={isSpeaking}
        isExpanded={isExpanded}
        mode={mode}
        onTitleChange={onTitleChange}
        onTts={handleTts}
        onAiRefine={onAiRefine}
        onGenerateImage={onGenerateImage}
        onFocus={onFocus}
        onDelete={onDelete}
        onToggleExpand={handleToggleExpand}
      />

      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Horizontal Image Gallery */}
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

                {isEmpty && (onRegenerate || onAiRefine) && (
                  <PrimitiveEmptyState 
                    isGenerating={isGenerating}
                    onRegenerate={onRegenerate}
                    onAiRefine={onAiRefine}
                  />
                )}

                {type === 'gallery' && onDeepDevelop && (
                  <div className="flex justify-start">
                    <button
                      onClick={onDeepDevelop}
                      disabled={isGenerating}
                      className="px-8 py-3.5 rounded-full bg-[#2a2a2a] text-white/70 border border-white/5 text-xs uppercase font-bold hover:bg-[#333333] hover:text-white transition-all active:scale-95 disabled:opacity-50 tracking-wider"
                    >
                      {t('common.deepDevelop', { defaultValue: 'Deep Develop' })}
                    </button>
                  </div>
                )}
              </div>

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
