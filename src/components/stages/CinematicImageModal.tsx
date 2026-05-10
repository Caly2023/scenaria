import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Copy, Check, X, Loader2, RefreshCw, Trash2, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ContentPrimitive } from '@/types';

interface CinematicImageModalProps {
  primitive: ContentPrimitive;
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, referenceImages: string[]) => Promise<string>;
  onValidate: (imageUrl: string, index: number) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}

export const CinematicImageModal: React.FC<CinematicImageModalProps> = ({
  primitive,
  isOpen,
  onClose,
  onGenerate,
  onValidate,
  onDelete
}) => {
  const { t } = useTranslation();
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Local state for the generated preview before validation
  const [pendingImage, setPendingImage] = useState<{ url: string, index: number } | null>(null);

  const images = (primitive.metadata?.images as string[]) || [];
  const referencePrompts = primitive.referencePrompts || (primitive.visualPrompt ? [{ prompt: primitive.visualPrompt, description: "Main reference" }] : []);
  const maxImages = Math.max(4, referencePrompts.length);
  
  // Pad the array to ensure we always show at least 4 slots if available
  const cards = Array.from({ length: maxImages }).map((_, i) => {
    const promptDef = referencePrompts[i] || referencePrompts[0] || { prompt: "Cinematic shot", description: `Variation ${i + 1}` };
    const imageUrl = images[i];
    
    // N unlocks if N-1 is validated. 0 is always unlocked.
    const isUnlocked = i === 0 || !!images[i - 1];
    const isGenerated = !!imageUrl;
    const isPending = pendingImage?.index === i;
    const isGenerating = generatingIndex === i;

    return {
      index: i,
      prompt: promptDef.prompt,
      description: promptDef.description,
      imageUrl: isPending ? pendingImage?.url : imageUrl,
      state: isGenerated ? 'validated' : (isPending ? 'pending' : (isGenerating ? 'generating' : (isUnlocked ? 'ready' : 'locked'))),
      isUnlocked
    };
  });

  const handleCopyPrompt = (prompt: string, index: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleGenerateClick = async (index: number) => {
    // Only one generation at a time
    if (generatingIndex !== null) return;
    
    setGeneratingIndex(index);
    setPendingImage(null); // clear any previous pending

    try {
      // Gather references: all validated images BEFORE this index
      const referenceImages = images.slice(0, index);
      const promptToUse = cards[index].prompt;
      
      const newImageUrl = await onGenerate(promptToUse, referenceImages);
      setPendingImage({ url: newImageUrl, index });
    } catch (err) {
      console.error(err);
      // Let the parent's toast handle the error, we just reset state
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleValidateClick = async (index: number) => {
    if (pendingImage?.index === index) {
      await onValidate(pendingImage.url, index);
      setPendingImage(null);
    }
  };

  const handleRejectClick = () => {
    setPendingImage(null);
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl bg-[#111111] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Cinematic Continuity Engine</h2>
              <p className="text-sm text-white/50 mt-1">Progressive sequence generation for {primitive.title}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 rounded-full hover:bg-white/10 text-white/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {cards.map((card) => (
                <div 
                  key={card.index}
                  className={cn(
                    "flex flex-col border rounded-3xl overflow-hidden transition-all duration-500",
                    card.state === 'validated' ? "bg-white/5 border-green-500/30" : 
                    card.state === 'pending' ? "bg-amber-500/10 border-amber-500/50" :
                    card.state === 'locked' ? "bg-black/50 border-white/5 opacity-50 grayscale" :
                    "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  {/* Image Preview Area */}
                  <div className="relative aspect-[16/9] md:aspect-square bg-black/50 flex items-center justify-center overflow-hidden">
                    {card.imageUrl ? (
                      <img 
                        src={card.imageUrl} 
                        alt={card.description} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-white/10" />
                    )}

                    {/* Overlays based on state */}
                    {card.state === 'generating' && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                        <span className="text-sm font-semibold tracking-widest uppercase text-white/70">Generating...</span>
                      </div>
                    )}

                    {card.state === 'locked' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-xs font-bold tracking-widest uppercase text-white/40">Locked (Awaiting Image {card.index})</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Prompt */}
                  <div className="p-5 flex flex-col gap-4 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                        Image {card.index + 1}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full",
                        card.state === 'validated' ? "bg-green-500/20 text-green-400" :
                        card.state === 'pending' ? "bg-amber-500/20 text-amber-400" :
                        card.state === 'locked' ? "bg-white/5 text-white/30" :
                        "bg-white/10 text-white/70"
                      )}>
                        {card.state}
                      </span>
                    </div>
                    
                    <p className="text-sm text-white/70 line-clamp-3 leading-relaxed flex-1">
                      {card.prompt}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleCopyPrompt(card.prompt, card.index)}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-all flex-shrink-0"
                        title="Copy prompt"
                      >
                        {copiedIndex === card.index ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>

                      {card.state === 'ready' && (
                        <button
                          onClick={() => handleGenerateClick(card.index)}
                          disabled={generatingIndex !== null}
                          className="flex-1 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Generate
                        </button>
                      )}

                      {card.state === 'pending' && (
                        <>
                          <button
                            onClick={handleRejectClick}
                            className="flex-1 py-2.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Discard
                          </button>
                          <button
                            onClick={() => handleValidateClick(card.index)}
                            className="flex-1 py-2.5 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Validate
                          </button>
                        </>
                      )}

                      {card.state === 'validated' && (
                        <>
                          <button
                            onClick={() => onDelete(card.index)}
                            className="p-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0"
                            title="Delete validated image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleGenerateClick(card.index)}
                            disabled={generatingIndex !== null}
                            className="flex-1 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 text-sm font-bold tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
