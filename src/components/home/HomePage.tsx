import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Project, ProjectFormat } from '../../types';
import { getErrorMessage } from '../../lib/errorClassifier';
import { FormatSelector } from './FormatSelector';
import { ProjectInput } from './ProjectInput';
import { ProjectCard } from './ProjectCard';

export interface HomePageProps {
  projects: Project[];
  onProjectCreate: (idea: string, format?: ProjectFormat) => Promise<void>;
  onProjectSelect: (project: Project) => void;
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

  const handleSubmit = async () => {
    if (storyIdea.trim() && !isCreating) {
      setIsCreating(true);
      setCreationStatus('analyzing');
      setCreationError(null);
      try {
        await onProjectCreate(storyIdea, selectedFormat === 'Auto' ? undefined : selectedFormat);
        setStoryIdea('');
      } catch (error: unknown) {
        console.error('Creation failed:', error);
        setCreationError(getErrorMessage(error));
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

  return (
    <div className="h-dvh w-full bg-[#050505] text-white flex flex-col items-center px-4 md:px-6 relative pb-32 overflow-y-auto scroll-smooth">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[120px] animate-[mesh-gradient_20s_infinite_alternate]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[100px] animate-[mesh-gradient_25s_infinite_alternate_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="mt-20 md:mt-24 mb-12 md:mb-16 flex flex-col items-center gap-10 md:gap-8 z-10 w-full"
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

      <div className="w-full max-w-4xl space-y-10 md:space-y-8 z-10">
        <FormatSelector 
          selectedFormat={selectedFormat} 
          setSelectedFormat={setSelectedFormat} 
        />

        <ProjectInput 
          storyIdea={storyIdea}
          setStoryIdea={setStoryIdea}
          isFocused={isFocused}
          setIsFocused={setIsFocused}
          isCreating={isCreating}
          creationStatus={creationStatus}
          creationError={creationError}
          setCreationError={setCreationError}
          onSubmit={handleSubmit}
          handleFileImport={handleFileImport}
        />

        <div className="w-full pt-14 md:pt-16 pb-20">
          <div className="flex items-center justify-between mb-7 md:mb-8 px-4 md:px-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <h2 className="text-xs uppercase tracking-[0.4em] text-white/30 font-black">{t('common.recentMasterpieces')}</h2>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:gap-3 w-full px-2 md:px-4 overflow-y-visible">
            <AnimatePresence mode="popLayout">
              {projects.length > 0 ? (
                projects.map((project, idx) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    idx={idx}
                    onSelect={() => onProjectSelect(project)}
                    onDelete={onProjectDelete}
                  />
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
