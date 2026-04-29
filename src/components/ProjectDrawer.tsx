import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookText,
  Film,
  Languages,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectMetadata } from '../types';
import { useTranslation } from 'react-i18next';
import { validateProjectMetadata } from '../lib/formValidators';
import { cn } from '../lib/utils';
import { useIsMobile } from '../hooks/useIsMobile';
import { triggerHaptic } from '../lib/haptics';

import { useProject } from '@/contexts/ProjectContext';

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
}

type SectionKey = 'menu' | 'general' | 'details' | 'languages' | 'danger';

export function ProjectDrawer({ isOpen, onClose, onDelete }: ProjectDrawerProps) {
  const project = useProject();
  const { currentProject, handleMetadataUpdate: onUpdate } = project;
  const metadata = currentProject?.metadata || { title: '', format: '', genre: '', tone: '', languages: [], targetDuration: '', logline: '' };

  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [localMeta, setLocalMeta] = useState<ProjectMetadata>(metadata);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('menu');

  useEffect(() => {
    if (isOpen) {
      setLocalMeta(metadata);
      setActiveSection('menu');
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, metadata]);

  const errors = useMemo(() => validateProjectMetadata(localMeta), [localMeta]);
  const getFieldError = (field: keyof ProjectMetadata) => errors.find((e) => e.field === field)?.message;
  const hasChanges = JSON.stringify(localMeta) !== JSON.stringify(metadata);

  const handleChange = <K extends keyof ProjectMetadata>(field: K, value: ProjectMetadata[K]) => {
    setLocalMeta({
      ...localMeta,
      [field]: value,
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

  const menuItems = [
    {
      key: 'general' as const,
      title: t('common.title'),
      subtitle: t('stages.Logline.label', { defaultValue: 'Logline' }),
      icon: BookText,
    },
    {
      key: 'details' as const,
      title: t('common.format'),
      subtitle: `${t('common.genre')} • ${t('common.tone')}`,
      icon: Film,
    },
    {
      key: 'languages' as const,
      title: t('common.languages'),
      subtitle: t('common.targetDuration'),
      icon: Languages,
    },
    {
      key: 'danger' as const,
      title: t('common.deleteProject', { defaultValue: 'Delete Project' }),
      subtitle: 'Actions sensibles',
      icon: AlertTriangle,
      danger: true,
    },
  ];

  const renderMenu = () => (
    <section className="space-y-4">
      <div className={cn('rounded-2xl border border-white/10 bg-[#161616] p-4', isMobile && 'rounded-3xl p-5')}>
        <div className="flex items-center justify-between">
          <div>
            <p className={cn('text-base font-semibold text-white', isMobile && 'text-lg')}>
              {localMeta.title || 'Projet sans titre'}
            </p>
            <p className={cn('text-sm text-white/50', isMobile && 'text-[15px]')}>
              {hasChanges ? 'Modifications non sauvegardees' : 'Parametres sauvegardes'}
            </p>
          </div>
          <div className={cn('h-2 w-2 rounded-full', hasChanges ? 'bg-amber-500' : 'bg-green-500/70')} />
        </div>
      </div>

      <div className={cn('rounded-2xl border border-white/10 bg-[#161616] p-2', isMobile && 'rounded-3xl p-3')}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                triggerHaptic('light');
                setActiveSection(item.key);
              }}
              className={cn(
                'w-full rounded-xl px-3 py-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors border-none',
                isMobile && 'rounded-2xl px-4 py-4',
                item.danger && 'hover:bg-red-500/10'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center border',
                  isMobile && 'w-11 h-11 rounded-xl',
                  item.danger ? 'bg-red-500/10 border-red-500/20' : 'bg-[#111111] border-white/10'
                )}
              >
                <Icon className={cn('w-4 h-4', isMobile && 'w-5 h-5', item.danger ? 'text-red-400' : 'text-white/60')} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={cn('text-sm font-semibold', isMobile && 'text-base', item.danger ? 'text-red-300' : 'text-white')}>
                  {item.title}
                </p>
                <p className={cn('text-xs truncate', isMobile && 'text-sm', item.danger ? 'text-red-300/60' : 'text-white/45')}>
                  {item.subtitle}
                </p>
              </div>
              <ChevronRight className={cn('w-4 h-4', isMobile && 'w-5 h-5', item.danger ? 'text-red-300/60' : 'text-white/30')} />
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderSection = () => {
    if (activeSection === 'general') {
      return (
        <section className={cn('space-y-4 bg-[#161616] p-4 rounded-2xl border border-white/10', isMobile && 'space-y-5 rounded-3xl p-5')}>
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold', isMobile && 'text-[11px]')}>
                {t('common.title')}
              </label>
              <span className={cn('text-[10px] text-white/30 font-mono', isMobile && 'text-xs')}>
                {localMeta.title?.length || 0}/100
              </span>
            </div>
            <input
              type="text"
              value={localMeta.title}
              disabled={isSaving}
              onChange={(e) => handleChange('title', e.target.value)}
              className={cn(
                'w-full bg-[#121212] border rounded-xl px-4 h-12 text-base font-semibold transition-all text-white focus:border-white/20 outline-none',
                isMobile && 'h-14 text-lg rounded-2xl',
                getFieldError('title') ? 'border-red-500/50' : 'border-white/10'
              )}
            />
            {getFieldError('title') && (
              <p className={cn('text-xs text-red-500 ml-2 flex items-center gap-1', isMobile && 'text-sm')}>
                <AlertCircle className={cn('w-3 h-3', isMobile && 'w-4 h-4')} /> {getFieldError('title')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
              {t('stages.Logline.label', { defaultValue: 'Logline' })}
            </label>
            <textarea
              value={localMeta.logline}
              disabled={isSaving}
              onChange={(e) => handleChange('logline', e.target.value)}
              rows={isMobile ? 5 : 4}
              className={cn(
                'w-full bg-[#121212] border border-white/10 rounded-2xl px-4 py-3 text-sm font-medium transition-all text-white resize-none no-scrollbar focus:border-white/20 outline-none',
                isMobile && 'text-base py-4 px-5'
              )}
            />
          </div>
        </section>
      );
    }

    if (activeSection === 'details') {
      return (
        <section className={cn('space-y-4 bg-[#161616] p-4 rounded-2xl border border-white/10', isMobile && 'space-y-5 rounded-3xl p-5')}>
          {(['format', 'genre', 'tone'] as const).map((field) => (
            <div key={field} className="space-y-2">
              <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
                {field === 'format' ? t('common.format') : field === 'genre' ? t('common.genre') : t('common.tone')}
              </label>
              <input
                type="text"
                value={localMeta[field]}
                disabled={isSaving}
                onChange={(e) => handleChange(field, e.target.value)}
                className={cn(
                  'w-full bg-[#121212] border rounded-xl px-4 h-11 text-sm font-medium transition-all text-white focus:border-white/20 outline-none',
                  isMobile && 'h-12 text-base rounded-2xl',
                  getFieldError(field) ? 'border-red-500/50' : 'border-white/10'
                )}
              />
              {getFieldError(field) && (
                <p className={cn('text-xs text-red-500 ml-2 flex items-center gap-1', isMobile && 'text-sm')}>
                  <AlertCircle className={cn('w-3 h-3', isMobile && 'w-4 h-4')} /> {getFieldError(field)}
                </p>
              )}
            </div>
          ))}
        </section>
      );
    }

    if (activeSection === 'languages') {
      return (
        <section className={cn('space-y-4 bg-[#161616] p-4 rounded-2xl border border-white/10', isMobile && 'space-y-5 rounded-3xl p-5')}>
          <div className="space-y-2">
            <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
              {t('common.targetDuration')}
            </label>
            <input
              type="text"
              value={localMeta.targetDuration}
              disabled={isSaving}
              onChange={(e) => handleChange('targetDuration', e.target.value)}
              className={cn(
                'w-full bg-[#121212] border border-white/10 rounded-xl px-4 h-11 text-sm font-medium transition-all text-white focus:border-white/20 outline-none',
                isMobile && 'h-12 text-base rounded-2xl'
              )}
            />
          </div>

          <div className="space-y-3">
            <label className={cn('text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1', isMobile && 'text-[11px]')}>
              {t('common.languages')}
            </label>
            <div className="flex flex-wrap gap-2">
              {localMeta.languages?.map((lang, idx) => (
                <span key={idx} className={cn('yt-chip bg-white/5 text-white/70 border-white/10', isMobile && 'text-sm px-3 py-1.5')}>
                  {lang}
                </span>
              ))}
              <button
                disabled={isSaving}
                onClick={() => triggerHaptic('light')}
                className={cn('yt-chip bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all border-dashed', isMobile && 'text-sm px-3 py-1.5')}
              >
                + {t('common.add', { defaultValue: 'Add' })}
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className={cn('bg-red-500/5 p-4 rounded-2xl border border-red-500/20 space-y-3', isMobile && 'rounded-3xl p-5 space-y-4')}>
        <button
          onClick={() => {
            triggerHaptic('warning');
            onClose();
            onDelete();
          }}
          disabled={isSaving}
          className={cn(
            'w-full h-12 rounded-2xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50',
            isMobile && 'h-14 text-base'
          )}
        >
          <Trash2 className={cn('w-4 h-4', isMobile && 'w-5 h-5')} />
          {t('common.deleteProject', { defaultValue: 'Delete Project' })}
        </button>
      </section>
    );
  };

  const sectionTitle =
    activeSection === 'menu'
      ? t('common.projectSettings')
      : activeSection === 'general'
        ? t('common.title')
        : activeSection === 'details'
          ? t('common.format')
          : activeSection === 'languages'
            ? t('common.languages')
            : t('common.deleteProject', { defaultValue: 'Delete Project' });

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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed z-[5010] bg-background shadow-2xl flex flex-col border-white/10',
              isMobile
                ? 'top-0 right-0 bottom-0 w-screen max-w-none border-l'
                : 'top-0 right-0 bottom-0 w-[34%] min-w-[360px] max-w-[520px] border-l'
            )}
          >
            <div
              className={cn('h-16 flex items-center justify-between px-5 border-b border-white/10 bg-[#171717] flex-shrink-0', isMobile && 'h-20')}
              style={isMobile ? { paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' } : undefined}
            >
              <div className="flex items-center gap-2 min-w-0">
                {activeSection !== 'menu' && (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveSection('menu');
                    }}
                    aria-label="Retour"
                    className={cn('rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 border-none', isMobile ? 'w-11 h-11' : 'w-9 h-9')}
                  >
                    <ChevronLeft className={cn('w-4 h-4', isMobile && 'w-5 h-5')} />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <Settings className={cn('w-4 h-4 text-white/60', isMobile && 'w-5 h-5')} />
                  <h3 className={cn('font-semibold tracking-tight text-white', isMobile ? 'text-lg' : 'text-base')}>{sectionTitle}</h3>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                disabled={isSaving}
                aria-label="Fermer les metadonnees"
                className={cn(
                  'flex items-center justify-center rounded-full transition-all text-white border-none disabled:opacity-50',
                  isMobile ? 'w-12 h-12 bg-white/10 hover:bg-white/20 active:scale-95' : 'w-10 h-10 bg-white/5 hover:bg-white/10'
                )}
              >
                <X className={cn('w-5 h-5', isMobile && 'w-6 h-6')} />
              </button>
            </div>

            <div className={cn('flex-1 overflow-y-auto p-4 md:p-5 space-y-3 scroll-smooth overscroll-contain', isMobile && 'p-5 space-y-4')}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeSection}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === 'menu' ? renderMenu() : renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className={cn('p-4 md:p-5 border-t border-white/10 bg-[#171717] flex-shrink-0 space-y-3', isMobile && 'p-5 space-y-3.5')}>
              <button
                onClick={() => {
                  triggerHaptic('success');
                  handleSave();
                }}
                disabled={isSaving || errors.length > 0 || !hasChanges}
                className={cn(
                  'yt-btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base font-bold',
                  isMobile && 'h-14 text-lg'
                )}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'Saving...' : t('common.saveChanges')}
              </button>
              {isMobile && (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    onClose();
                  }}
                  disabled={isSaving}
                  className="w-full h-14 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                >
                  <X className="w-5 h-5" />
                  Fermer
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
