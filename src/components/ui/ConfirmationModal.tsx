import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '@/lib/haptics';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isReady?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isReady = true
}: ConfirmationModalProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                {title}
              </h3>
              <div className="text-white/60 text-sm">
                {description}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="flex-1 h-11 rounded-2xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-all border-none"
                aria-label={cancelLabel || t('common.cancel', { defaultValue: 'Annuler' })}
              >
                {cancelLabel || t('common.cancel', { defaultValue: 'Annuler' })}
              </button>
              <button
                onClick={() => {
                  triggerHaptic('success');
                  onClose();
                  onConfirm();
                }}
                className="flex-1 h-11 rounded-2xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-all border-none"
                aria-label={confirmLabel || t('common.confirm', { defaultValue: 'Confirmer' })}
              >
                {confirmLabel || t('common.confirm', { defaultValue: 'Confirmer' })}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
