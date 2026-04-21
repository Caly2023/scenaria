import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Contrast,
  Globe,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Moon,
  MoveHorizontal,
  Save,
  Settings2,
  Shield,
  Sun,
  Type,
  UserCircle2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { triggerHaptic } from '@/lib/haptics';

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
  const isMobile = useIsMobile();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [photoURL, setPhotoURL] = useState(user.photoURL ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState<'menu' | 'profile' | 'language' | 'theme' | 'accessibility' | 'session'>('menu');

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

  const menuItems = [
    {
      key: 'profile' as const,
      title: 'Profil',
      subtitle: 'Modifier vos informations',
      icon: UserCircle2,
    },
    {
      key: 'language' as const,
      title: 'Langue',
      subtitle: currentLanguage.startsWith('en') ? 'English' : 'Francais',
      icon: Globe,
    },
    {
      key: 'theme' as const,
      title: 'Apparence',
      subtitle: theme === 'dark' ? 'Sombre' : theme === 'light' ? 'Clair' : 'Systeme',
      icon: Sun,
    },
    {
      key: 'accessibility' as const,
      title: 'Accessibilite',
      subtitle: 'Contraste, texte et animations',
      icon: Contrast,
    },
    {
      key: 'session' as const,
      title: 'Session',
      subtitle: 'Deconnexion',
      icon: LogOut,
      danger: true,
    },
  ];

  const renderMenu = () => (
    <section className="space-y-3">
      <div className={cn("rounded-2xl border border-white/10 bg-[#161616] p-4 flex items-center gap-4", isMobile && "rounded-3xl p-5")}>
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Avatar'}
            referrerPolicy="no-referrer"
            className={cn("w-14 h-14 rounded-2xl object-cover border border-white/10", isMobile && "w-16 h-16 rounded-3xl")}
          />
        ) : (
          <div className={cn("w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center", isMobile && "w-16 h-16 rounded-3xl")}>
            <UserCircle2 className={cn("w-7 h-7 text-white/40", isMobile && "w-8 h-8")} />
          </div>
        )}
        <div className="min-w-0">
          <p className={cn("text-base font-semibold text-white truncate", isMobile && "text-lg")}>{user.displayName || 'Utilisateur'}</p>
          <p className={cn("text-sm text-white/50 truncate", isMobile && "text-[15px]")}>{user.email || 'Aucun email'}</p>
        </div>
      </div>

      <div className={cn("rounded-2xl border border-white/10 bg-[#161616] p-2", isMobile && "rounded-3xl p-3")}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                triggerHaptic('light');
                setActiveSection(item.key);
              }}
              className={cn(
                'w-full rounded-xl px-3 py-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors border-none',
                isMobile && 'rounded-2xl px-4 py-4',
                item.danger && 'hover:bg-red-500/10'
              )}
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border', isMobile && "w-11 h-11 rounded-xl", item.danger ? 'bg-red-500/10 border-red-500/20' : 'bg-[#111111] border-white/10')}>
                <Icon className={cn('w-4 h-4', isMobile && "w-5 h-5", item.danger ? 'text-red-400' : 'text-white/60')} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={cn('text-sm font-semibold', isMobile && "text-base", item.danger ? 'text-red-300' : 'text-white')}>{item.title}</p>
                <p className={cn('text-xs truncate', isMobile && "text-sm", item.danger ? 'text-red-300/60' : 'text-white/45')}>{item.subtitle}</p>
              </div>
              <ChevronRight className={cn('w-4 h-4', isMobile && "w-5 h-5", item.danger ? 'text-red-300/60' : 'text-white/30')} />
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderSection = () => {
    if (activeSection === 'profile') {
      return (
        <section className={cn("bg-[#161616] p-4 rounded-2xl border border-white/10 space-y-4", isMobile && "rounded-3xl p-5 space-y-5")}>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nom d'affichage</label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className={cn("w-full bg-[#111111] border border-white/10 rounded-xl px-4 h-11 text-base font-medium text-white focus:border-white/30 outline-none", isMobile && "h-13 rounded-2xl text-lg")}
                placeholder="Votre nom"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Photo de profil</label>
              <input
                type="url"
                value={photoURL}
                onChange={(event) => setPhotoURL(event.target.value)}
                className={cn("w-full bg-[#111111] border border-white/10 rounded-xl px-4 h-11 text-sm font-medium text-white focus:border-white/30 outline-none", isMobile && "h-13 rounded-2xl text-base")}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#111111] px-3.5 py-3 flex items-center gap-3">
                <Mail className="w-4 h-4 text-white/40" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Email</p>
                  <p className="text-sm text-white/70 truncate">{user.email || 'Non renseigne'}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#111111] px-3.5 py-3 flex items-center gap-3">
                <Shield className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Connexion</p>
                  <p className="text-sm text-white/70">{user.providerId || 'google.com'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('success');
                handleSaveProfile().then(() => setActiveSection('menu'));
              }}
              disabled={isSavingProfile || !canSaveProfile}
              className={cn("yt-btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", isMobile && "h-14 text-base")}
            >
              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingProfile ? 'Enregistrement...' : 'Enregistrer mes informations'}
            </button>
          </div>
        </section>
      );
    }

    if (activeSection === 'language') {
      return (
        <section className={cn("bg-[#161616] p-4 rounded-2xl border border-white/10 space-y-3", isMobile && "rounded-3xl p-5 space-y-4")}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'fr', label: 'Francais' },
              { value: 'en', label: 'English' },
            ].map((option) => {
              const isActive = currentLanguage.startsWith(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    triggerHaptic('light');
                    onLanguageChange(option.value);
                    setActiveSection('menu');
                  }}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
                    isMobile && 'rounded-2xl py-3.5 text-base',
                    isActive
                      ? 'bg-white text-black border-white'
                      : 'bg-[#111111] text-white/80 border-white/10 hover:border-white/20 hover:bg-white/5',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      );
    }

    if (activeSection === 'theme') {
      return (
        <section className={cn("bg-[#161616] p-4 rounded-2xl border border-white/10 space-y-3", isMobile && "rounded-3xl p-5 space-y-4")}>
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
                  onClick={() => {
                    triggerHaptic('light');
                    onThemeChange(option.value);
                    setActiveSection('menu');
                  }}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2',
                    isMobile && 'rounded-2xl py-3.5 text-base',
                    isActive
                      ? 'bg-white text-black border-white'
                      : 'bg-[#111111] text-white/80 border-white/10 hover:border-white/20 hover:bg-white/5',
                  )}
                >
                  <Icon className={cn("w-4 h-4", isMobile && "w-5 h-5")} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>
      );
    }

    if (activeSection === 'accessibility') {
      return (
        <section className={cn("bg-[#161616] p-4 rounded-2xl border border-white/10 space-y-3", isMobile && "rounded-3xl p-5 space-y-4")}>
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
                onClick={() => {
                  triggerHaptic('light');
                  handleToggleAccessibility(item.key);
                }}
                className={cn("w-full flex items-center justify-between rounded-xl border border-white/10 bg-[#111111] px-4 py-3 hover:bg-white/5 transition-colors", isMobile && "rounded-2xl px-5 py-4")}
              >
                <span className="flex items-center gap-3 text-white">
                  <Icon className={cn("w-4 h-4 text-white/50", isMobile && "w-5 h-5")} />
                  <span className={cn("text-sm font-medium", isMobile && "text-base")}>{item.label}</span>
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
      );
    }

    return (
      <section className={cn("bg-red-500/5 p-4 rounded-2xl border border-red-500/20 space-y-3", isMobile && "rounded-3xl p-5")}>
        <button
          onClick={() => {
            triggerHaptic('warning');
            handleLogout();
          }}
          disabled={isLoggingOut}
          className={cn("w-full h-12 rounded-2xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50", isMobile && "h-14 text-base")}
        >
          {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
        </button>
      </section>
    );
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
            <div
              className={cn("h-16 flex items-center justify-between px-5 border-b border-white/10 bg-[#171717] flex-shrink-0", isMobile && "h-20")}
              style={isMobile ? { paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' } : undefined}
            >
              <div className="flex items-center gap-2 min-w-0">
                {activeSection !== 'menu' && (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveSection('menu');
                    }}
                    aria-label="Retour"
                    className={cn("rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 border-none", isMobile ? "w-11 h-11" : "w-9 h-9")}
                  >
                    <ChevronLeft className={cn("w-4 h-4", isMobile && "w-5 h-5")} />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <Settings2 className={cn("w-4 h-4 text-white/60", isMobile && "w-5 h-5")} />
                  <h3 className={cn("text-base font-semibold tracking-tight text-white", isMobile && "text-lg")}>
                    {activeSection === 'menu'
                      ? 'Parametres'
                      : activeSection === 'profile'
                        ? 'Profil'
                        : activeSection === 'language'
                          ? 'Langue'
                          : activeSection === 'theme'
                            ? 'Apparence'
                            : activeSection === 'accessibility'
                              ? 'Accessibilite'
                              : 'Session'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                aria-label="Fermer les paramètres"
                className={cn(
                  "flex items-center justify-center rounded-full transition-all text-white border-none",
                  isMobile
                    ? "w-12 h-12 bg-white/10 hover:bg-white/20 active:scale-95"
                    : "w-10 h-10 bg-white/5 hover:bg-white/10"
                )}
              >
                <X className={cn("w-5 h-5", isMobile && "w-6 h-6")} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 scroll-smooth overscroll-contain">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeSection}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeSection === 'menu' ? renderMenu() : renderSection()}
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
