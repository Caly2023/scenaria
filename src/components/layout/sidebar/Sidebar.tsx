import { useProject } from '@/contexts/ProjectContext';
import { stageRegistry } from '@/config/stageRegistry';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';

interface SidebarProps {
  /** If true, renders as a horizontal bottom navigation bar (mobile) */
  variant?: 'sidebar' | 'bottom-nav';
}

const stages = stageRegistry.getAll().map(s => ({
  id: s.id,
  step: s.order + 1,
  icon: s.icon,
  estTime: s.estTime
}));

export function Sidebar({ variant = 'sidebar' }: SidebarProps) {
  const { activeStage, handleStageChange, currentProject } = useProject();
  const validatedStages = currentProject?.validatedStages || [];
  
  const isStageUnlocked = (index: number) => {
    if (index === 0) return true;
    const previousStageId = stages[index - 1].id;
    
    // Check legacy field
    const isValidated = validatedStages.includes(previousStageId);
    
    // Check modern field (StageStates)
    const stageState = currentProject?.stageStates?.[previousStageId] || 'empty';
    const isReady = stageState === 'good' || stageState === 'excellent';
    
    return isValidated || isReady;
  };

  if (variant === 'bottom-nav') {
    return (
      <MobileBottomNav 
        stages={stages} 
        activeStage={activeStage} 
        onStageChange={handleStageChange} 
        isStageUnlocked={isStageUnlocked} 
      />
    );
  }

  return (
    <DesktopSidebar 
      stages={stages} 
      activeStage={activeStage} 
      onStageChange={handleStageChange} 
      isStageUnlocked={isStageUnlocked} 
    />
  );
}
