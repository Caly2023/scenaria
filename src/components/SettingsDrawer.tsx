import { useEffect, useMemo, useState } from 'react';
import {
  Globe,
  LogOut,
  Monitor,
  Moon,
  Save,
  Settings,
  Sun,
  UserCircle2,
  X,
  Mail,
  Shield,
  Contrast,
  Type,
  MoveHorizontal,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const { i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [photoURL, setPhotoURL] = useState(user.photoURL ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user.displayName ?? '');
      setPhotoURL(user.photoURL ?? '');
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

  const currentLanguage = language || i18n.resolvedLanguage || 'fr';

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />

          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed z-[100] bg-[#212121] shadow-2xl flex flex-col border-white/5',
              isMobile ? 'inset-0 h-[100dvh] w-full' : 'top-0 right-0 bottom-0 w-[34%] min-w-[360px] max-w-[520px] border-l',
            )}
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#1a1a1a] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 text-white flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="flex flex-col leading-none">
                  <h3 className="text-sm font-bold tracking-tight text-white">Parametres</h3>
                  <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold mt-1">
                    Compte, preferences et session
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all text-white border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 scroll-smooth overscroll-contain">
              <section className="bg-white/[0.02] p-5 rounded-[24px] border border-white/5 space-y-5">
                <div className="flex items-center gap-4">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Avatar'}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <UserCircle2 className="w-8 h-8 text-white/40" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white truncate">
                      {user.displayName || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-white/50 truncate">{user.email || 'Aucun email'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                      Nom d'affichage
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="w-full bg-[#121212] border border-white/5 rounded-full px-5 h-11 text-base font-medium text-white focus:border-white/20 outline-none"
                      placeholder="Votre nom"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold ml-1">
                      Photo de profil
                    </label>
                    <input
                      type="url"
                      value={photoURL}
                      onChange={(event) => setPhotoURL(event.target.value)}
                      className="w-full bg-[#121212] border border-white/5 rounded-full px-5 h-11 text-sm font-medium text-white focus:border-white/20 outline-none"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-[20px] border border-white/5 bg-[#121212] px-4 py-3 flex items-center gap-3">
                      <Mail className="w-4 h-4 text-white/40" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Email</p>
                        <p className="text-sm text-white/70 truncate">{user.email || 'Non renseigne'}</p>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-white/5 bg-[#121212] px-4 py-3 flex items-center gap-3">
                      <Shield className="w-4 h-4 text-white/40" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Connexion</p>
                        <p className="text-sm text-white/70">{user.providerId || 'google.com'}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || !canSaveProfile}
                    className="yt-btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSavingProfile ? 'Enregistrement...' : 'Enregistrer mes informations'}
                  </button>
                </div>
              </section>

              <section className="bg-white/[0.02] p-5 rounded-[24px] border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-white/50" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Langue</h4>
                    <p className="text-xs text-white/40">Basculer l'interface instantanement</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'fr', label: 'Francais' },
                    { value: 'en', label: 'English' },
                  ].map((option) => {
                    const isActive = currentLanguage.startsWith(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => onLanguageChange(option.value)}
                        className={cn(
                          'rounded-[20px] border px-4 py-3 text-sm font-semibold transition-all',
                          isActive
                            ? 'bg-white text-black border-white'
                            : 'bg-[#121212] text-white/70 border-white/5 hover:border-white/15 hover:bg-white/5',
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white/[0.02] p-5 rounded-[24px] border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4 text-white/50" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Theme</h4>
                    <p className="text-xs text-white/40">Choisir l'apparence generale</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'dark' as ThemeMode, label: 'Sombre', icon: Moon },
                    { value: 'light' as ThemeMode, label: 'Clair', icon: Sun },
                    { value: 'system' as ThemeMode, label: 'Systeme', icon: Monitor },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => onThemeChange(option.value)}
                        className={cn(
                          'rounded-[20px] border px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                          isActive
                            ? 'bg-white text-black border-white'
                            : 'bg-[#121212] text-white/70 border-white/5 hover:border-white/15 hover:bg-white/5',
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="bg-white/[0.02] p-5 rounded-[24px] border border-white/5 space-y-4">
                <h4 className="text-sm font-semibold text-white">Accessibilite</h4>
                {[
                  {
                    key: 'highContrast' as keyof AccessibilitySettings,
                    label: 'Contraste eleve',
                    icon: Contrast,
                  },
                  {
                    key: 'largeText' as keyof AccessibilitySettings,
                    label: 'Texte agrandi',
                    icon: Type,
                  },
                  {
                    key: 'reducedMotion' as keyof AccessibilitySettings,
                    label: 'Animations reduites',
                    icon: MoveHorizontal,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = accessibilitySettings[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleToggleAccessibility(item.key)}
                      className="w-full flex items-center justify-between rounded-[20px] border border-white/5 bg-[#121212] px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-3 text-white">
                        <Icon className="w-4 h-4 text-white/50" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </span>
                      <span
                        className={cn(
                          'w-10 h-5 rounded-full transition-all relative',
                          isActive ? 'bg-white' : 'bg-white/10',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-3 h-3 rounded-full transition-all',
                            isActive ? 'right-1 bg-black' : 'left-1 bg-white/40',
                          )}
                        />
                      </span>
                    </button>
                  );
                })}
              </section>

              <section className="bg-red-500/5 p-5 rounded-[24px] border border-red-500/10 space-y-4">
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-red-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Session</h4>
                    <p className="text-xs text-white/40">Se deconnecter de votre espace Scenaria</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full h-12 rounded-2xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
                </button>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
