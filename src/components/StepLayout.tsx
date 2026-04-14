import { Primitive } from './Primitive';
import { Check, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { StageInsight } from '@/types';
import { StageAnalysis } from '@/types/stageContract';

interface StepLayoutProps {
  stepIndex: number;
  stageName: string;
  title: string;
  subtitle: string;
  insight?: StageInsight | StageAnalysis;
  isGenerating?: boolean;
  isHydrating?: boolean;
  hydrationLabel?: string | null;
  onValidate: () => void;
  validateLabel?: string;
  children: React.ReactNode;
}

export function StepLayout({
  stepIndex,
  stageName,
  title,
  subtitle,
  insight,
  isGenerating = false,
  isHydrating = false,
  hydrationLabel = null,
  onValidate,
  validateLabel = "✓ Complete Stage & Continue",
  children
}: StepLayoutProps) {
  const { t } = useTranslation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // If no insight is provided, default to not ready until data populates it
  const isReady = insight 
    ? ('isReady' in insight ? insight.isReady : ('issues' in insight ? insight.issues.length === 0 : false))
    : false;

  return (
    <div className="w-full space-y-16 pb-32">
      <div className="text-center space-y-4">
        <span className="text-xs uppercase tracking-[0.4em] text-white/30 font-bold">
          {t('common.step', { defaultValue: 'Step' })} {stepIndex}: {t(`stages.${stageName}.label`, { defaultValue: stageName })}
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tighter text-white break-words px-4">{title}</h2>
        <p className="text-secondary text-lg md:text-xl max-w-2xl mx-auto px-6 leading-relaxed">{subtitle}</p>
      </div>

      {/* Hydration Status Banner */}
      <AnimatePresence>
        {isHydrating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
            <span className="text-sm font-medium text-white/60">
              {hydrationLabel || 'Auto-generating content...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A. AI Insight primitive */}
      {insight && (
        <Primitive
          title={t('common.aiInsight', { defaultValue: 'AI Insight' })}
          content={'content' in insight 
            ? insight.content 
            : `${insight.evaluation}\n\n**Issues to Address:**\n${insight.issues.length ? insight.issues.map(i => `- ${i}`).join('\n') : '*None*'}\n\n**Recommendations:**\n${insight.recommendations.length ? insight.recommendations.map(r => `- ${r}`).join('\n') : '*None*'}`
          }
          type="ai_insight"
          mode="stacked"
          isGenerating={isGenerating}
        />
      )}

      {/* B. Content primitives (Passed as children) */}
      <div className="space-y-8">
        {children}
      </div>

      {/* C. Global step status block */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-[#212121] p-8 rounded-[32px] shadow-2xl border transition-all duration-500",
          isReady ? "border-green-500/30 shadow-green-500/5" : "border-amber-500/30 shadow-amber-500/5"
        )}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4 flex-1">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
              isReady ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
            )}>
              {isReady ? <Check className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div className="space-y-1">
              <h4 className={cn(
                "text-lg font-semibold tracking-tight",
                isReady ? "text-green-500" : "text-amber-500"
              )}>
                {isReady 
                  ? t('common.readyToProceed', { defaultValue: 'Ready to proceed' }) 
                  : t('common.notReadyYet', { defaultValue: 'Not ready yet' })}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto relative group/btn">
            <button
              onClick={() => setShowConfirmModal(true)}
              aria-label="Complete stage and continue"
              className={cn(
                "flex-1 md:flex-none px-8 h-11 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 border-none",
                isReady 
                  ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                  : "bg-[#2a2a2a] text-white/50 hover:bg-[#333333] active:scale-95"
              )}
            >
              {validateLabel}
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Tooltip */}
            <div className="absolute opacity-0 group-hover/btn:opacity-100 transition-opacity bottom-full mb-4 right-0 w-64 bg-[#111] text-xs text-white p-3 rounded-lg border border-white/10 pointer-events-none shadow-xl z-50">
              {isReady ? "Validating will lock this stage and generate the content for the next stage based on your input." : "Stage is not fully validated, but you can still proceed."}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowConfirmModal(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative w-full max-w-md bg-[#212121] rounded-[32px] p-8 shadow-2xl border border-white/10 space-y-6"
            >
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-semibold tracking-tight text-white">Ready to continue?</h3>
                <p className="text-white/40 text-sm">
                  {!isReady ? (
                    <span className="text-amber-500/80 block mb-2">Note: This stage still has pending AI insights.</span>
                  ) : null}
                  This will lock the {t(`stages.${stageName}.label`, { defaultValue: stageName })} stage and start generating the next stage.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirmModal(false)} 
                  className="flex-1 h-11 rounded-2xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-all border-none"
                  aria-label="Cancel validation"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    onValidate();
                  }} 
                  className="flex-1 h-11 rounded-2xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-all border-none"
                  aria-label="Confirm validation"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
