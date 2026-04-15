import { Primitive } from './Primitive';
import { Check, ChevronRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
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
  onAnalyze?: () => Promise<void> | void;
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
  validateLabel,
  children
}: StepLayoutProps) {
  const { t } = useTranslation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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
    <div className="w-full h-auto flex-1 flex flex-col space-y-10 md:space-y-16 pb-0 md:pb-12">
      <div className="flex-1 flex flex-col space-y-10 md:space-y-16">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase tracking-[0.4em] text-white/50 font-bold">
            {t('common.step', { defaultValue: 'Étape' })} {stepIndex}: {t(`stages.${stageName}.label`, { defaultValue: stageName })}
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
                {hydrationLabel || 'Génération en cours...'}
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
        <div className="space-y-8 flex-1">
          {children}
        </div>
      </div>

      {/* C. Global step status block */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-[#212121] p-6 rounded-[28px] shadow-2xl border transition-all duration-500",
          isReady ? "border-green-500/30 shadow-green-500/5" : "border-white/10"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Status indicator */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
              isReady ? "bg-green-500/15 text-green-400" : "bg-white/5 text-white/30"
            )}>
              {isReady
                ? <Check className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />}
            </div>
            <span className={cn(
              "text-sm font-medium truncate transition-colors",
              isReady ? "text-green-400" : "text-white/50"
            )}>
              {isReady
                ? t('common.readyToProceed', { defaultValue: 'Prêt à continuer' })
                : t('common.notReadyYet', { defaultValue: 'Non validé' })}
            </span>
          </div>

          {/* Action buttons — minimal, right-aligned */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Vérifier button — shown when not yet ready */}
            <AnimatePresence mode="wait">
              {!isReady ? (
                <motion.button
                  key="verifier-btn"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleVerifier}
                  disabled={isValidating || isGenerating}
                  aria-label="Vérifier cette étape"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    isValidating 
                      ? "bg-white/5 text-white/40 border-white/10" 
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 active:scale-95",
                    (isValidating || isGenerating) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isValidating
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <ShieldCheck className="w-3 h-3" />}
                  <span>{isValidating ? 'Analyse...' : 'Vérifier'}</span>
                </motion.button>
              ) : (
                <motion.div
                  key="validated-badge"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20"
                >
                  <Check className="w-3 h-3" />
                  Validé
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continuer / Étape suivante button */}
            <button
              onClick={() => setShowConfirmModal(true)}
              aria-label="Passer à l'étape suivante"
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold border-none transition-all",
                isReady
                  ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[12px_12px_24px_rgba(0,0,0,0.2)]"
                  : "bg-white/5 text-white/30 hover:bg-white/8 active:scale-95"
              )}
            >
              <span>{validateLabel ?? (isReady ? 'Continuer' : 'Étape suivante')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
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

