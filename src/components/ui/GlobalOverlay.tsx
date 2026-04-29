import { motion, AnimatePresence } from 'motion/react';
import { WorkflowStage } from '../../types';

interface GlobalOverlayProps {
  isTyping: boolean;
  isHydrating: boolean;
  hydratingLabel?: string | null;
  isHeavyThinking: boolean;
  activeStage: WorkflowStage;
  refiningBlockId?: string | null;
}

export const GlobalOverlay = ({
  isTyping,
  isHydrating,
  hydratingLabel,
  isHeavyThinking,
  activeStage,
  refiningBlockId
}: GlobalOverlayProps) => {
  if (!((isTyping && !refiningBlockId) || (isHydrating && !refiningBlockId))) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#0f0f0f]/80 backdrop-blur-sm z-[90] flex flex-col items-center justify-center gap-6"
      >
        <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold tracking-tight text-white">
            {isHydrating
              ? hydratingLabel || "Auto-generating content..."
              : isHeavyThinking
                ? activeStage === "Treatment"
                  ? "Structuring narrative primitives..."
                  : "The AI Architect is crafting your project using the Pro engine."
                : "AI is working..."}
          </h3>
          <p className="text-secondary text-sm">
            {isHydrating
              ? "The AI Architect is analyzing validated stages and generating content..."
              : isHeavyThinking
                ? "This may take a moment..."
                : "Analysing your script and preparing next steps."}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
