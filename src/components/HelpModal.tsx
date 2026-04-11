import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useTranslation();

  const shortcuts = [
    { key: 'Alt + S', description: t('help.shortcuts.switchProject', { defaultValue: 'Switch Projects' }) },
    { key: 'Alt + D', description: t('help.shortcuts.toggleDoctor', { defaultValue: 'Toggle Script Doctor' }) },
    { key: 'Alt + H', description: t('help.shortcuts.showHelp', { defaultValue: 'Show help (this modal)' }) },
    { key: '←', description: t('help.shortcuts.prevStage', { defaultValue: 'Previous Stage' }) },
    { key: '→', description: t('help.shortcuts.nextStage', { defaultValue: 'Next Stage' }) },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
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
            className="relative w-full max-w-sm bg-[#1a1a1a] rounded-[32px] p-8 shadow-2xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-white/40" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">{t('help.title', { defaultValue: 'Keyboard Shortcuts' })}</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-1 px-2 hover:bg-white/5 rounded-xl transition-colors">
                  <span className="text-white font-medium">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-white/10 rounded-md text-[10px] font-bold text-white/60 font-sans border-b-2 border-white/20">
                      {shortcut.key}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={onClose}
              className="w-full mt-10 py-4 rounded-2xl bg-white text-black font-bold tracking-tight hover:bg-[#e5e5e5] transition-all"
            >
              {t('common.close', { defaultValue: 'Got it' })}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
