import { Cpu, Zap } from 'lucide-react';
import { useAiFlow } from '../hooks/useAiFlow';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function AiFlowToggle() {
  const { flow, toggleFlow } = useAiFlow();

  return (
    <button
      onClick={toggleFlow}
      title={`Switch to ${flow === 'production' ? 'Development' : 'Production'} AI Mode`}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border flex-shrink-0 group",
        flow === 'production'
          ? "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
          : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
      )}
    >
      <motion.div
        animate={{ rotate: flow === 'production' ? 0 : 360 }}
        transition={{ duration: 0.5, ease: "anticipate" }}
      >
        {flow === 'production' ? (
          <Cpu className="w-4 h-4" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
      </motion.div>
      <div className="flex flex-col items-start leading-[1.1]">
        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">AI Engine</span>
        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
          {flow === 'production' ? 'PRO FLOW' : 'DEV FLOW'}
        </span>
      </div>
    </button>
  );
}
