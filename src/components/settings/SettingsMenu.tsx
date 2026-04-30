import {
  ChevronRight,
  Contrast,
  Globe,
  LogOut,
  Sun,
  UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

type SettingsSection = 'menu' | 'profile' | 'language' | 'theme' | 'accessibility' | 'session';

interface SettingsMenuProps {
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  theme: 'dark' | 'light' | 'system';
  currentLanguage: string;
  isMobile: boolean;
  onSectionSelect: (section: SettingsSection) => void;
}

export function SettingsMenu({
  user,
  theme,
  currentLanguage,
  isMobile,
  onSectionSelect,
}: SettingsMenuProps) {
  const menuItems = [
    { key: 'profile' as const, title: 'Profil', subtitle: 'Modifier vos informations', icon: UserCircle2 },
    { key: 'language' as const, title: 'Langue', subtitle: currentLanguage.startsWith('en') ? 'English' : 'Francais', icon: Globe },
    { key: 'theme' as const, title: 'Apparence', subtitle: theme === 'dark' ? 'Sombre' : theme === 'light' ? 'Clair' : 'Systeme', icon: Sun },
    { key: 'accessibility' as const, title: 'Accessibilite', subtitle: 'Contraste, texte et animations', icon: Contrast },
    { key: 'session' as const, title: 'Session', subtitle: 'Deconnexion', icon: LogOut, danger: true },
  ];

  return (
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
                onSectionSelect(item.key);
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
}
