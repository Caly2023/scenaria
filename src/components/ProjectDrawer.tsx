import { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Loader2, AlertCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectMetadata } from '../types';
import { useTranslation } from 'react-i18next';
import { validateProjectMetadata } from '../lib/formValidators';
import { cn } from '../lib/utils';

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ProjectMetadata;
  onUpdate: (metadata: ProjectMetadata) => Promise<void> | void;
  onDelete: () => void;
}

// ── Mobile detection hook (consistent with App/ScriptDoctor) ──────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function ProjectDrawer({ isOpen, onClose, metadata, onUpdate, onDelete }: ProjectDrawerProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [localMeta, setLocalMeta] = useState<ProjectMetadata>(metadata);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalMeta(metadata);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, metadata]);

  const errors = useMemo(() => validateProjectMetadata(localMeta), [localMeta]);
  const getFieldError = (field: keyof ProjectMetadata) => errors.find(e => e.field === field)?.message;
  
  const hasChanges = JSON.stringify(localMeta) !== JSON.stringify(metadata);

  const handleChange = (field: keyof ProjectMetadata, value: any) => {
    setLocalMeta({
      ...localMeta,
      [field]: value
    });
  };

  const handleSave = async () => {
    if (errors.length > 0) return;
    setIsSaving(true);
    try {
      await onUpdate(localMeta);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />

          {/* Drawer Wrapper */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed z-[100] bg-[#212121] shadow-2xl flex flex-col border-white/5",
              isMobile ? "inset-0 h-[100dvh] w-full" : "top-0 right-0 bottom-0 w-[30%] min-w-[350px] max-w-[450px] border-l"
            )}
          >
            {/* Header: Title + Close Button */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#1a1a1a] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 text-white flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="flex flex-col leading-none">
                  <h3 className="text-sm font-bold tracking-tight text-white">{t('common.projectSettings')}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {hasChanges ? (
                      <>
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        <span className="text-[10px] uppercase tracking-widest text-amber-500/60 font-bold">Unsaved Changes</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 bg-green-500/40 rounded-full" />
                        <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">Settings Saved</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all text-white border-none disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth overscroll-contain">
              {/* Card Section: Main Info */}
              <div className="space-y-6 bg-white/[0.02] p-6 rounded-[24px] border border-white/5">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                      {t('common.title')}
                    </label>
                    <span className="text-[10px] text-white/30 font-mono">
                      {localMeta.title?.length || 0}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    value={localMeta.title}
                    disabled={isSaving}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={cn(
                      "w-full bg-[#121212] border rounded-full px-5 h-11 text-base font-bold transition-all text-white focus:border-white/20 outline-none",
                      getFieldError('title') ? 'border-red-500/50' : 'border-white/5'
                    )}
                  />
                  {getFieldError('title') && (
                    <p className="text-xs text-red-500 ml-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {getFieldError('title')}
                    </p>
                  )}
                </div>

                {/* Logline */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                    {t('stages.Logline.label', { defaultValue: 'Logline' })}
                  </label>
                  <textarea
                    value={localMeta.logline}
                    disabled={isSaving}
                    onChange={(e) => handleChange('logline', e.target.value)}
                    rows={4}
                    className="w-full bg-[#121212] border border-white/5 rounded-[24px] px-5 py-4 text-sm font-medium transition-all text-white resize-none no-scrollbar focus:border-white/20 outline-none"
                  />
                </div>
              </div>

              {/* Grid Section: Metadata Details */}
              <div className="grid grid-cols-1 gap-4">
                {/* Format */}
                <div className="space-y-2 bg-white/[0.02] p-5 rounded-[24px] border border-white/5">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                    {t('common.format')}
                  </label>
                  <input
                    type="text"
                    value={localMeta.format}
                    disabled={isSaving}
                    onChange={(e) => handleChange('format', e.target.value)}
                    className={cn(
                      "w-full bg-[#121212] border rounded-full px-5 h-10 text-sm font-medium transition-all text-white focus:border-white/20 outline-none",
                      getFieldError('format') ? 'border-red-500/50' : 'border-white/5'
                    )}
                  />
                </div>

                {/* Genre & Tone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 bg-white/[0.02] p-5 rounded-[24px] border border-white/5">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                      {t('common.genre')}
                    </label>
                    <input
                      type="text"
                      value={localMeta.genre}
                      disabled={isSaving}
                      onChange={(e) => handleChange('genre', e.target.value)}
                      className={cn(
                        "w-full bg-[#121212] border rounded-full px-5 h-10 text-sm font-medium transition-all text-white focus:border-white/20 outline-none",
                        getFieldError('genre') ? 'border-red-500/50' : 'border-white/5'
                      )}
                    />
                  </div>
                  <div className="space-y-2 bg-white/[0.02] p-5 rounded-[24px] border border-white/5">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                      {t('common.tone')}
                    </label>
                    <input
                      type="text"
                      value={localMeta.tone}
                      disabled={isSaving}
                      onChange={(e) => handleChange('tone', e.target.value)}
                      className={cn(
                        "w-full bg-[#121212] border rounded-full px-5 h-10 text-sm font-medium transition-all text-white focus:border-white/20 outline-none",
                        getFieldError('tone') ? 'border-red-500/50' : 'border-white/5'
                      )}
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2 bg-white/[0.02] p-5 rounded-[24px] border border-white/5">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                    {t('common.targetDuration')}
                  </label>
                  <input
                    type="text"
                    value={localMeta.targetDuration}
                    disabled={isSaving}
                    onChange={(e) => handleChange('targetDuration', e.target.value)}
                    className="w-full bg-[#121212] border border-white/5 rounded-full px-5 h-10 text-sm font-medium transition-all text-white focus:border-white/20 outline-none"
                  />
                </div>

                {/* Languages */}
                <div className="space-y-3 bg-white/[0.02] p-5 rounded-[24px] border border-white/5">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                    {t('common.languages')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {localMeta.languages?.map((lang, idx) => (
                      <span key={idx} className="yt-chip bg-white/5 text-white/60 border-white/10">
                        {lang}
                      </span>
                    ))}
                    <button disabled={isSaving} className="yt-chip bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all border-dashed">
                      + {t('common.add', { defaultValue: 'Add' })}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Spacer for scroll */}
              <div className="h-12" />
            </div>

            {/* Footer: Actions */}
            <div className="p-6 border-t border-white/5 bg-[#1a1a1a] flex-shrink-0 space-y-3">
              <button
                onClick={handleSave}
                disabled={isSaving || errors.length > 0 || !hasChanges}
                className="yt-btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base font-bold"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving ? 'Saving...' : t('common.saveChanges')}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onDelete();
                }}
                disabled={isSaving}
                className="w-full h-12 rounded-2xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.deleteProject', { defaultValue: 'Delete Project' })}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
