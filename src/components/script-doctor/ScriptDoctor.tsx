import { useIsMobile } from '@/hooks/useIsMobile';
import { useProject } from '@/contexts/ProjectContext';
import { MobileFullScreenDrawer } from './MobileFullScreenDrawer';
import { ScriptDoctorContent } from './ScriptDoctorContent';

// ── Main export: renders as desktop panel OR mobile bottom sheet ──────────────
export function ScriptDoctor() {
  const isMobile = useIsMobile();
  const { isDoctorOpen, handleCloseDoctor } = useProject();
  
  if (isMobile) {
    return (
      <MobileFullScreenDrawer isOpen={isDoctorOpen} onClose={handleCloseDoctor}>
        <ScriptDoctorContent />
      </MobileFullScreenDrawer>
    );
  }
  
  return <ScriptDoctorContent />;
}
