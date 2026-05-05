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
    <div className="w-full min-h-screen flex flex-col relative overflow-y-auto overflow-x-hidden scroll-smooth selection:bg-[#D4AF37]/30">
      <AnimatePresence mode="wait">
        {!showDiscovery ? (
          <motion.div 
            key="home-input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="flex-1 w-full max-w-5xl mx-auto px-6 pt-[15vh] pb-48 flex flex-col items-center"
          >
            {/* Background stays subtle */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#D4AF37]/5 blur-[120px] rounded-full animate-pulse" />
            </div>

            <div className="w-full space-y-12 z-10 relative">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                className="w-full space-y-2 text-center md:text-left"
              >
                <h1 className="text-4xl md:text-6xl font-light tracking-tight text-white/90">
                  {firstName ? `Bonjour ${firstName}` : 'Bonjour'}
                </h1>
                <h2 className="text-4xl md:text-6xl font-light tracking-tight text-white/20">
                  Par où commencer ?
                </h2>
              </motion.div>

              {/* Gemini Style Pills */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="w-full flex flex-wrap justify-center md:justify-start gap-4 pt-4"
              >
                {[
                  { label: 'Créer une image', icon: '🎨' },
                  { label: 'Créer de la musique', icon: '🎵' },
                  { label: 'Rédiger', icon: '✍️' },
                  { label: 'Donne du peps à ma journée', icon: '✨' },
                  { label: 'Aide-moi à apprendre', icon: '🎓' }
                ].map((pill, i) => (
                  <button key={i} className="flex items-center gap-3 px-5 py-3 bg-[#161616]/40 hover:bg-[#161616]/80 border border-white/5 rounded-2xl transition-all backdrop-blur-xl group">
                    <span className="text-lg group-hover:scale-110 transition-transform">{pill.icon}</span>
                    <span className="text-[14px] text-white/70 group-hover:text-white transition-colors">{pill.label}</span>
                  </button>
                ))}
              </motion.div>
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-10 pt-10 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent pointer-events-none">
              <div className="max-w-4xl mx-auto w-full pointer-events-auto">
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
            </div>

            {/* Simplified Footer Branding */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 opacity-10 pointer-events-none"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.6em] text-white whitespace-nowrap">
                S C E N A R I A
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

