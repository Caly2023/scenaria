import { motion, AnimatePresence } from 'motion/react';
import { Check, Wand2 } from 'lucide-react';
import { Toast } from '../../types';
import { cn } from '../../lib/utils';

interface ToastManagerProps {
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
}

export const ToastManager = ({ toasts, setToasts }: ToastManagerProps) => {
  return (
    <div className="fixed bottom-32 right-8 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px]",
              toast.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : toast.type === "error"
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-white/5 border-white/10 text-white",
            )}
          >
            {toast.type === "success" ? (
              <Check className="w-5 h-5" />
            ) : (
              <Wand2 className="w-5 h-5" />
            )}
            <div className="flex flex-col gap-1 items-start">
              <p className="text-sm font-medium tracking-tight">
                {toast.message}
              </p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    setToasts((p) => p.filter((t) => t.id !== toast.id));
                  }}
                  className="text-xs font-bold underline opacity-80 hover:opacity-100 transition-opacity"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
