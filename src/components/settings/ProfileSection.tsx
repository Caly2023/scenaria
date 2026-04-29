import React from 'react';
import { Save, Loader2, Mail, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface ProfileSectionProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  photoURL: string;
  setPhotoURL: (val: string) => void;
  email: string | null;
  providerId: string | undefined;
  isSaving: boolean;
  canSave: boolean;
  isMobile: boolean;
  onSave: () => Promise<void>;
}

export function ProfileSection({
  displayName,
  setDisplayName,
  photoURL,
  setPhotoURL,
  email,
  providerId,
  isSaving,
  canSave,
  isMobile,
  onSave,
}: ProfileSectionProps) {
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
              <p className="text-sm text-white/70 truncate">{email || 'Non renseigne'}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#111111] px-3.5 py-3 flex items-center gap-3">
            <Shield className="w-4 h-4 text-white/40" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Connexion</p>
              <p className="text-sm text-white/70">{providerId || 'google.com'}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('success');
            onSave();
          }}
          disabled={isSaving || !canSave}
          className={cn("yt-btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", isMobile && "h-14 text-base")}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Enregistrement...' : 'Enregistrer mes informations'}
        </button>
      </div>
    </section>
  );
}
