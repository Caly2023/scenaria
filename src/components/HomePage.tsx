import { useState, useRef } from 'react';
import { 
  Plus, 
  ChevronRight, 
  Clock, 
  Film,
  Clapperboard,
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
  const [creationError, setCreationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (storyIdea.trim() && !isCreating) {
      setIsCreating(true);
      setCreationStatus('analyzing');
      setCreationError(null);
      try {
        await onProjectCreate(storyIdea, selectedFormat === 'Auto' ? undefined : selectedFormat);
        setStoryIdea('');
      } catch (error: any) {
        console.error('Creation failed:', error);
        // Extract a clean message if it's a JSON string from our Firestore error handler
        let msg = error?.message || String(error);
        if (msg.startsWith('{')) {
          try { msg = JSON.parse(msg).error; } catch {}
        }
        setCreationError(msg || 'An unexpected error occurred during project creation.');
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
    <div className="h-dvh w-full bg-[#050505] text-white flex flex-col items-center px-4 md:px-6 relative pb-32 overflow-y-auto scroll-smooth">
      
      {/* Premium Background — Animated Mesh Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[120px] animate-[mesh-gradient_20s_infinite_alternate]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[100px] animate-[mesh-gradient_25s_infinite_alternate_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      {/* Hero / Logo Section */}
      <motion.div 
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="mt-24 md:mt-24 mb-10 md:mb-16 flex flex-col items-center gap-8 z-10 w-full"
      >
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 scale-150 pointer-events-none" />
            <img 
              src="/logo.png" 
              alt="ScénarIA" 
              className="w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-10" 
            />
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-3xl md:text-5xl font-bold tracking-[0.02em] opacity-95 leading-none [font-family:'Poppins',sans-serif]">
              Scenar<span className="text-[#D4AF37]">ia</span>
            </h1>
          </div>
        </div>

        <div className="text-center max-w-2xl px-4">
          <p className="text-sm md:text-base text-white/80 leading-relaxed font-light tracking-wide italic">
            {t('common.helperText')}
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
          {['Auto', 'Short Film', 'Feature', 'Series'].map((format) => (
            <button
              key={format}
              onClick={() => setSelectedFormat(format as any)}
              className={cn(
                "px-6 py-3 rounded-full text-xs md:text-sm font-bold tracking-[0.1em] uppercase transition-all border whitespace-nowrap",
                selectedFormat === format 
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110" 
                  : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
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
            "w-full bg-white/[0.03] backdrop-blur-2xl rounded-[32px] transition-all duration-500 overflow-hidden border border-white/10",
            isFocused ? "border-white/20 bg-white/[0.04]" : ""
          )}
        >
          <div className="p-6 md:p-12 space-y-6">
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
              className="w-full bg-transparent border-none text-lg md:text-xl font-normal leading-relaxed placeholder:text-white/45 px-2 min-h-[150px] resize-none no-scrollbar text-white/95 selection:bg-white/30"
            />
          </div>

          {/* Integrated Toolbar Footer */}
          <div className="px-6 md:px-12 pb-8 md:pb-10 pt-2 flex items-center justify-between">
            <div className="flex items-center gap-3 p-1.5 bg-white/5 rounded-full border border-white/5">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                className="hidden" 
                accept=".txt,.md"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center group relative border-none"
                title={t('common.importText')}
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <DictationButton 
                onResult={(text) => setStoryIdea(prev => prev + (prev ? ' ' : '') + text)}
                size="md"
              />
            </div>

            <button 
              onClick={() => handleSubmit()}
              disabled={!storyIdea.trim() || isCreating}
              className={cn(
                "h-12 px-10 rounded-full flex items-center gap-4 transition-all duration-500 border-none",
                storyIdea.trim() && !isCreating
                  ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                  : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
              )}
            >
              <span className="text-xs font-black uppercase tracking-[0.2em]">
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

        {/* Error Display */}
        <AnimatePresence>
          {creationError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-4 bg-red-500/10 border border-red-500/20 backdrop-blur-xl rounded-2xl flex items-center gap-3 text-red-400 text-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <p className="flex-1 font-medium">{creationError}</p>
              <button 
                onClick={() => setCreationError(null)}
                className="text-red-400/50 hover:text-red-400 transition-colors"
                title="Dismiss"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Projects Section */}
        <div className="w-full pt-16 pb-20">
          <div className="flex items-center justify-between mb-8 px-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <h2 className="text-xs uppercase tracking-[0.4em] text-white/30 font-black">{t('common.recentMasterpieces')}</h2>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full px-4 overflow-y-visible">
            <AnimatePresence mode="popLayout">
              {projects.length > 0 ? (
                projects.map((project, idx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    transition={{ 
                      delay: idx * 0.05,
                      duration: 0.4,
                      ease: [0.23, 1, 0.32, 1]
                    }}
                    className="group relative"
                  >
                    {/* Background Glow Effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-white/0 via-white/[0.05] to-white/0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur" />
                    
                    <button
                      onClick={() => onProjectSelect(project.id)}
                      className="relative w-full p-6 md:p-8 text-left flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 glass rounded-[32px] border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden"
                    >
                      {/* Decorative Background Element */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                      {/* Left: Premium Icon Container */}
                      <div className="flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="w-14 h-14 md:w-24 md:h-24 rounded-[20px] md:rounded-[28px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 flex items-center justify-center group-hover:from-white group-hover:to-white transition-all duration-700 shadow-2xl relative z-10">
                          <Clapperboard className="w-6 h-6 md:w-10 md:h-10 group-hover:text-black transition-colors duration-500" />
                        </div>
                      </div>

                      {/* Center: Main Information */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="min-w-0 mb-4">
                          <h3 className="text-xl md:text-2xl font-sans font-bold tracking-tight text-white truncate group-hover:text-white transition-colors duration-300">
                            {project.metadata?.title || t('common.untitled')}
                          </h3>
                          
                          {/* Last Update Detail - Now below title */}
                          <div className="flex items-center gap-2 mt-2 opacity-70 group-hover:opacity-90 transition-opacity duration-500 font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs uppercase tracking-widest">
                              {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'NEW'}
                            </span>
                          </div>

                          {project.metadata?.logline && (
                            <p className="text-sm md:text-base text-white/70 line-clamp-2 italic font-light mt-3 group-hover:text-white/90 transition-colors duration-300 max-w-2xl leading-relaxed">
                              {project.metadata.logline}
                            </p>
                          )}
                        </div>

                        {/* Metadata Tags Row */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/[0.05] border border-white/5 text-xs font-bold uppercase tracking-[0.2em] text-white/70 group-hover:bg-white/10 group-hover:text-white transition-all duration-300 whitespace-nowrap">
                            <Film className="w-4 h-4 opacity-50" />
                            <span>{project.metadata?.format || 'Auto'}</span>
                          </div>
                          
                          {project.metadata?.genre && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-white/10" />
                              <div className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/[0.05] border border-white/5 text-xs font-bold uppercase tracking-[0.2em] text-white/70 group-hover:bg-white/10 group-hover:text-white transition-all duration-300 whitespace-nowrap">
                                <Tag className="w-4 h-4 opacity-50" />
                                <span>{project.metadata.genre}</span>
                              </div>
                            </>
                          )}

                          {project.metadata?.languages?.[0] && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-white/10" />
                              <div className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-white/[0.05] border border-white/5 text-xs font-bold uppercase tracking-[0.2em] text-white/80 group-hover:bg-white/10 group-hover:text-white transition-all duration-300 whitespace-nowrap">
                                <Globe className="w-4 h-4 opacity-50" />
                                <span>{project.metadata.languages[0]}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Interaction Indicator */}
                      <div className="flex-shrink-0 ml-auto md:ml-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border border-white/5 group-hover:border-white/20 group-hover:bg-white/5 transition-all duration-500">
                          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white/10 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-500" />
                        </div>
                      </div>
                    </button>

                    {/* Quick Actions Overlay (Delete) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProjectDelete(project.id);
                      }}
                      className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 rounded-full flex items-center justify-center bg-transparent hover:bg-red-500/10 text-white/0 hover:text-red-500 transition-all duration-300 opacity-100 md:opacity-0 group-hover:opacity-100 z-20"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 px-6 rounded-[32px] border border-white/5 bg-white/[0.01] text-center">
                  <p className="text-white/20 italic text-sm tracking-widest uppercase">
                    {t('common.noProjectsYet', { defaultValue: 'No recent films yet' })}
                  </p>
                </div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="mt-32 pb-12 flex flex-col items-center gap-4"
      >
        <div className="w-8 h-[1px] bg-white/20" />
        <p className="text-xs uppercase tracking-[0.6em] text-white/50 font-bold">
          Powered by Gemini 2.0
        </p>
      </motion.div>
    </div>
  );
}
