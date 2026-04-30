import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ProjectFormat } from '../../types';
import { getErrorMessage } from '../../lib/errorClassifier';
import { ProjectInput } from './ProjectInput';

interface HomePageProps {
  onProjectCreate: (idea: string, format?: ProjectFormat) => Promise<void>;
}

export function HomePage({ onProjectCreate }: HomePageProps) {
  const { t } = useTranslation();
  const [storyIdea, setStoryIdea] = useState('');
  const [selectedFormat] = useState<ProjectFormat | 'Auto'>('Auto');
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
    <div className="w-full flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="mt-8 md:mt-12 mb-12 md:mb-16 flex flex-col items-center gap-10 md:gap-8 z-10 w-full"
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
