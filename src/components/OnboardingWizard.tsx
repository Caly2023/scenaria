import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Sparkles, Layout, Zap, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to ScénarIA",
      description: "You're about to embark on a 9-stage journey to turn your idea into a production-ready script. Our AI Architect will guide you through every step.",
      icon: <Sparkles className="w-8 h-8 text-blue-400" />,
      color: "blue"
    },
    {
      title: "The Production Pipeline",
      description: "On the left, you'll see your 9-stage pipeline. Hover over the sidebar to expand it and see estimated completion times for each stage.",
      icon: <Layout className="w-8 h-8 text-purple-400" />,
      color: "purple"
    },
    {
      title: "Locking & Progressing",
      description: "Once you're happy with a stage, click 'Complete Stage & Continue'. This locks the current content and uses it as the foundation for the next stage.",
      icon: <Zap className="w-8 h-8 text-amber-400" />,
      color: "amber"
    },
    {
      title: "Meet the Script Doctor",
      description: "Need help? The Script Doctor is always available to brainstorm, refine your writing, or even generate visuals for your characters and locations.",
      icon: <Bot className="w-8 h-8 text-green-400" />,
      color: "green"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-[#111111] rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)] border border-white/10"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 flex gap-1 px-8 pt-6">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-white' : 'bg-white/10'}`} 
            />
          ))}
        </div>

        <button 
          onClick={onComplete}
          className="absolute top-8 right-8 p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 pt-20 flex flex-col items-center text-center">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-8 border border-white/5`}
          >
            {step.icon}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-3xl font-bold tracking-tighter text-white">{step.title}</h2>
              <p className="text-secondary text-lg leading-relaxed max-w-sm mx-auto">
                {step.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 w-full flex gap-4">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 h-11 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border-none"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 h-11 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-[#e5e5e5] transition-all border-none"
            >
              {currentStep === steps.length - 1 ? "Start Creating" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={onComplete}
            className="mt-6 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
          >
            Skip Intro
          </button>
        </div>
      </motion.div>
    </div>
  );
}
