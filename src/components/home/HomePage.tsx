import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ProjectFormat } from '../../types';
import { getErrorMessage } from '../../lib/errorClassifier';
import { cn } from '@/lib/utils';
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
    <div className="w-full h-[100dvh] flex flex-col items-center relative overflow-hidden px-4">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl z-10 flex-1 flex flex-col items-center justify-center pb-[120px] md:pb-0">
        {/* Logo & Brand */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-[#D4AF37]/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 scale-125 pointer-events-none" />
            <div className="w-24 h-24 md:w-48 md:h-48 rounded-full flex items-center justify-center relative overflow-hidden">
              <img 
                src="/logo.png" 
                alt="ScénarIA" 
                className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(212,175,55,0.3)] relative z-10" 
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-2">
            <h1 className="text-xl md:text-4xl font-medium tracking-tight text-white max-w-[280px] md:max-w-none">
              {t('common.whatsTheStory')}
            </h1>
          </div>
        </motion.div>
      </div>

      {/* Input Area */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "w-full transition-all duration-500",
          "fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:max-w-5xl md:mx-auto md:mb-20",
          "bg-gradient-to-t from-background via-background/90 to-transparent md:bg-none z-50"
        )}
      >
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
        
        {/* Subtle Tip */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="hidden md:block text-center mt-8 text-xs font-medium text-white/20 uppercase tracking-[0.4em]"
        >
          {t('common.helperText')}
        </motion.p>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30 hover:opacity-100 transition-opacity duration-500 hidden md:flex"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-white">
            Powered by ScénarIA Intelligence
          </p>
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
        </div>
      </motion.div>
    </div>
  );
}
