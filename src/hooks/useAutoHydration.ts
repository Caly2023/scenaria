import { useEffect, useRef, useCallback, useState } from 'react';
import { WorkflowStage, Character, Location, Sequence, Project } from '../types';
import { 
  useGenerateLoglineDraftMutation,
  useGenerate3ActStructureMutation,
  useGenerateSynopsisMutation,
  useExtractCharactersAndSettingsMutation,
  useGenerateTreatmentMutation,
  useGenerateInitialSequencesMutation,
  useGenerateFullScriptMutation
} from '../services/geminiApi';
import {
  useUpdateProjectFieldMutation,
  useUpdateProjectMetadataMutation,
  useAddSubcollectionDocMutation
} from '../services/firebaseApi';
import { contextAssembler } from '../services/contextAssembler';

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
  characters: Character[];
  locations: Location[];
  sequences: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onStageAnalyze: (stage: WorkflowStage) => Promise<void>;
}

interface HydrationState {
  isHydrating: boolean;
  hydratingStage: WorkflowStage | null;
  hydratingLabel: string | null;
  resetHydration?: (stage: WorkflowStage) => void;
}

export function useAutoHydration({
  activeStage,
  currentProject,
  pitchPrimitives,
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

  // RTK Query Mutations
  const [generateLoglineDoc] = useGenerateLoglineDraftMutation();
  const [generateStructureDoc] = useGenerate3ActStructureMutation();
  const [generateSynopsisDoc] = useGenerateSynopsisMutation();
  const [extractChars] = useExtractCharactersAndSettingsMutation();
  const [generateTreatmentDoc] = useGenerateTreatmentMutation();
  const [generateSequencesDoc] = useGenerateInitialSequencesMutation();
  const [generateScriptDoc] = useGenerateFullScriptMutation();

  const [updateProjectField] = useUpdateProjectFieldMutation();
  const [updateProjectMetadata] = useUpdateProjectMetadataMutation();
  const [addSubcollectionDoc] = useAddSubcollectionDocMutation();

  const generateLogline = useCallback(async () => {
    if (!currentProject) return;
    const brainstormContent = currentProject.pitch_result || currentProject.brainstorming_story || '';
    if (!brainstormContent.trim()) return;

    const logline = await generateLoglineDoc(brainstormContent).unwrap();
    
    await Promise.all([
      updateProjectField({ id: currentProject.id, field: 'loglineDraft', content: logline }),
      updateProjectMetadata({ id: currentProject.id, metadata: { ...currentProject.metadata, logline } })
    ]);
  }, [currentProject, generateLoglineDoc, updateProjectField, updateProjectMetadata]);

  const generateStructure = useCallback(async () => {
    if (!currentProject) return;
    const brainstormContent = currentProject.pitch_result || currentProject.brainstorming_story || '';
    const logline = currentProject.loglineDraft || '';
    if (!brainstormContent.trim()) return;

    const structure = await generateStructureDoc({ brainstorming: brainstormContent, logline }).unwrap();
    await updateProjectField({ id: currentProject.id, field: 'structureDraft', content: structure });
  }, [currentProject, generateStructureDoc, updateProjectField]);

  const generateSynopsis = useCallback(async () => {
    if (!currentProject) return;
    const brainstormContent = currentProject.pitch_result || currentProject.brainstorming_story || '';
    const structure = currentProject.structureDraft || '';
    if (!brainstormContent.trim()) return;

    const synopsis = await generateSynopsisDoc({ brainstorming: brainstormContent, structure }).unwrap();
    await updateProjectField({ id: currentProject.id, field: 'synopsisDraft', content: synopsis });
  }, [currentProject, generateSynopsisDoc, updateProjectField]);

  const generateCharactersAndLocations = useCallback(async () => {
    if (!currentProject) return;
    const brainstormContent = currentProject.pitch_result || currentProject.brainstorming_story || '';
    if (!brainstormContent.trim()) return;

    const extraction = await extractChars(brainstormContent).unwrap();

    // Parallelize all character + location writes
    await Promise.all([
      ...extraction.characters.map((char: any) =>
        addSubcollectionDoc({
          projectId: currentProject.id,
          collectionName: 'characters',
          data: { name: char.name, role: char.role, description: char.description, tier: char.tier || 3, visualPrompt: char.visualPrompt }
        })
      ),
      ...extraction.settings.map((loc: any) =>
        addSubcollectionDoc({
          projectId: currentProject.id,
          collectionName: 'locations',
          data: { name: loc.location, description: `**Atmosphere:** ${loc.atmosphere}\n\n${loc.description}`, visualPrompt: loc.visualPrompt }
        })
      ),
    ]);
  }, [currentProject, extractChars, addSubcollectionDoc]);

  const generateTreatment = useCallback(async (retryCount = 0) => {
    if (!currentProject) return;

    let structureList = `1. "Act 1 — The World Before" (Setup, Hook, Inciting Incident)
2. "First Plot Point — The Threshold" (Crossing into the new world)
3. "Rising Action — Escalation" (Increasing stakes, pinch points)
4. "Midpoint — The Mirror" (Major revelation or reversal)
5. "Act 2B — The Descent" (Consequences, second pinch point)
6. "Third Plot Point — The Crisis" (All is lost moment)
7. "Climax — The Confrontation" (Final battle / resolution)
8. "Denouement — The New World" (Resolution, final image)`;

    if (currentProject.structureDraft) {
      try {
        let parsed = JSON.parse(currentProject.structureDraft);
        let blocks = parsed.blocks || (Array.isArray(parsed) ? parsed : null);
        if (blocks && blocks.length > 0) {
          structureList = blocks.map((b: any, i: number) => 
            `${i + 1}. "${b.title}"\n${b.content ? '   Context: ' + b.content.substring(0, 150) + '...' : ''}`
          ).join('\n');
        }
      } catch (e) {}
    }

    const payload = await contextAssembler.buildPromptPayload(currentProject.id, 'Treatment');
    const prompt = contextAssembler.formatPrompt(payload, `You are writing a CINEMATIC TREATMENT — a professional prose narrative document.

STRICT FORMAT REQUIREMENTS:
- Write in PRESENT TENSE throughout
- Use HIGH VISUAL DETAIL: describe camera movements, lighting, colors, atmospheric textures
- Write in the style of a professional film treatment (think Tony Gilroy or Aaron Sorkin)
- Focus on emotional beats, sensory immersion, and dramatic tension
- Describe character actions, expressions, and internal states cinematically

STRUCTURAL REQUIREMENTS — Based on the project's Structure Definition, split into these narrative sections as separate JSON objects:
${structureList}

Add additional sections if the story demands them (subplots, parallel timelines, etc.). Aim for matching the structure provided.

Each section should be 300-800 words of DENSE, CINEMATIC prose.

Output as a JSON array of objects with 'title', 'content' (markdown), and 'type' set to 'treatment_section'.`);
    
    const responseText = await generateTreatmentDoc(prompt).unwrap();
    let primitives;
    try {
      primitives = JSON.parse(responseText);
    } catch (e) {
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      primitives = JSON.parse(cleaned);
    }
    
    if (Array.isArray(primitives) && primitives.length >= 5) {
      // Parallelize all treatment section writes
      await Promise.all(
        primitives.map((p: any, i: number) =>
          addSubcollectionDoc({
            projectId: currentProject.id,
            collectionName: 'treatment_sequences',
            data: { ...p, order: i }
          })
        )
      );
    } else if (retryCount < 2) {
      await generateTreatment(retryCount + 1);
    } else {
      throw new Error('Failed to generate a structured treatment');
    }
  }, [currentProject, generateTreatmentDoc, addSubcollectionDoc]);

  const generateStepOutline = useCallback(async () => {
    if (!currentProject) return;
    
    const treatmentText = treatmentSequences.map(s => `[${s.title}]\n${s.content}`).join('\n\n');
    
    const initialSequences = await generateSequencesDoc({
      treatmentText, 
      format: currentProject.metadata?.format || 'Short Film',
      characters,
      locations
    }).unwrap();
    
    // Parallelize all step-outline sequence writes
    await Promise.all(
      initialSequences.map((seq: any, i: number) =>
        addSubcollectionDoc({
          projectId: currentProject.id,
          collectionName: 'sequences',
          data: { title: seq.title, content: seq.content, order: i, characterIds: seq.characterIds || [], locationIds: seq.locationIds || [] }
        })
      )
    );
  }, [currentProject, characters, locations, treatmentSequences, generateSequencesDoc, addSubcollectionDoc]);

  const generateScript = useCallback(async () => {
    if (!currentProject) return;
    
    const treatmentText = treatmentSequences.map(s => `[${s.title}]\n${s.content}`).join('\n\n');
    
    const responseText = await generateScriptDoc({
      structure: currentProject.structureDraft || '',
      synopsis: currentProject.synopsisDraft || '',
      treatmentText,
      characters
    }).unwrap();
    
    let primitives;
    try {
      primitives = JSON.parse(responseText);
    } catch (e) {
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      primitives = JSON.parse(cleaned);
    }
    
    if (Array.isArray(primitives)) {
      // Parallelize all script scene writes
      await Promise.all(
        primitives.map((p: any, i: number) =>
          addSubcollectionDoc({
            projectId: currentProject.id,
            collectionName: 'script_scenes',
            data: { ...p, order: i }
          })
        )
      );
    }
  }, [currentProject, characters, treatmentSequences, generateScriptDoc, addSubcollectionDoc]);

  const getHydrationConfig = useCallback((): StageHydrationConfig | null => {
    if (!currentProject) return null;

    const configs: Record<string, StageHydrationConfig> = {
      'Logline': {
        stage: 'Logline',
        isEmpty: () => !currentProject.loglineDraft?.trim(),
        generate: generateLogline,
        label: 'Generating Logline...',
      },
      '3-Act Structure': {
        stage: '3-Act Structure',
        isEmpty: () => !currentProject.structureDraft?.trim(),
        generate: generateStructure,
        label: 'Generating 3-Act Structure...',
      },
      'Synopsis': {
        stage: 'Synopsis',
        isEmpty: () => !currentProject.synopsisDraft?.trim(),
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
    };

    return configs[activeStage] || null;
  }, [
    activeStage, currentProject, characters, locations, 
    sequences, treatmentSequences, scriptScenes,
    generateLogline, generateStructure, generateSynopsis,
    generateCharactersAndLocations, generateTreatment,
    generateStepOutline, generateScript
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
    setHydrationState({
      isHydrating: true,
      hydratingStage: config.stage,
      hydratingLabel: config.label,
    });

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
  }, [activeStage, currentProject?.id, getHydrationConfig, addToast,
      characters.length, locations.length, sequences.length, 
      treatmentSequences.length, scriptScenes.length,
      currentProject?.loglineDraft, currentProject?.structureDraft, currentProject?.synopsisDraft
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
