import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/types';

interface ProjectHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string;
  onProjectSelect: (id: string) => void;
  onNewStory: () => void;
  onSettingsClick: () => void;
}

export function ProjectHistorySidebar({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onProjectSelect,
  onNewStory,
  onSettingsClick,
}: ProjectHistorySidebarProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[5000]"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed left-0 top-0 bottom-0 z-[5010] w-screen max-w-none md:w-[340px] md:max-w-[360px] bg-[#0f0f0f] border-r border-white/10 shadow-2xl flex flex-col"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)' }}
          >
            <div className="px-5 pt-4 pb-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white/90">
                  Scenar<span className="text-[#D4AF37]">ia</span>
                </h2>
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#D4AF37] animate-pulse" />
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onNewStory();
                }}
                className="w-full h-12 rounded-2xl bg-white text-black font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all border-none shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 group"
              >
                <div className="w-5 h-5 rounded-lg bg-black flex items-center justify-center group-hover:rotate-90 transition-transform">
                  <span className="text-white text-lg leading-none">+</span>
                </div>
                {t('common.newStory')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {projects.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onClose();
                    if (item.id !== currentProjectId) onProjectSelect(item.id);
                  }}
                  className={cn(
                    'w-full text-left rounded-xl px-3 py-3 border transition-colors border-solid',
                    item.id === currentProjectId
                      ? 'bg-white/10 border-white/20'
                      : 'bg-white/[0.03] border-transparent hover:bg-white/5'
                  )}
                >
                  <p className="text-sm font-semibold text-white truncate">
                    {item.metadata?.title || 'Projet sans titre'}
                  </p>
                  <p className="text-xs text-white/50 line-clamp-2 mt-1">
                    {item.metadata?.logline || 'Aucune logline'}
                  </p>
                </button>
              ))}
            </div>

            <div
              className="p-3 border-t border-white/10 bg-[#151515]"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
            >
              <button
                onClick={() => {
                  onClose();
                  onSettingsClick();
                }}
                className="w-full h-11 rounded-xl bg-white/5 text-white flex items-center gap-2 justify-center hover:bg-white/10 transition-colors border-none"
              >
                <Settings className="w-4 h-4" />
                Parametres
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
