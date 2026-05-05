import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectFormat } from '../../types';
import { getErrorMessage } from '../../lib/errorClassifier';
import { ProjectInput } from './ProjectInput';
import { DiscoveryFlow } from './DiscoveryFlow';

interface HomePageProps {
  onProjectCreate: (idea: string, format?: ProjectFormat, extractedData?: any) => Promise<void>;
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
  
  // New state for discovery flow
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [submittedIdea, setSubmittedIdea] = useState('');

  const handleSubmit = async (customIdea?: string) => {
    const ideaToSubmit = customIdea || storyIdea;
    if (ideaToSubmit.trim() && !isCreating) {
      setSubmittedIdea(ideaToSubmit);
      setShowDiscovery(true);
      setStoryIdea('');
    }
  };

  const handleDiscoveryValidate = async (extractedData: any) => {
    setIsCreating(true);
    setCreationStatus('initializing');
    try {
      await onProjectCreate(submittedIdea, selectedFormat === 'Auto' ? undefined : selectedFormat, extractedData);
    } catch (error: unknown) {
      console.error('Creation failed:', error);
      setCreationError(getErrorMessage(error));
      setShowDiscovery(false);
    } finally {
      setIsCreating(false);
      setCreationStatus('idle');
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
      <AnimatePresence mode="wait">
        {!showDiscovery ? (
          <motion.div 
            key="home-input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl z-10 flex flex-col items-start md:items-center space-y-12"
          >
            {/* Background stays subtle */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[120px] rounded-full animate-pulse" />
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="w-full space-y-1"
            >
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white/90">
                {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
              </h1>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-white/40">
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

            {/* Gemini Style Pills */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="w-full flex flex-wrap justify-center gap-3 pt-2"
            >
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#131314] hover:bg-[#1e1f20] border border-white/5 rounded-xl transition-all">
                <span className="text-[14px] text-white/90">Créer une image</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#131314] hover:bg-[#1e1f20] border border-white/5 rounded-xl transition-all">
                <span className="text-[14px] text-white/90">Créer de la musique</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#131314] hover:bg-[#1e1f20] border border-white/5 rounded-xl transition-all">
                <span className="text-[14px] text-white/90">Rédiger</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#131314] hover:bg-[#1e1f20] border border-white/5 rounded-xl transition-all">
                <span className="text-[14px] text-white/90">Donne du peps à ma journée</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#131314] hover:bg-[#1e1f20] border border-white/5 rounded-xl transition-all">
                <span className="text-[14px] text-white/90">Aide-moi à apprendre</span>
              </button>
            </motion.div>

            {/* Simplified Footer Branding */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20 hidden md:block"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">
                Powered by S C E N A R I A Intelligence
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <DiscoveryFlow 
            key="discovery-chat"
            initialIdea={submittedIdea}
            onValidate={handleDiscoveryValidate}
            onCancel={() => setShowDiscovery(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
