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

const QUICK_ACTIONS = [
  { id: 'short', icon: '🎬', text: 'Court-métrage de fiction' },
  { id: 'documentary', icon: '📽️', text: 'Documentaire court' },
  { id: 'commercial', icon: '📺', text: 'Spot publicitaire AI' },
  { id: 'script', icon: '📝', text: 'Analyse de scénario' },
  { id: 'pitch', icon: '💡', text: 'Pitch de série' },
];

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
          className="w-full space-y-2"
        >
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-[#D4AF37]">
            {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
          </h1>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white/40">
            Par où commencer ?
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

        {/* Quick Action Pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="w-full flex flex-wrap justify-center gap-3 pt-4"
        >
          {QUICK_ACTIONS.map((action, i) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              onClick={() => {
                const text = `Je souhaite créer un ${action.text.toLowerCase()}`;
                setStoryIdea(text);
                handleSubmit(text);
              }}
              className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-white/80 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{action.icon}</span>
              <span>{action.text}</span>
            </motion.button>
          ))}
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
