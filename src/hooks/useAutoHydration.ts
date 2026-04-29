import { useEffect, useRef, useCallback, useState } from 'react';
import { WorkflowStage, Character, Location, Sequence, Project, HydrationState } from '../types';
import { interpretIntent, buildProjectContext, dispatchToAgent, persistAgentOutput } from '../services/orchestratorService';
import { buildStageContentsMap } from '../lib/stageContent';

interface StageHydrationConfig {
  stage: WorkflowStage;
  isEmpty: () => boolean;
  generate: () => Promise<void>;
  label: string;
}

interface UseAutoHydrationProps {
  activeStage: WorkflowStage;
  currentProject: Project | null;
  pitchPrimitives: Sequence[];
  loglinePrimitives: Sequence[];
  structurePrimitives: Sequence[];
  synopsisPrimitives: Sequence[];
  doctoringPrimitives: Sequence[];
  breakdownPrimitives: Sequence[];
  assetPrimitives: Sequence[];
  previsPrimitives: Sequence[];
  exportPrimitives: Sequence[];
  characters: Character[];
  locations: Location[];
  sequences: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onStageAnalyze: (stage: WorkflowStage) => Promise<void>;
}

export function useAutoHydration({
  activeStage,
  currentProject,
  pitchPrimitives,
  loglinePrimitives,
  structurePrimitives,
  synopsisPrimitives,
  characters,
  locations,
  sequences,
  treatmentSequences,
  scriptScenes,
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
      buildStageContentsMap({
        pitchPrimitives,
        loglinePrimitives,
        structurePrimitives,
        synopsisPrimitives,
        doctoringPrimitives,
        breakdownPrimitives,
        assetPrimitives,
        previsPrimitives,
        exportPrimitives,
        characters,
        locations,
        treatmentSequences,
        sequences,
        scriptScenes,
      }),
      currentProject.stageAnalyses || {}
    );
  }, [
    currentProject,
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives,
    doctoringPrimitives,
    breakdownPrimitives,
    assetPrimitives,
    previsPrimitives,
    exportPrimitives,
    characters,
    locations,
    treatmentSequences,
    sequences,
    scriptScenes,
  ]);

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

  const generateLogline = useCallback(async () => runStageHydration('Logline'), [runStageHydration]);
  const generateStructure = useCallback(async () => runStageHydration('3-Act Structure'), [runStageHydration]);
  const generate8Beat = useCallback(async () => runStageHydration('8-Beat Structure'), [runStageHydration]);
  const generateSynopsis = useCallback(async () => runStageHydration('Synopsis'), [runStageHydration]);
  const generateCharactersAndLocations = useCallback(async () => {
    await Promise.all([
      runStageHydration('Character Bible'),
      runStageHydration('Location Bible')
    ]);
  }, [runStageHydration]);
  const generateTreatment = useCallback(async () => runStageHydration('Treatment'), [runStageHydration]);
  const generateStepOutline = useCallback(async () => runStageHydration('Step Outline'), [runStageHydration]);
  const generateScript = useCallback(async () => runStageHydration('Script'), [runStageHydration]);
  const generateDoctoring = useCallback(async () => runStageHydration('Global Script Doctoring'), [runStageHydration]);
  const generateBreakdown = useCallback(async () => runStageHydration('Technical Breakdown'), [runStageHydration]);
  const generateAssets = useCallback(async () => runStageHydration('Visual Assets'), [runStageHydration]);
  const generatePrevis = useCallback(async () => runStageHydration('AI Previs'), [runStageHydration]);
  const generateExport = useCallback(async () => runStageHydration('Production Export'), [runStageHydration]);

  const getHydrationConfig = useCallback((): StageHydrationConfig | null => {
    if (!currentProject) return null;

    const configs: Record<string, StageHydrationConfig> = {
      'Logline': {
        stage: 'Logline',
        isEmpty: () => loglinePrimitives.length === 0,
        generate: generateLogline,
        label: 'Generating Logline...',
      },
      '3-Act Structure': {
        stage: '3-Act Structure',
        isEmpty: () => structurePrimitives.length === 0,
        generate: generateStructure,
        label: 'Generating 3-Act Structure...',
      },
      '8-Beat Structure': {
        stage: '8-Beat Structure',
        isEmpty: () => beatPrimitives.length === 0,
        generate: generate8Beat,
        label: 'Generating 8-Beat Structure...',
      },
      'Synopsis': {
        stage: 'Synopsis',
        isEmpty: () => synopsisPrimitives.length === 0,
        generate: generateSynopsis,
        label: 'Generating Synopsis...',
      },
      'Character Bible': {
        stage: 'Character Bible',
        isEmpty: () => characters.length === 0,
        generate: generateCharactersAndLocations,
        label: 'Extracting Characters & Locations...',
      },
      'Location Bible': {
        stage: 'Location Bible',
        isEmpty: () => locations.length === 0,
        generate: generateCharactersAndLocations,
        label: 'Extracting Characters & Locations...',
      },
      'Treatment': {
        stage: 'Treatment',
        isEmpty: () => treatmentSequences.length === 0,
        generate: generateTreatment,
        label: 'Generating Cinematic Treatment...',
      },
      'Step Outline': {
        stage: 'Step Outline',
        isEmpty: () => sequences.length === 0,
        generate: generateStepOutline,
        label: 'Generating Step Outline...',
      },
      'Script': {
        stage: 'Script',
        isEmpty: () => scriptScenes.length === 0,
        generate: generateScript,
        label: 'Generating Full Script (Pro)...',
      },
      'Global Script Doctoring': {
        stage: 'Global Script Doctoring',
        isEmpty: () => doctoringPrimitives.length === 0,
        generate: generateDoctoring,
        label: 'Running Global Script Doctoring...',
      },
      'Technical Breakdown': {
        stage: 'Technical Breakdown',
        isEmpty: () => breakdownPrimitives.length === 0,
        generate: generateBreakdown,
        label: 'Generating Technical Breakdown...',
      },
      'Visual Assets': {
        stage: 'Visual Assets',
        isEmpty: () => assetPrimitives.length === 0,
        generate: generateAssets,
        label: 'Generating Visual Assets...',
      },
      'AI Previs': {
        stage: 'AI Previs',
        isEmpty: () => previsPrimitives.length === 0,
        generate: generatePrevis,
        label: 'Generating AI Previs...',
      },
      'Production Export': {
        stage: 'Production Export',
        isEmpty: () => exportPrimitives.length === 0,
        generate: generateExport,
        label: 'Preparing Production Export...',
      },
    };

    return configs[activeStage] || null;
  }, [
    activeStage, currentProject, characters, locations, 
    sequences, treatmentSequences, scriptScenes,
    loglinePrimitives, structurePrimitives, beatPrimitives, synopsisPrimitives, 
    doctoringPrimitives, breakdownPrimitives, assetPrimitives, previsPrimitives, exportPrimitives,
    generateLogline, generateStructure, generate8Beat, generateSynopsis,
    generateCharactersAndLocations, generateTreatment,
    generateStepOutline, generateScript, generateDoctoring, 
    generateBreakdown, generateAssets, generatePrevis, generateExport
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
  }, [activeStage, currentProject, getHydrationConfig, addToast, onStageAnalyze,
      characters.length, locations.length, sequences.length, 
      treatmentSequences.length, scriptScenes.length
  ]);

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
