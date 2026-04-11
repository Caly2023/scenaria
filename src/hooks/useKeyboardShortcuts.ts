import { useEffect } from 'react';
import { WorkflowStage } from '../types';

interface KeyboardShortcutsProps {
  onProjectSwitch: () => void;
  onDoctorToggle: () => void;
  onStageChange: (stage: WorkflowStage) => void;
  activeStage: WorkflowStage;
  stages: WorkflowStage[];
  onShowHelp: () => void;
}

export function useKeyboardShortcuts({
  onProjectSwitch,
  onDoctorToggle,
  onStageChange,
  activeStage,
  stages,
  onShowHelp
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Alt + S: Switch Project
      if (event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onProjectSwitch();
      }

      // Alt + D: Toggle Script Doctor
      if (event.altKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        onDoctorToggle();
      }

      // Alt + H: Show Help
      if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        onShowHelp();
      }

      // Arrow Left: Previous Stage
      if (event.key === 'ArrowLeft') {
        const currentIndex = stages.indexOf(activeStage);
        if (currentIndex > 0) {
          onStageChange(stages[currentIndex - 1]);
        }
      }

      // Arrow Right: Next Stage
      if (event.key === 'ArrowRight') {
        const currentIndex = stages.indexOf(activeStage);
        if (currentIndex < stages.length - 1) {
          onStageChange(stages[currentIndex + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onProjectSwitch, onDoctorToggle, onStageChange, activeStage, stages, onShowHelp]);
}
