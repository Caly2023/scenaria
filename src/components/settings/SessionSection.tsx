import { Loader2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface SessionSectionProps {
  isMobile: boolean;
  isLoggingOut: boolean;
  onLogout: () => void;
}

export function SessionSection({ isMobile, isLoggingOut, onLogout }: SessionSectionProps) {
  return (
    <section className={cn("bg-red-500/5 p-4 rounded-2xl border border-red-500/20 space-y-3", isMobile && "rounded-3xl p-5")}>
      <button
        onClick={() => {
          triggerHaptic('warning');
          onLogout();
        }}
        disabled={isLoggingOut}
        className={cn("w-full h-12 rounded-2xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50", isMobile && "h-14 text-base")}
      >
        {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
        {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
      </button>
    </section>
  );
}
