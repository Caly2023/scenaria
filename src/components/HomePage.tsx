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
  const [creationStatus, setCreationStatus] = useState<'idle' | 'analyzing' | 'initializing'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (storyIdea.trim() && !isCreating) {
      setIsCreating(true);
      setCreationStatus('analyzing');
      try {
        await onProjectCreate(storyIdea, selectedFormat === 'Auto' ? undefined : selectedFormat);
        setStoryIdea('');
      } catch (error) {
        console.error('Creation failed:', error);
      } finally {
        setIsCreating(false);
        setCreationStatus('idle');
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
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col items-center px-4 md:px-6 relative overflow-x-hidden overflow-y-auto pb-20 no-scrollbar">
      
      {/* Premium Background — Animated Mesh Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden h-screen">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[120px] animate-[mesh-gradient_20s_infinite_alternate]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[100px] animate-[mesh-gradient_25s_infinite_alternate_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      {/* Hero / Logo Section */}
      <motion.div 
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="mt-20 mb-12 flex flex-col items-center gap-6 z-10"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 scale-150 pointer-events-none" />
          <img 
            src="/logo.png" 
            alt="ScénarIA" 
            className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10" 
          />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter italic lowercase opacity-90 leading-none">
            scénar<span className="opacity-40">ia</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">
            Professional Screenwriting Studio
          </p>
        </div>
      </motion.div>

      {/* Main Container / Input Section */}
      <div className="w-full max-w-4xl space-y-8 z-10">
        
        {/* Format Selector */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-2 px-4"
        >
          {['Auto', 'Short Film', 'Feature', 'Series'].map((format, i) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format as any)}
              className={cn(
                "px-5 py-2.5 rounded-full text-[10px] md:text-xs font-bold tracking-widest uppercase transition-all border",
                selectedFormat === format 
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110" 
                  : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white"
              )}
            >
              {format === 'Auto' ? t('common.autoDetect', { defaultValue: 'Auto-détection' }) : format}
            </button>
          ))}
        </motion.div>

        {/* Studio Input console */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "w-full bg-[#111111]/80 backdrop-blur-3xl rounded-[40px] transition-all duration-700 overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]",
            isFocused ? "ring-2 ring-white/20 border-white/20 -translate-y-2" : ""
          )}
        >
          <div className="p-8 md:p-12 space-y-6">
            <textarea
              ref={textareaRef}
              value={storyIdea}
              onChange={(e) => {
                setStoryIdea(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 400)}px`;
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={t('common.whatsTheStory')}
              className="w-full bg-transparent border-none text-xl md:text-3xl font-light leading-relaxed focus:outline-none placeholder:text-white/10 px-2 min-h-[120px] md:min-h-[160px] resize-none no-scrollbar text-white/90 selection:bg-white/20"
            />
          </div>

          {/* Integrated Toolbar Footer */}
          <div className="px-8 pb-8 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-full border border-white/5">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                className="hidden" 
                accept=".txt,.md"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-all flex items-center justify-center group relative"
                title={t('common.importText')}
              >
                <Plus className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-all flex items-center justify-center group relative" title={t('common.attach')}>
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="w-[1px] h-6 bg-white/10 mx-1" />

              <DictationButton 
                onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
                size="md"
              />
            </div>

            <button 
              onClick={() => handleSubmit()}
              disabled={!storyIdea.trim() || isCreating}
              className={cn(
                "h-12 px-8 rounded-full flex items-center gap-3 transition-all duration-500",
                storyIdea.trim() && !isCreating
                  ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                  : "bg-white/5 text-white/10 cursor-not-allowed border border-white/10"
              )}
            >
              <span className="text-xs font-black uppercase tracking-widest">
                {isCreating ? creationStatus : 'Create'}
              </span>
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Recent Projects Section */}
        <AnimatePresence>
          {projects.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full pt-16"
            >
              <div className="flex items-center justify-between mb-10 px-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-white opacity-40" />
                  <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-black">{t('common.recentMasterpieces')}</h2>
                </div>
                <button className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black hover:text-white transition-all">
                  {t('common.viewAll')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.slice(0, 6).map((project, idx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + (idx * 0.1) }}
                    className="group relative bg-[#111] rounded-[32px] border border-white/5 hover:border-white/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col h-full min-h-[220px]"
                  >
                    <button
                      onClick={() => onProjectSelect(project.id)}
                      className="flex-1 p-8 text-left flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-500">
                          <Clapperboard className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5 text-white/40 group-hover:text-white transition-colors">
                          {project.metadata?.format || 'Auto'}
                        </span>
                      </div>

                      <div className="space-y-3 flex-1">
                        <h3 className="text-xl font-bold tracking-tight text-white group-hover:tracking-normal transition-all duration-500">
                          {project.metadata?.title || t('common.untitled')}
                        </h3>
                        <p className="text-xs text-white/30 line-clamp-2 leading-relaxed italic group-hover:text-white/60 transition-colors">
                          {project.metadata?.logline || t('common.loglineDrafting')}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span className="text-[8px] font-bold uppercase tracking-widest">
                            {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'New'}
                          </span>
                        </div>
                        {project.metadata?.genre && (
                          <div className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">{project.metadata.genre}</span>
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProjectDelete(project.id);
                      }}
                      className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center bg-red-500/0 hover:bg-red-500 text-white/0 hover:text-white transition-all duration-300"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}

                {/* Create New Bento Card */}
                {projects.length < 6 && (
                  <button 
                     onClick={() => textareaRef.current?.focus()}
                     className="group relative bg-white/5 rounded-[32px] border border-dashed border-white/10 hover:border-white/30 transition-all duration-500 flex flex-col items-center justify-center min-h-[220px]"
                  >
                    <Plus className="w-8 h-8 text-white/20 group-hover:text-white group-hover:scale-125 transition-all duration-500" />
                    <span className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white transition-all">Start New Story</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="mt-32 pb-12 flex flex-col items-center gap-4"
      >
        <div className="w-8 h-[1px] bg-white/20" />
        <p className="text-[9px] uppercase tracking-[0.6em] text-white/20 font-black">
          Powered by Gemini 2.0
        </p>
      </motion.div>
    </div>
  );
}
