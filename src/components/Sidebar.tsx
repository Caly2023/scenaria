import { 
  Zap, 
  LayoutGrid, 
  BookOpen, 
  FileText, 
  ListOrdered, 
  PenTool, 
  ImageIcon,
  Info,
  Edit3,
  Layers,
  MapPin,
  Bot,
  Cpu,
  Film,
  Share
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { stageRegistry } from '@/config/stageRegistry';
import { DesktopSidebar } from './layout/sidebar/DesktopSidebar';
import { MobileBottomNav } from './layout/sidebar/MobileBottomNav';

interface SidebarProps {
  /** If true, renders as a horizontal bottom navigation bar (mobile) */
  variant?: 'sidebar' | 'bottom-nav';
}

const stageUIMetadata: Record<string, { icon: React.ElementType; estTime: string }> = {
  'Project Metadata': { icon: Info, estTime: '5m' },
  'Initial Draft': { icon: Edit3, estTime: '10m' },
  'Brainstorming': { icon: Lightbulb, estTime: '15m' }, // Wait, Lightbulb was used but not imported?
  'Logline': { icon: Zap, estTime: '5m' },
  '3-Act Structure': { icon: LayoutGrid, estTime: '30m' },
  '8-Beat Structure': { icon: Layers, estTime: '30m' },
  'Synopsis': { icon: FileText, estTime: '45m' },
  'Character Bible': { icon: BookOpen, estTime: '1h' },
  'Location Bible': { icon: MapPin, estTime: '30m' },
  'Treatment': { icon: PenTool, estTime: '2h' },
  'Step Outline': { icon: ListOrdered, estTime: '2h' },
  'Script': { icon: FileText, estTime: 'Days' },
  'Global Script Doctoring': { icon: Bot, estTime: '1h' },
  'Technical Breakdown': { icon: Cpu, estTime: '3h' },
  'Visual Assets': { icon: ImageIcon, estTime: '2h' },
  'AI Previs': { icon: Film, estTime: '2h' },
  'Production Export': { icon: Share, estTime: '5m' },
};

// Fixed Lightbulb import
import { Lightbulb } from 'lucide-react';

const stages = stageRegistry.getAll().map(s => ({
  id: s.id,
  step: s.order + 1,
  ...stageUIMetadata[s.id]
}));

export function Sidebar({ variant = 'sidebar' }: SidebarProps) {
  const { activeStage, handleStageChange, currentProject } = useProject();
  const validatedStages = currentProject?.validatedStages || [];
  
  const isStageUnlocked = (index: number) => {
    if (index === 0) return true;
    const previousStage = stages[index - 1].id;
    return validatedStages.includes(previousStage);
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
