import { motion } from 'motion/react';

interface DeleteProjectModalProps {
  projectId: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteProjectModal({ projectId, isDeleting, onCancel, onConfirm }: DeleteProjectModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
    >
      <div className="glass p-12 rounded-[40px] max-w-md w-full text-center space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Supprimer le projet ?</h2>
        <p className="text-secondary">Cette action est irréversible. Toutes les données associées seront perdues.</p>
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-bold"
          >
            Annuler
          </button>
          <button 
            onClick={() => onConfirm(projectId)}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-all font-bold disabled:opacity-50"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
