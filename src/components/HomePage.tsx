import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Import, 
  ChevronRight, 
  Clock, 
  Film,
  Tv,
  Clapperboard,
  Send,
  Paperclip,
  ArrowUp,
  Trash2,
  Globe,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Project, ProjectFormat } from '@/types';
import { DictationButton } from './DictationButton';

interface HomePageProps {
  projects: Project[];
  onProjectCreate: (brainstormingDraft: string, format?: ProjectFormat) => void;
  onProjectSelect: (id: string) => void;
  onProjectDelete: (id: string) => void;
}

export function HomePage({ projects, onProjectCreate, onProjectSelect, onProjectDelete }: HomePageProps) {
  const { t } = useTranslation();
  const [storyIdea, setStoryIdea] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<ProjectFormat | 'Auto'>('Auto');
  const [isFocused, setIsFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (storyIdea.trim() && !isCreating) {
      setIsCreating(true);
      try {
        await onProjectCreate(storyIdea, selectedFormat === 'Auto' ? undefined : selectedFormat);
        setStoryIdea('');
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setStoryIdea(prev => prev + '\n' + content);
      };
      reader.readAsText(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-white flex flex-col items-center justify-center px-4 md:px-6 relative overflow-hidden pb-8">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 md:mb-12 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter italic lowercase opacity-80">
          scénar<span className="opacity-40">ia</span>
        </h1>
      </motion.div>

      {/* Main Container */}
      <div className="w-full max-w-3xl flex flex-col items-center space-y-8 z-10">
        
        {/* Input Area */}
        <div className="w-full max-w-3xl space-y-4 z-10">
          {/* Format Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-4">
            {['Auto', 'Short Film', 'Feature', 'Series'].map((format) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format as any)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                  selectedFormat === format 
                    ? "bg-white text-black border-white" 
                    : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white"
                )}
              >
                {format === 'Auto' ? t('common.autoDetect', { defaultValue: 'Auto-détection' }) : format}
              </button>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "w-full bg-surface rounded-[32px] transition-all duration-500 overflow-hidden group shadow-2xl border border-white/5",
              isFocused ? "ring-2 ring-white/10" : ""
            )}
          >
          <div className="p-8 space-y-4">
            <textarea
              ref={textareaRef}
              value={storyIdea}
              onChange={(e) => {
                setStoryIdea(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 400)}px`;
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={t('common.whatsTheStory')}
              className="w-full bg-transparent border-none text-lg md:text-2xl font-sans leading-relaxed focus:outline-none placeholder:text-white/10 px-2 min-h-[120px] md:min-h-[160px] resize-none no-scrollbar text-white"
            />
          </div>

          {/* Input Footer */}
          <div className="px-8 py-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                className="hidden" 
                accept=".txt,.md"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all flex items-center justify-center group relative"
              >
                <Plus className="w-6 h-6" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#212121] text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                  {t('common.importText')}
                </span>
              </button>
              <button className="w-12 h-12 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all flex items-center justify-center group relative">
                <Paperclip className="w-6 h-6" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#212121] text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                  {t('common.attach')}
                </span>
              </button>
              
              <DictationButton 
                onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
                size="lg"
              />
            </div>

            <button 
              onClick={() => handleSubmit()}
              disabled={!storyIdea.trim() || isCreating}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                storyIdea.trim() && !isCreating
                  ? "bg-white text-black hover:scale-110 active:scale-95 shadow-lg" 
                  : "bg-white/5 text-white/10 cursor-not-allowed"
              )}
            >
              {isCreating ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-6 h-6" />
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Recent Projects (Subtle) */}
        <AnimatePresence>
          {projects.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full pt-12"
            >
              <div className="flex items-center justify-between mb-6 px-4">
                <h2 className="text-[10px] uppercase tracking-widest text-secondary font-bold">{t('common.recentMasterpieces')}</h2>
                <button className="text-[10px] uppercase tracking-widest text-white/40 font-bold hover:text-white transition-colors">{t('common.viewAll')}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {projects.slice(0, 6).map((project) => (
                  <div
                    key={project.id}
                    className="group relative bg-[#1a1a1a] rounded-[32px] border border-white/5 hover:border-white/10 transition-all shadow-2xl overflow-hidden flex flex-col"
                  >
                    <button
                      onClick={() => onProjectSelect(project.id)}
                      className="flex-1 p-8 text-left space-y-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                          <Clapperboard className="w-6 h-6 text-white/40 group-hover:text-white" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                            {project.metadata?.format}
                          </span>
                          <div className="flex items-center gap-1.5 text-white/20">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-medium">
                              {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-secondary transition-colors truncate">
                          {project.metadata?.title || t('common.untitled')}
                        </h3>
                        <p className="text-sm text-white/40 line-clamp-2 leading-relaxed min-h-[40px]">
                          {project.metadata?.logline || project.loglineDraft || (
                            <span className="italic opacity-50">
                              {t('common.loglineDrafting', { defaultValue: 'Logline currently being drafted in Brainstorming...' })}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {project.metadata?.genre && (
                          <span className="yt-chip bg-white/5 text-white/60 border-none">
                            <Tag className="w-3 h-3 mr-1.5 opacity-40" />
                            {project.metadata.genre}
                          </span>
                        )}
                        {project.metadata?.languages?.slice(0, 1).map((lang, i) => (
                          <span key={i} className="yt-chip bg-white/5 text-white/60 border-none">
                            <Globe className="w-3 h-3 mr-1.5 opacity-40" />
                            {lang}
                          </span>
                        ))}
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProjectDelete(project.id);
                      }}
                      className="absolute top-6 right-6 p-3 rounded-xl bg-red-500/0 hover:bg-red-500/10 text-white/0 hover:text-red-500 transition-all group/delete"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/10 font-bold">
          {t('common.professionalStudio')}
        </p>
      </div>
    </div>
  );
}
