import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ProjectFormat } from '../../types';
import { getErrorMessage } from '../../lib/errorClassifier';
import { cn } from '@/lib/utils';
import { ProjectInput } from './ProjectInput';

interface HomePageProps {
  onProjectCreate: (idea: string, format?: ProjectFormat) => Promise<void>;
  userDisplayName?: string;
}


export function HomePage({ onProjectCreate, userDisplayName }: HomePageProps) {
  const { t } = useTranslation();
  const [storyIdea, setStoryIdea] = useState('');
  const [selectedFormat] = useState<ProjectFormat | 'Auto'>('Auto');
  const [isFocused, setIsFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState<'idle' | 'analyzing' | 'initializing'>('idle');
  const [creationError, setCreationError] = useState<string | null>(null);

  const handleSubmit = async (customIdea?: string) => {
    const ideaToSubmit = customIdea || storyIdea;
    if (ideaToSubmit.trim() && !isCreating) {
      setIsCreating(true);
      setCreationStatus('analyzing');
      setCreationError(null);
      try {
        await onProjectCreate(ideaToSubmit, selectedFormat === 'Auto' ? undefined : selectedFormat);
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

  const firstName = userDisplayName?.split(' ')[0] || '';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden px-4 md:px-0">
      {/* Background stays subtle */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="w-full max-w-3xl z-10 flex flex-col items-start md:items-center space-y-12">
        {/* Gemini-style Greeting */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="w-full space-y-1"
        >
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-[#D4AF37]">
            {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
          </h1>
          <h2 className="text-xl md:text-2xl font-medium tracking-tight text-white/40">
            Prêt à créer votre prochain chef-d'œuvre ?
          </h2>
        </motion.div>

        {/* Input Area */}
        <div className="w-full">
          <ProjectInput 
            storyIdea={storyIdea}
            setStoryIdea={setStoryIdea}
            isFocused={isFocused}
            setIsFocused={setIsFocused}
            isCreating={isCreating}
            creationStatus={creationStatus}
            creationError={creationError}
            setCreationError={setCreationError}
            onSubmit={() => handleSubmit()}
            handleFileImport={handleFileImport}
          />
        </div>

        {/* Small text below field */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="w-full flex flex-wrap justify-center gap-6 pt-2"
        >
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest">Format Cinéma</span>
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest">Analyse IA</span>
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest">Script Doctoring</span>
        </motion.div>
      </div>

      {/* Simplified Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20 hidden md:block"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">
          Powered by ScénarIA Intelligence
        </p>
      </motion.div>
    </div>
  );
}
