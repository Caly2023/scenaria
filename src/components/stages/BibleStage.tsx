import React, { useState } from 'react';
import { Plus, Maximize2, X, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Primitive } from '../Primitive';
import { ContentPrimitive } from '@/types/stageContract';
import { StepLayout } from './StepLayout';
import { WorkflowStage } from '@/types';

interface BibleStageProps {
  items: ContentPrimitive[];
  stageId: WorkflowStage;
  icon: LucideIcon;
  itemTypeLabel: string; // e.g. "character", "location"
  onAdd: (data: any) => void;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  onRefine: (feedback: string, blockId?: string) => void;
  onGenerateViews: (id: string) => void;
  onDeepDevelop: (id: string) => void;
  onValidate: () => void;
  onAnalyze?: () => void;
  onApplyFix?: (prompt: string) => void;
  isGenerating?: boolean;
  refiningBlockId?: string | null;
  lastUpdatedPrimitiveId?: string | null;
  insight?: any;
  renderAddForm: (onClose: () => void, onSubmit: (data: any) => void) => React.ReactNode;
  getItemProps?: (item: ContentPrimitive) => any;
}

export function BibleStage({
  items,
  stageId,
  icon: Icon,
  itemTypeLabel,
  onAdd,
  onUpdate,
  onDelete,
  onRefine,
  onGenerateViews,
  onDeepDevelop,
  onValidate,
  onAnalyze,
  onApplyFix,
  isGenerating = false,
  refiningBlockId = null,
  lastUpdatedPrimitiveId = null,
  insight,
  renderAddForm,
  getItemProps
}: BibleStageProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleAddSubmit = (data: any) => {
    onAdd(data);
    setIsAdding(false);
  };

  const handleGenerateClick = (id: string) => {
    setConfirmingId(id);
  };

  const confirmGeneration = () => {
    if (confirmingId) {
      onGenerateViews(confirmingId);
      setConfirmingId(null);
    }
  };

  return (
    <StepLayout
      stepIndex={0} // Handled by StageRenderer if needed, or we can pass it
      stageName={stageId}
      title={t(`stages.${stageId}.title`)}
      subtitle={t(`stages.${stageId}.subtitle`)}
      insight={insight}
      isGenerating={isGenerating}
      onValidate={onValidate}
      onAnalyze={onAnalyze}
      onApplyFix={onApplyFix}
      validateLabel={t(`stages.${stageId}.validateLabel`)}
    >
      <div className="space-y-12 pb-32">
        <div className="space-y-12">
          <div className="flex items-center gap-5 border-b border-white/5 pb-6">
            <Icon className="w-8 h-8 text-white/30" />
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white/90">
              {t(`common.${itemTypeLabel}s`)}
            </h3>
          </div>
          
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <Primitive
                  key={item.id}
                  title={item.title}
                  content={item.content}
                  onContentChange={(content) => onUpdate(item.id, { content })}
                  onTitleChange={(title) => onUpdate(item.id, { title })}
                  onAiRefine={() => {
                    const action = (!item.content || item.content.trim() === '' || item.content === '...') ? 'Generate' : 'Refine';
                    onRefine(`${action} description for ${itemTypeLabel}: ${item.title}`, item.id);
                  }}
                  onGenerateImage={() => handleGenerateClick(item.id)}
                  onDeepDevelop={() => onDeepDevelop(item.id)}
                  onDelete={() => onDelete(item.id)}
                  type="gallery"
                  mode="split"
                  images={item.metadata?.views ? Object.values(item.metadata.views) as string[] : []}
                  onImageClick={setFullscreenImage}
                  isGenerating={isGenerating && (refiningBlockId === item.id || refiningBlockId === null)}
                  placeholder={t(`stages.${stageId}.placeholder`)}
                  visualPrompt={item.visualPrompt}
                  isUpdated={lastUpdatedPrimitiveId === item.id}
                  {...(getItemProps ? getItemProps(item) : {})}
                />
              ))}
            </AnimatePresence>

            {isAdding ? (
              renderAddForm(() => setIsAdding(false), handleAddSubmit)
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-12 rounded-[32px] bg-surface/30 hover:bg-surface/50 transition-all flex flex-col items-center justify-center gap-3 group border-2 border-dashed border-white/5"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                  <Plus className="w-6 h-6 text-white/20 group-hover:text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-white/20 group-hover:text-white/40">
                  {t(`common.addNew${itemTypeLabel.charAt(0).toUpperCase() + itemTypeLabel.slice(1)}`)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#212121] p-12 rounded-[40px] shadow-2xl border border-white/10 max-w-md w-full text-center space-y-8"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <Maximize2 className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{t('common.generateVisuals')}</h3>
                <p className="text-secondary">{t('common.generateVisualsDesc')}</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmingId(null)}
                  className="yt-btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={confirmGeneration}
                  className="yt-btn-primary flex-1"
                >
                  {t('common.generate')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-12"
            onClick={() => setFullscreenImage(null)}
          >
            <button className="absolute top-12 right-12 p-4 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all">
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={fullscreenImage} 
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StepLayout>
  );
}
