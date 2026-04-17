import { Primitive } from './Primitive';
import { Check, ChevronRight, ShieldCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
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
  onAnalyze?: () => Promise<void> | void;
  onApplyFix?: (prompt: string) => void;
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
  onAnalyze,
  onApplyFix,
  validateLabel,
  children
}: StepLayoutProps) {
  const { t } = useTranslation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Derive readiness from insight
  const isReady = insight
    ? ('isReady' in insight ? insight.isReady : ('issues' in insight ? insight.issues.length === 0 : false))
    : false;

  // Handle "Vérifier" click: show loading briefly then trigger onAnalyze
  const handleVerifier = async () => {
    setIsValidating(true);
    try {
      if (onAnalyze) {
        await onAnalyze();
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="w-full h-auto flex-1 flex flex-col space-y-10 md:space-y-16 pb-0 md:pb-40">
      <div className="flex-1 flex flex-col space-y-10 md:space-y-16">
        <div className="text-center space-y-4">
          <span className="text-sm md:text-xs uppercase tracking-[0.28em] md:tracking-[0.4em] text-white/50 font-bold">
            {t('common.step', { defaultValue: 'Étape' })} {stepIndex}: {t(`stages.${stageName}.label`, { defaultValue: stageName })}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tighter text-white break-words px-2 md:px-4">{title}</h2>
          <p className="text-secondary text-xl md:text-xl max-w-2xl mx-auto px-3 md:px-6 leading-relaxed">{subtitle}</p>
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
                {hydrationLabel || 'Génération en cours...'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* A. AI Insight primitive */}
        {insight && (
          <div className="relative">
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

            {/* 'Apply Fix' Button — shown if there's a suggested prompt */}
            {'suggestedPrompt' in insight && insight.suggestedPrompt && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 pl-12"
              >
                <button
                  onClick={() => onApplyFix?.(insight.suggestedPrompt!)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl border-none group"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
                  {t('common.applyAIFix', { defaultValue: 'Améliorer via Script Doctor' })}
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* B. Content primitives (Passed as children) */}
        <div className="space-y-8 flex-1">
          {children}
        </div>
      </div>

      {/* Sentinel for sticky detection */}
      <div ref={sentinelRef} className="h-px w-full pointer-events-none" />

      {/* C. Global step status block — Sticky or Relative based on viewport */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "transition-all duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] z-50",
          // Mobile: Boxed, in flow
          "relative w-full rounded-[32px] px-4 py-5 md:p-6 border bg-[#212121] mt-12 mb-0 md:mb-8",
          // Desktop: Conditional sticky behavior
          "md:sticky md:w-full md:mt-20 md:border md:bg-[#212121]/95 md:backdrop-blur-xl md:px-12 transition-all duration-300",
          isStuck 
            ? "md:bottom-0 md:rounded-b-none md:mb-0" 
            : "md:bottom-8 md:rounded-[40px] md:mb-12",
          isReady ? "border-green-500/30" : "border-white/10"
        )}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 sm:gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
              isReady ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"
            )}>
              {isReady
                ? <Check className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />}
            </div>
            <span className={cn(
              "text-base md:text-sm font-medium truncate transition-colors",
              isReady ? "text-green-400" : "text-white/50"
            )}>
              {isReady
                ? t('common.readyToProceed', { defaultValue: 'Prêt à continuer' })
                : t('common.notReadyYet', { defaultValue: 'Non validé' })}
            </span>
          </div>

          {/* Action buttons — stacked on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Always show Vérifier button */}
            <motion.button
              onClick={handleVerifier}
              disabled={isValidating || isGenerating}
              aria-label="Vérifier cette étape"
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-xs font-bold border transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                isValidating 
                  ? "bg-white/5 text-white/40 border-white/10" 
                  : isReady
                    ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
              )}
            >
              {isValidating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isReady 
                  ? <Check className="w-4 h-4" />
                  : <ShieldCheck className="w-4 h-4" />}
              <span>{isValidating ? 'Analyse...' : 'Vérifier'}</span>
            </motion.button>

            {/* Continuer / Étape suivante button — Always enabled and prominent */}
            <button
              onClick={() => setShowConfirmModal(true)}
              aria-label="Passer à l'étape suivante"
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-lg text-sm sm:text-xs font-semibold border-none transition-all",
                "bg-white text-black hover:scale-[1.02] sm:hover:scale-105 active:scale-95 shadow-[12px_12px_24px_rgba(0,0,0,0.2)]"
              )}
            >
              <span>{validateLabel ?? (isReady ? 'Continuer' : 'Étape suivante')}</span>
              <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
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
                <h3 className="text-xl font-semibold tracking-tight text-white">
                  {isReady ? 'Continuer ?' : 'Passer à l\'étape suivante ?'}
                </h3>
                <p className="text-white/60 text-sm">
                  {!isReady ? (
                    <span className="text-amber-500/80 block mb-2">Note : Cette étape n'a pas encore été validée.</span>
                  ) : null}
                  Cette action verrouille l'étape {t(`stages.${stageName}.label`, { defaultValue: stageName })} et génère la prochaine.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 h-11 rounded-2xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-all border-none"
                  aria-label="Annuler"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    onValidate();
                  }}
                  className="flex-1 h-11 rounded-2xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-all border-none"
                  aria-label="Confirmer et continuer"
                >
                  {isReady ? 'Continuer' : 'Continuer quand même'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

