import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from '@/lib/firebase';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="h-dvh w-full bg-[#050505] text-white flex flex-col items-center justify-center px-4 md:px-6 relative overflow-hidden">
      
      {/* Premium Background — Animated Mesh Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[120px] animate-[mesh-gradient_20s_infinite_alternate]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[100px] animate-[mesh-gradient_25s_infinite_alternate_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 flex flex-col items-center max-w-md w-full text-center space-y-12"
      >
        {/* Logo & Branding */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 scale-150 pointer-events-none" />
            <img 
              src="/logo.png" 
              alt="ScénarIA" 
              className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-10" 
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-[0.02em] opacity-95 leading-none [font-family:'Poppins',sans-serif]">
              Scenar<span className="text-[#D4AF37]">ia</span>
            </h1>
            <p className="mt-6 text-sm md:text-base text-white/60 leading-relaxed font-light tracking-wide italic max-w-xs">
              {t('common.signIn')}
            </p>
          </div>
        </div>

        {/* Login Action */}
        <div className="w-full">
          <button 
            onClick={() => signInWithGoogle()}
            className={cn(
              "w-full h-14 rounded-full flex items-center justify-center gap-4 transition-all duration-500",
              "bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            )}
          >
            <LogIn className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              {t('common.signInWithGoogle')}
            </span>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex flex-col items-center gap-4 pt-8">
          <div className="w-8 h-[1px] bg-white/10" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-bold">
            Professional AI Screenwriting Studio
          </p>
        </div>
      </motion.div>
    </div>
  );
}
