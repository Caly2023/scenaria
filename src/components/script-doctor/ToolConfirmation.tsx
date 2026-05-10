import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { ToolCall } from '@/types/scriptDoctor';

export function ToolConfirmation({ call, onConfirm, onCancel }: { call: ToolCall; onConfirm: () => void; onCancel: () => void }) {
  const { name, args = {} } = call;
  const data = args as Record<string, unknown>;
  const stage = typeof data.stage === "string" ? data.stage : "stage";
  const updatesArray = Array.isArray(data.updates) ? data.updates : [];
  const primitivesArray = Array.isArray(data.primitives) ? data.primitives : [];
  const idsArray = Array.isArray(data.ids) ? data.ids : [];

  const getToolDescription = () => {
    switch (name) {
      case 'update_primitives':
        return `Modify ${updatesArray.length} items in ${stage}`;
      case 'add_primitives':
        return `Add ${primitivesArray.length} items to ${stage}`;
      case 'delete_primitives':
        return `Delete ${idsArray.length} items from ${stage}`;
      case 'restructure_stage':
        return `Full restructure of ${stage}`;
      case 'execute_multi_stage_fix':
        return `Apply multi-stage architectural fix`;
      case 'sync_metadata':
        return `Update project metadata`;
      default:
        return `Execute technical operation: ${name}`;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 p-5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 space-y-5 shadow-2xl relative overflow-hidden group/tool"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/tool:opacity-20 transition-opacity">
        <Sparkles className="w-12 h-12" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">Approval Required</span>
          <span className="text-sm font-bold text-white tracking-tight">{getToolDescription()}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <button 
          onClick={onConfirm}
          className="flex-1 h-11 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-[#f0f0f0] transition-all active:scale-95 border-none shadow-xl"
        >
          Approve & Execute
        </button>
        <button 
          onClick={onCancel}
          className="px-6 h-11 rounded-xl bg-white/5 text-white/60 text-xs font-bold hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/10"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
