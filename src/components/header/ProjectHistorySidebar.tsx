import React from 'react';
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
            className="fixed left-0 top-0 bottom-0 z-[5010] w-screen max-w-none md:w-[340px] md:max-w-[360px] bg-[#121212] border-r border-white/10 shadow-2xl flex flex-col"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)' }}
          >
            <div className="px-4 pt-2 pb-4 border-b border-white/10">
              <button
                onClick={() => {
                  onClose();
                  onNewStory();
                }}
                className="w-full h-11 rounded-xl bg-white text-black font-semibold text-sm hover:opacity-90 transition-opacity border-none"
              >
                Nouvelle histoire
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
