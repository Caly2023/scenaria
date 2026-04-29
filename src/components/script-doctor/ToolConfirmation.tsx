import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { ToolCall } from '@/types/scriptDoctor';

export function ToolConfirmation({ call, onConfirm, onCancel }: { call: ToolCall; onConfirm: () => void; onCancel: () => void }) {
  const { name, args = {} } = call;
  const data = args as Record<string, unknown>;
  const updates = (data.updates as Record<string, unknown> | undefined) ?? {};
  const primitive = (data.primitive as Record<string, unknown> | undefined) ?? {};
  const stage = typeof data.stage === "string" ? data.stage : "stage";
  const id = typeof data.id === "string" ? data.id : "unknown";
  const updatesTitle = typeof updates.title === "string" ? updates.title : undefined;
  const updatesName = typeof updates.name === "string" ? updates.name : undefined;
  const primitiveTitle = typeof primitive.title === "string" ? primitive.title : undefined;
  const primitiveName = typeof primitive.name === "string" ? primitive.name : undefined;

  const getToolDescription = () => {
    switch (name) {
      case 'propose_patch':
        return `Modify ${stage}: ${updatesTitle || updatesName || 'selected item'}`;
      case 'add_primitive':
        return `Add new ${stage}: ${primitiveTitle || primitiveName || "untitled"}`;
      case 'delete_primitive':
        return `Delete ${stage} item: ${id}`;
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Approval Required</span>
          <span className="text-sm font-medium text-white/90">{getToolDescription()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onConfirm}
          className="flex-1 h-10 rounded-xl bg-white text-black text-xs font-bold hover:bg-[#e5e5e5] transition-all active:scale-95 border-none"
        >
          Approve & Execute
        </button>
        <button 
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all active:scale-95 border-none"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
