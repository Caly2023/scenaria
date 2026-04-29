import { useEffect, useRef, useCallback, useState } from 'react';
import { WorkflowStage, Project, HydrationState } from '../types';
import { interpretIntent, buildProjectContext, dispatchToAgent, persistAgentOutput } from '../services/orchestratorService';
import { stageRegistry } from '../config/stageRegistry';

interface StageHydrationConfig {
  stage: WorkflowStage;
  isEmpty: () => boolean;
  generate: () => Promise<void>;
  label: string;
}

interface UseAutoHydrationProps {
  activeStage: WorkflowStage;
  currentProject: Project | null;
  stageContents: Record<string, import('../types/stageContract').ContentPrimitive[]>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onStageAnalyze: (stage: WorkflowStage) => Promise<void>;
}

export function useAutoHydration({
  activeStage,
  currentProject,
  stageContents,
  addToast,
  onStageAnalyze,
}: UseAutoHydrationProps): HydrationState {
  const [hydrationState, setHydrationState] = useState<HydrationState>({
    isHydrating: false,
    hydratingStage: null,
    hydratingLabel: null,
  });

  const activeHydrations = useRef<Set<string>>(new Set());
  const checkedStages = useRef<Set<string>>(new Set());

  const getContext = useCallback(() => {
    if (!currentProject) return null;
    return buildProjectContext(
      currentProject.id,
      currentProject.metadata,
      stageContents,
      currentProject.stageAnalyses || {}
    );
  }, [currentProject, stageContents]);

  const runStageHydration = useCallback(async (stageName: WorkflowStage) => {
    const context = getContext();
    if (!context || !currentProject) return;

    try {
      const decision = interpretIntent('', stageName);
      const agentOutput = await dispatchToAgent(decision, context, []);
      await persistAgentOutput(currentProject.id, stageName, agentOutput);
    } catch (e) {
      console.warn(`[AutoHydration] Failed to hydrate ${stageName}:`, e);
    }
  }, [currentProject, getContext]);

  const generateCharactersAndLocations = useCallback(async () => {
    await Promise.all([
      runStageHydration('Character Bible'),
      runStageHydration('Location Bible')
    ]);
  }, [runStageHydration]);

  const getHydrationConfig = useCallback((): StageHydrationConfig | null => {
    if (!currentProject) return null;

    const def = stageRegistry.get(activeStage);
    if (!def || !def.hydrationLabel) return null;

    return {
      stage: activeStage,
      isEmpty: () => (stageContents[activeStage] || []).length === 0,
      generate: async () => {
        // Special case: Character & Location Bible are extracted together
        if (activeStage === 'Character Bible' || activeStage === 'Location Bible') {
          await generateCharactersAndLocations();
        } else {
          await runStageHydration(activeStage);
        }
      },
      label: def.hydrationLabel,
    };
  }, [
    activeStage, currentProject, stageContents,
    generateCharactersAndLocations, runStageHydration
  ]);

  useEffect(() => {
    if (!currentProject) return;

    const config = getHydrationConfig();
    if (!config) return;

    const hydrationKey = `${currentProject.id}:${config.stage}`;

    if (activeHydrations.current.has(hydrationKey)) return;
    if (checkedStages.current.has(hydrationKey)) return;
    
    if (!config.isEmpty()) {
      checkedStages.current.add(hydrationKey);
      return;
    }

    activeHydrations.current.add(hydrationKey);
    setTimeout(() => {
      setHydrationState({
        isHydrating: true,
        hydratingStage: config.stage,
        hydratingLabel: config.label,
      });
    }, 0);

    addToast(config.label, 'info');

    config.generate()
      .then(async () => {
        addToast(`${config.stage} generated successfully`, 'success');
        checkedStages.current.add(hydrationKey);
        await onStageAnalyze(config.stage);
      })
      .catch((error) => {
        console.error(`Auto-hydration failed for ${config.stage}:`, error);
        addToast(`Failed to auto-generate ${config.stage}`, 'error');
        checkedStages.current.add(hydrationKey);
      })
      .finally(() => {
        activeHydrations.current.delete(hydrationKey);
        setHydrationState({
          isHydrating: false,
          hydratingStage: null,
          hydratingLabel: null,
        });
      });
  }, [activeStage, currentProject, getHydrationConfig, addToast, onStageAnalyze, stageContents]);

  useEffect(() => {
    checkedStages.current.clear();
    activeHydrations.current.clear();
  }, [currentProject?.id]);

  const resetHydration = useCallback((stage: WorkflowStage) => {
    if (!currentProject) return;
    const hydrationKey = `${currentProject.id}:${stage}`;
    checkedStages.current.delete(hydrationKey);
    activeHydrations.current.delete(hydrationKey);
  }, [currentProject]);

  return {
    ...hydrationState,
    resetHydration
  };
}
