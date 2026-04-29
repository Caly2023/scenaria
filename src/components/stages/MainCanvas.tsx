import React, { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Primitive } from '../Primitive';
import { ContentPrimitive, StageAnalysis } from '@/types/stageContract';
import { StageInsight } from '@/types';
import { StepLayout } from './StepLayout';
import { CardSkeleton } from './Skeleton';

interface MainCanvasProps {
  sequences: ContentPrimitive[];
  onSequenceUpdate: (id: string, updates: Partial<ContentPrimitive>) => void;
  onSequenceAdd: () => void;
  onFocusMode: (id: string) => void;
  onAiMagic: (id: string) => void;
  onValidate: () => void;
  isGenerating?: boolean;
  refiningBlockId?: string | null;
  insight?: StageInsight | StageAnalysis;
  onAnalyze?: () => void | Promise<void>;
  onApplyFix?: (prompt: string) => void;
}

// Memoized per-sequence row — only re-renders when its own data changes
interface SequenceRowProps {
  seq: ContentPrimitive;
  index: number;
  isGenerating: boolean;
  refiningBlockId: string | null;
  onSequenceUpdate: (id: string, updates: Partial<ContentPrimitive>) => void;
  onAiMagic: (id: string) => void;
  onFocusMode: (id: string) => void;
  placeholder: string;
  sequenceLabel: string;
  untitledLabel: string;
}

const SequenceRow = React.memo(function SequenceRow({
  seq,
  index,
  isGenerating,
  refiningBlockId,
  onSequenceUpdate,
  onAiMagic,
  onFocusMode,
  placeholder,
  sequenceLabel,
  untitledLabel,
}: SequenceRowProps) {
  const handleContentChange = useCallback(
    (content: string) => onSequenceUpdate(seq.id, { content }),
    [seq.id, onSequenceUpdate]
  );
  const handleTitleChange = useCallback(
    (title: string) => onSequenceUpdate(seq.id, { title }),
    [seq.id, onSequenceUpdate]
  );
  const handleAiRefine = useCallback(() => onAiMagic(seq.id), [seq.id, onAiMagic]);
  const handleFocus = useCallback(() => onFocusMode(seq.id), [seq.id, onFocusMode]);

  return (
    <Primitive
      key={seq.id}
      title={`${sequenceLabel} ${index + 1}: ${seq.title || untitledLabel}`}
      content={seq.content}
      onContentChange={handleContentChange}
      onTitleChange={handleTitleChange}
      onAiRefine={handleAiRefine}
      onFocus={handleFocus}
      isGenerating={isGenerating && (refiningBlockId === seq.id || refiningBlockId === null)}
      mode="stacked"
      placeholder={placeholder}
    />
  );
});

export const MainCanvas = React.memo(function MainCanvas({ 
  sequences, 
  onSequenceUpdate, 
  onSequenceAdd, 
  onFocusMode, 
  onAiMagic, 
  onValidate,
  isGenerating = false,
  refiningBlockId = null,
  insight,
  onAnalyze,
  onApplyFix
}: MainCanvasProps) {
  const { t } = useTranslation();

  const placeholder = t('stages.Step Outline.placeholder');
  const sequenceLabel = t('common.sequence');
  const untitledLabel = t('common.untitled');
  
  return (
    <StepLayout
      stepIndex={8}
      stageName="Step Outline"
      title={t('stages.Step Outline.title')}
      subtitle={t('stages.Step Outline.subtitle')}
      insight={insight}
      isGenerating={isGenerating}
      onValidate={onValidate}
      onAnalyze={onAnalyze}
      onApplyFix={onApplyFix}
      validateLabel={t('stages.Step Outline.validateLabel')}
    >
      <div className="space-y-6">
        {isGenerating && !refiningBlockId && sequences.length === 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex justify-center">
            <span className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              Generating... (Step Outline)
            </span>
          </motion.div>
        )}
        <AnimatePresence mode="popLayout">
          {sequences.length === 0 && isGenerating && !refiningBlockId ? (
            <CardSkeleton count={3} />
          ) : (
            sequences.map((seq, index) => (
              <SequenceRow
                key={seq.id}
                seq={seq}
                index={index}
                isGenerating={isGenerating}
                refiningBlockId={refiningBlockId}
                onSequenceUpdate={onSequenceUpdate}
                onAiMagic={onAiMagic}
                onFocusMode={onFocusMode}
                placeholder={placeholder}
                sequenceLabel={sequenceLabel}
                untitledLabel={untitledLabel}
              />
            ))
          )}
        </AnimatePresence>

        <button 
          onClick={onSequenceAdd}
          className="w-full py-12 rounded-[32px] bg-surface/30 hover:bg-surface/50 transition-all flex flex-col items-center justify-center gap-3 group border-2 border-dashed border-white/5"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
            <Plus className="w-6 h-6 text-white/20 group-hover:text-white" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-white/20 group-hover:text-white/40">{t('common.addNewSequence')}</span>
        </button>
      </div>
    </StepLayout>
  );
});
