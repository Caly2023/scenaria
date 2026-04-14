import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PWAInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // 1. Detection: Already in standalone mode?
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. Detection: Mobile browser?
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    // 3. Logic: Dismissal check (localStorage)
    const dismissedUntil = localStorage.getItem('scenaria_pwa_prompt_dismissed_until');
    if (dismissedUntil && new Date().getTime() < parseInt(dismissedUntil)) return;

    // 4. Detection: iOS vs Android
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // 5. Handling: Android/Chrome 'beforeinstallprompt'
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Small delay to allow the app to settle before showing the popup
      setTimeout(() => setIsVisible(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 6. Handling: iOS (no event, show based on detection after delay)
    if (ios) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS doesn't have a programmatic prompt. 
      // The UI shows instructions, so this button can just act as a reminder or dismissal.
      // But for better UX, we can just keep the popup open until they dismiss.
    }
  };

  const handleRemindLater = () => {
    // Dismiss for 24 hours
    const tomorrow = new Date().getTime() + (24 * 60 * 60 * 1000);
    localStorage.setItem('scenaria_pwa_prompt_dismissed_until', tomorrow.toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-end justify-center px-0 pb-0 sm:items-center sm:p-6 sm:pb-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleRemindLater}
        />
        
        {/* Popup Card */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md bg-[#212121] rounded-t-[32px] sm:rounded-[40px] p-8 shadow-2xl border-t sm:border border-white/10 overflow-hidden"
        >
          {/* Close Button */}
          <button 
            onClick={handleRemindLater}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-6 pt-4">
            {/* App Logo - Premium rounding matching splash screen */}
            <div className="relative w-20 h-20 bg-[#1a1a1a] rounded-[28px] border border-white/10 overflow-hidden shadow-2xl">
              <img src="/logo.png" className="w-full h-full object-cover" alt="ScénarIA" />
            </div>

            {/* App Info */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">ScénarIA</h2>
              <p className="text-white/40 text-sm font-medium leading-relaxed px-4">
                {t('pwa.description', { defaultValue: 'Installez l\'application pour une expérience optimale et un accès direct depuis votre écran d\'accueil.' })}
              </p>
            </div>

            {/* Platform Specific Instructions (iOS) */}
            {isIOS && (
              <div className="w-full bg-white/5 rounded-2xl p-4 text-xs text-white/60 text-left flex items-start gap-3 border border-white/5">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Share className="w-4 h-4 text-white/80" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-white/80">Cliquer sur "Partager"</p>
                  <p>Puis sur le bouton <span className="text-white font-bold whitespace-nowrap">"Sur l'écran d'accueil"</span> pour l'installer.</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full space-y-3 pt-2">
              <button
                onClick={handleInstall}
                className="w-full yt-btn-primary"
              >
                {t('pwa.install', { defaultValue: 'Installer l\'application' })}
              </button>
              <button
                onClick={handleRemindLater}
                className="w-full yt-btn-secondary"
              >
                {t('pwa.later', { defaultValue: 'Me le rappeler plus tard' })}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
