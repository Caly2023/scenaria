import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectMetadata } from '../types';
import { useTranslation } from 'react-i18next';
import { validateProjectMetadata } from '../lib/formValidators';

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ProjectMetadata;
  onUpdate: (metadata: ProjectMetadata) => Promise<void> | void;
  onDelete: () => void;
}

export function ProjectDrawer({ isOpen, onClose, metadata, onUpdate, onDelete }: ProjectDrawerProps) {
  const { t } = useTranslation();
  const [localMeta, setLocalMeta] = useState<ProjectMetadata>(metadata);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalMeta(metadata);
    }
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[90vw] sm:w-[448px] max-w-full z-[201] bg-[#212121] shadow-2xl flex flex-col border-l border-white/5"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#1a1a1a]">
              <h2 className="text-sm font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
                {t('common.projectSettings')}
                {hasChanges && <span className="w-2 h-2 rounded-full bg-blue-500" title="Unsaved changes" />}
              </h2>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
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
                  className={`w-full bg-[#121212] border rounded-full px-5 h-11 text-base font-bold transition-all text-white disabled:opacity-50 ${
                    getFieldError('title') ? 'border-red-500/50' : 'border-white/5'
                  }`}
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
                  rows={3}
                  className="w-full bg-[#121212] border border-white/5 rounded-[20px] px-5 py-3 text-sm font-medium transition-all text-white resize-none no-scrollbar disabled:opacity-50"
                />
              </div>

              {/* Format */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                  {t('common.format')}
                </label>
                <input
                  type="text"
                  value={localMeta.format}
                  disabled={isSaving}
                  onChange={(e) => handleChange('format', e.target.value)}
                  className={`w-full bg-[#121212] border rounded-full px-5 h-11 text-sm font-medium transition-all text-white disabled:opacity-50 ${
                    getFieldError('format') ? 'border-red-500/50' : 'border-white/5'
                  }`}
                />
                {getFieldError('format') && (
                  <p className="text-xs text-red-500 ml-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {getFieldError('format')}
                  </p>
                )}
              </div>

              {/* Genre & Tone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                    {t('common.genre')}
                  </label>
                  <input
                    type="text"
                    value={localMeta.genre}
                    disabled={isSaving}
                    onChange={(e) => handleChange('genre', e.target.value)}
                    className={`w-full bg-[#121212] border rounded-full px-5 h-11 text-sm font-medium transition-all text-white disabled:opacity-50 ${
                      getFieldError('genre') ? 'border-red-500/50' : 'border-white/5'
                    }`}
                  />
                  {getFieldError('genre') && (
                    <p className="text-xs text-red-500 ml-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {getFieldError('genre')}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                    {t('common.tone')}
                  </label>
                  <input
                    type="text"
                    value={localMeta.tone}
                    disabled={isSaving}
                    onChange={(e) => handleChange('tone', e.target.value)}
                    className={`w-full bg-[#121212] border rounded-full px-5 h-11 text-sm font-medium transition-all text-white disabled:opacity-50 ${
                      getFieldError('tone') ? 'border-red-500/50' : 'border-white/5'
                    }`}
                  />
                  {getFieldError('tone') && (
                    <p className="text-xs text-red-500 ml-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {getFieldError('tone')}
                    </p>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                  {t('common.languages')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {localMeta.languages?.map((lang, idx) => (
                    <span key={idx} className="yt-chip">
                      {lang}
                    </span>
                  ))}
                  <button disabled={isSaving} className="yt-chip opacity-40 hover:opacity-100 disabled:opacity-20">
                    + {t('common.add', { defaultValue: 'Add' })}
                  </button>
                </div>
                {getFieldError('languages') && (
                  <p className="text-xs text-red-500 ml-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {getFieldError('languages')}
                  </p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                  {t('common.targetDuration')}
                </label>
                <input
                  type="text"
                  value={localMeta.targetDuration}
                  disabled={isSaving}
                  onChange={(e) => handleChange('targetDuration', e.target.value)}
                  className="w-full bg-[#121212] border border-white/5 rounded-full px-5 h-11 text-sm font-medium transition-all text-white disabled:opacity-50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-[#1a1a1a] space-y-3">
              <button
                onClick={handleSave}
                disabled={isSaving || errors.length > 0 || !hasChanges}
                className="yt-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full py-4 rounded-2xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                {t('common.deleteProject', { defaultValue: 'Delete Project' })}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
