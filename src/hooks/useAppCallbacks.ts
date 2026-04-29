import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Project, 
  WorkflowStage, 
  Sequence,
  Character,
  Location,
} from '../types';
import { 
  useAddSubcollectionDocMutation,
  useUpdateSubcollectionDocMutation,
  useDeleteSubcollectionDocMutation
} from '../services/firebaseApi';
import { classifyError } from '../lib/errorClassifier';

type BrainstormPrimitive = Sequence & { primitiveType?: string };
type CharacterCreateTier = Character['tier'];
type CharacterUpdates = Partial<Character>;
type LocationUpdates = Partial<Location>;

interface UseAppCallbacksProps {
  currentProject: Project | null;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  handleSubcollectionUpdate: (collName: string, id: string, content: string) => void;
  handleContentUpdate: (field: string, content: string) => void;
  handleStageValidate: (stage: WorkflowStage) => Promise<void>;
  stageContents: Record<string, import('../types/stageContract').ContentPrimitive[]>;
}

export function useAppCallbacks({
  currentProject,
  addToast,
  handleSubcollectionUpdate,
  handleContentUpdate,
  handleStageValidate,
  stageContents,
}: UseAppCallbacksProps) {
  const { t } = useTranslation();
  
  const [addSubcollectionDoc] = useAddSubcollectionDocMutation();
  const [updateSubcollectionDoc] = useUpdateSubcollectionDocMutation();
  const [deleteSubcollectionDoc] = useDeleteSubcollectionDocMutation();

  const handleStoryChange = useCallback(
    (c: string) => {
      const pitchPrimitives = stageContents['Brainstorming'] || [];
      const pitchId = pitchPrimitives.find((p) => p.primitiveType === 'brainstorming_result')?.id
        || pitchPrimitives.find((p) => p.primitiveType === 'pitch_result')?.id // backward compat
        || pitchPrimitives.find((p) => /pitch|story|input/i.test(p.title || ''))?.id
        || pitchPrimitives.find((p) => p.order === 1)?.id;
      if (pitchId) handleSubcollectionUpdate("pitch_primitives", pitchId, c);
      handleContentUpdate("brainstorming_result", c);
    },
    [stageContents, handleSubcollectionUpdate, handleContentUpdate],
  );

  const onLoglineChange = useCallback(
    (c: string) => {
      const loglinePrimitives = stageContents['Logline'] || [];
      const id = loglinePrimitives[0]?.id;
      if (id) {
        handleSubcollectionUpdate("logline_primitives", id, c);
      }
    },
    [stageContents, handleSubcollectionUpdate],
  );

  const onValidateProjectMetadata = useCallback(
    () => handleStageValidate("Project Metadata"),
    [handleStageValidate],
  );
  const onValidateInitialDraft = useCallback(
    () => handleStageValidate("Initial Draft"),
    [handleStageValidate],
  );
  const onValidateBrainstorming = useCallback(
    () => handleStageValidate("Brainstorming"),
    [handleStageValidate],
  );
  const onValidateLogline = useCallback(
    () => handleStageValidate("Logline"),
    [handleStageValidate],
  );
  const onValidate3Act = useCallback(
    () => handleStageValidate("3-Act Structure"),
    [handleStageValidate],
  );
  const onValidate8Beat = useCallback(
    () => handleStageValidate("8-Beat Structure"),
    [handleStageValidate],
  );
  const onValidateSynopsis = useCallback(
    () => handleStageValidate("Synopsis"),
    [handleStageValidate],
  );
  const onValidateCharacterBible = useCallback(
    () => handleStageValidate("Character Bible"),
    [handleStageValidate],
  );
  const onValidateLocationBible = useCallback(
    () => handleStageValidate("Location Bible"),
    [handleStageValidate],
  );
  const onValidateTreatment = useCallback(
    () => handleStageValidate("Treatment"),
    [handleStageValidate],
  );
  const onValidateStepOutline = useCallback(
    () => handleStageValidate("Step Outline"),
    [handleStageValidate],
  );
  const onValidateScript = useCallback(
    () => handleStageValidate("Script"),
    [handleStageValidate],
  );
  const onValidateGlobalDoctoring = useCallback(
    () => handleStageValidate("Global Script Doctoring"),
    [handleStageValidate],
  );
  const onValidateTechnicalBreakdown = useCallback(
    () => handleStageValidate("Technical Breakdown"),
    [handleStageValidate],
  );
  const onValidateVisualAssets = useCallback(
    () => handleStageValidate("Visual Assets"),
    [handleStageValidate],
  );
  const onValidateAiPrevis = useCallback(
    () => handleStageValidate("AI Previs"),
    [handleStageValidate],
  );
  const onValidateProductionExport = useCallback(
    () => handleStageValidate("Production Export"),
    [handleStageValidate],
  );

  const handleCharacterAdd = useCallback(
    async (name: string, description: string, tier: CharacterCreateTier) => {
      if (!currentProject) return;
      try {
        await addSubcollectionDoc({
          projectId: currentProject.id,
          collectionName: "characters",
          data: { name, description, tier },
        }).unwrap();
        addToast(t("common.characterAdded"), "success");
      } catch (e) {
        const classified = classifyError(e);
        addToast(classified.userMessage, "error");
      }
    },
    [currentProject, addSubcollectionDoc, addToast, t],
  );

  const handleCharacterUpdate = useCallback(
    async (id: string, updates: CharacterUpdates) => {
      if (!currentProject) return;
      try {
        await updateSubcollectionDoc({
          projectId: currentProject.id,
          collectionName: "characters",
          docId: id,
          data: updates,
        }).unwrap();
      } catch (e) {
        const classified = classifyError(e);
        addToast(classified.userMessage, "error");
      }
    },
    [currentProject, updateSubcollectionDoc, addToast],
  );

  const handleCharacterDelete = useCallback(
    async (id: string) => {
      if (!currentProject) return;
      await deleteSubcollectionDoc({
        projectId: currentProject.id,
        collectionName: "characters",
        docId: id,
      }).unwrap();
      addToast(t("common.characterDeleted"), "info");
    },
    [currentProject, deleteSubcollectionDoc, addToast, t],
  );

  const handleLocationAdd = useCallback(
    async (name: string, description: string) => {
      if (!currentProject) return;
      try {
        await addSubcollectionDoc({
          projectId: currentProject.id,
          collectionName: "locations",
          data: { name, description },
        }).unwrap();
        addToast(t("common.locationAdded"), "success");
      } catch (e) {
        const classified = classifyError(e);
        addToast(classified.userMessage, "error");
      }
    },
    [currentProject, addSubcollectionDoc, addToast, t],
  );

  const handleLocationUpdate = useCallback(
    async (id: string, updates: LocationUpdates) => {
      if (!currentProject) return;
      try {
        await updateSubcollectionDoc({
          projectId: currentProject.id,
          collectionName: "locations",
          docId: id,
          data: updates,
        }).unwrap();
      } catch (e) {
        const classified = classifyError(e);
        addToast(classified.userMessage, "error");
      }
    },
    [currentProject, updateSubcollectionDoc, addToast],
  );

  const handleLocationDelete = useCallback(
    async (id: string) => {
      if (!currentProject) return;
      await deleteSubcollectionDoc({
        projectId: currentProject.id,
        collectionName: "locations",
        docId: id,
      }).unwrap();
      addToast(t("common.locationDeleted"), "info");
    },
    [currentProject, deleteSubcollectionDoc, addToast, t],
  );

  return {
    handleStoryChange,
    onLoglineChange,
    handleCharacterAdd,
    handleCharacterUpdate,
    handleCharacterDelete,
    handleLocationAdd,
    handleLocationUpdate,
    handleLocationDelete,
    onValidateProjectMetadata,
    onValidateInitialDraft,
    onValidateBrainstorming,
    onLoglineChange,
    onValidateLogline,
    onValidate3Act,
    onValidate8Beat,
    onValidateSynopsis,
    onValidateCharacterBible,
    onValidateLocationBible,
    onValidateTreatment,
    onValidateStepOutline,
    onValidateScript,
    onValidateGlobalDoctoring,
    onValidateTechnicalBreakdown,
    onValidateVisualAssets,
    onValidateAiPrevis,
    onValidateProductionExport,
  };
}
