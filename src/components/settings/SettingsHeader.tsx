import { ChevronLeft, Settings2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface SettingsHeaderProps {
  isMobile: boolean;
  activeSection: string;
  onBack: () => void;
  onClose: () => void;
}

export function SettingsHeader({
  isMobile,
  activeSection,
  onBack,
  onClose,
}: SettingsHeaderProps) {
  return (
    <div
      className={cn("h-16 flex items-center justify-between px-5 border-b border-white/10 bg-[#171717] flex-shrink-0", isMobile && "h-20")}
      style={isMobile ? { paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' } : undefined}
    >
      <div className="flex items-center gap-2 min-w-0">
        {activeSection !== 'menu' && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onBack();
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
  );
}
