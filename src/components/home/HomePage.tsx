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
    <div className="w-full flex flex-col items-center min-h-[60dvh] md:min-h-0 pb-40 md:pb-0">
      {/* Main Content Area - Centered on mobile */}
      <div className="flex-1 flex flex-col items-center justify-center w-full py-12 md:py-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center gap-6 md:gap-8 z-10 w-full"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-[#D4AF37]/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-1000 scale-150 pointer-events-none" />
            <img 
              src="/logo.png" 
              alt="ScénarIA" 
              className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.2)] relative z-10" 
            />
          </div>
          
          <div className="flex flex-col items-center text-center space-y-4 px-6">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight opacity-95 [font-family:'Poppins',sans-serif]">
              Scenar<span className="text-[#D4AF37]">ia</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-medium max-w-md leading-tight">
              {t('common.whatsTheStory')}
            </p>
            <p className="text-sm md:text-base text-white/50 leading-relaxed font-light tracking-wide max-w-lg">
              {t('common.helperText')}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Input Area - Fixed at bottom on mobile */}
      <div className={cn(
        "w-full max-w-4xl z-20 transition-all duration-300",
        "md:relative md:mt-12",
        "fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-background via-background/95 to-transparent md:bg-none md:p-0 md:pb-0"
      )}>
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
        
        {/* Mobile footer hint */}
        <div className="md:hidden mt-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold">
            Powered by Gemini 2.0
          </p>
        </div>
      </div>

      {/* Desktop footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="hidden md:flex mt-32 pb-12 flex flex-col items-center gap-4"
      >
        <div className="w-8 h-[1px] bg-white/20" />
        <p className="text-xs uppercase tracking-[0.6em] text-white/50 font-bold">
          Powered by Gemini 2.0
        </p>
      </motion.div>
    </div>
  );
}
