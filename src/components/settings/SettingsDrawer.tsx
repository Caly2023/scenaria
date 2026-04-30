import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { triggerHaptic } from '@/lib/haptics';

// Sub-components
import { ProfileSection } from './ProfileSection';
import { LanguageSection } from './LanguageSection';
import { ThemeSection } from './ThemeSection';
import { AccessibilitySection } from './AccessibilitySection';
import { SettingsMenu } from './SettingsMenu';
import { SessionSection } from './SessionSection';
import { SettingsHeader } from './SettingsHeader';

type ThemeMode = 'dark' | 'light' | 'system';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    providerId?: string;
  };
  theme: ThemeMode;
  language: string;
  accessibilitySettings: AccessibilitySettings;
  onThemeChange: (theme: ThemeMode) => void;
  onLanguageChange: (language: string) => void;
  onAccessibilityChange: (settings: AccessibilitySettings) => void;
  onSaveProfile: (profile: { displayName: string; photoURL: string }) => Promise<void>;
  onLogout: () => Promise<void>;
}

type SettingsSection = 'menu' | 'profile' | 'language' | 'theme' | 'accessibility' | 'session';

export function SettingsDrawer({
  isOpen,
  onClose,
  user,
  theme,
  language,
  accessibilitySettings,
  onThemeChange,
  onLanguageChange,
  onAccessibilityChange,
  onSaveProfile,
  onLogout,
}: SettingsDrawerProps) {
  const isMobile = useIsMobile();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [photoURL, setPhotoURL] = useState(user.photoURL ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('menu');

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user.displayName ?? '');
      setPhotoURL(user.photoURL ?? '');
      setActiveSection('menu');
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, user.displayName, user.photoURL]);

  const hasProfileChanges = useMemo(
    () => displayName !== (user.displayName ?? '') || photoURL !== (user.photoURL ?? ''),
    [displayName, photoURL, user.displayName, user.photoURL],
  );

  const canSaveProfile = displayName.trim().length > 0 && hasProfileChanges;
  const currentLanguage = language || 'fr';

  const handleToggleAccessibility = (key: keyof AccessibilitySettings) => {
    onAccessibilityChange({
      ...accessibilitySettings,
      [key]: !accessibilitySettings[key],
    });
  };

  const handleSaveProfile = async () => {
    if (!canSaveProfile) return;
    setIsSavingProfile(true);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        photoURL: photoURL.trim(),
      });
      setActiveSection('menu');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      onClose();
    } finally {
      setIsLoggingOut(false);
    }
  };


  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileSection
            displayName={displayName}
            setDisplayName={setDisplayName}
            photoURL={photoURL}
            setPhotoURL={setPhotoURL}
            email={user.email}
            providerId={user.providerId}
            isSaving={isSavingProfile}
            canSave={canSaveProfile}
            isMobile={isMobile}
            onSave={handleSaveProfile}
          />
        );
      case 'language':
        return (
          <LanguageSection
            currentLanguage={currentLanguage}
            isMobile={isMobile}
            onLanguageChange={onLanguageChange}
            onBack={() => setActiveSection('menu')}
          />
        );
      case 'theme':
        return (
          <ThemeSection
            theme={theme}
            isMobile={isMobile}
            onThemeChange={onThemeChange}
            onBack={() => setActiveSection('menu')}
          />
        );
      case 'accessibility':
        return (
          <AccessibilitySection
            settings={accessibilitySettings}
            isMobile={isMobile}
            onToggle={handleToggleAccessibility}
          />
        );
      case 'session':
        return (
          <SessionSection
            isMobile={isMobile}
            isLoggingOut={isLoggingOut}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[5000]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed z-[5010] bg-background shadow-2xl flex flex-col border-white/10',
              isMobile
                ? 'top-0 right-0 bottom-0 w-screen max-w-none border-l'
                : 'top-0 right-0 bottom-0 w-[34%] min-w-[360px] max-w-[520px] border-l',
            )}
          >
            <SettingsHeader
              isMobile={isMobile}
              activeSection={activeSection}
              onBack={() => setActiveSection('menu')}
              onClose={onClose}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 scroll-smooth overscroll-contain">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeSection}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === 'menu' ? (
                    <SettingsMenu
                      user={user}
                      theme={theme}
                      currentLanguage={currentLanguage}
                      isMobile={isMobile}
                      onSectionSelect={setActiveSection}
                    />
                  ) : (
                    renderSection()
                  )}
                </motion.div>
              </AnimatePresence>

              {isMobile && (
                <section className="pb-2">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onClose();
                    }}
                    className="w-full h-14 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-base"
                  >
                    <X className="w-5 h-5" />
                    Fermer
                  </button>
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
