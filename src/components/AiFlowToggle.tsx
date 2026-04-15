import { Cpu, Zap } from 'lucide-react';
import { useAiFlow } from '../hooks/useAiFlow';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function AiFlowToggle() {
  const { flow, toggleFlow } = useAiFlow();
  const isDevFlow = flow === 'development';

  return (
    <button
      onClick={toggleFlow}
      title={`Mode actuel : ${isDevFlow ? 'DevFlow (Gemini 2.5 Flash / Lite)' : 'Production (Gemini 3.x)'}. Cliquer pour basculer.`}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border flex-shrink-0 group",
        isDevFlow
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
          : "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
      )}
    >
      <motion.div
        animate={{ rotate: isDevFlow ? 0 : 360 }}
        transition={{ duration: 0.5, ease: "anticipate" }}
      >
        {isDevFlow ? (
          <Zap className="w-4 h-4" />
        ) : (
          <Cpu className="w-4 h-4" />
        )}
      </motion.div>
      <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
        {isDevFlow ? 'DEV FLOW' : 'PRO FLOW'}
      </span>
    </button>
  );
}
