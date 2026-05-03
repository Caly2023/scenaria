import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Project, 
  WorkflowStage, 
} from '../types';
import { 
  useAddSubcollectionDocMutation,
  useUpdateSubcollectionDocMutation,
  useDeleteSubcollectionDocMutation
} from '../services/firebaseService';
import { classifyError } from '../lib/errorClassifier';
import { stageRegistry } from '../config/stageRegistry';
import { ContentPrimitive } from '../types/stageContract';


interface UseAppCallbacksProps {
  currentProject: Project | null;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  handleSubcollectionUpdate: (collName: string, id: string, data: Record<string, any>) => void;
  handleContentUpdate: (field: string, content: string) => void;
  handleStageValidate: (stage: WorkflowStage) => Promise<void>;
  stageContents: Record<string, ContentPrimitive[]>;
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
      const discoveryPrimitives = stageContents['Discovery'] || [];
      const discoveryId = discoveryPrimitives[0]?.id;
      const collectionName = stageRegistry.getCollectionName('Discovery');
      if (discoveryId) handleSubcollectionUpdate(collectionName, discoveryId, { content: c });
      handleContentUpdate("discovery_result", c);
    },
    [stageContents, handleSubcollectionUpdate, handleContentUpdate],
  );

  const onLoglineChange = useCallback(
    (c: string) => {
      const briefPrimitives = stageContents['Project Brief'] || [];
      const id = briefPrimitives.find(p => p.primitiveType === 'logline')?.id;
      const collectionName = stageRegistry.getCollectionName('Project Brief');
      if (id) {
        handleSubcollectionUpdate(collectionName, id, { content: c });
      }
    },
    [stageContents, handleSubcollectionUpdate],
  );

  /**
   * Generic stage validator.
   */
  const onValidateStage = useCallback(
    (stage: WorkflowStage) => handleStageValidate(stage),
    [handleStageValidate],
  );

  const handlePrimitiveAdd = useCallback(
    async (stage: WorkflowStage, data: any) => {
      if (!currentProject) return;
      try {
        const collectionName = stageRegistry.getCollectionName(stage);
        await addSubcollectionDoc({
          projectId: currentProject.id,
          collectionName,
          data,
        }).unwrap();
        addToast(t("common.addedSuccessfully", { stage }), "success");
      } catch (e) {
        const classified = classifyError(e);
        addToast(classified.userMessage, "error");
      }
    },
    [currentProject, addSubcollectionDoc, addToast, t],
  );

  const handlePrimitiveUpdate = useCallback(
    async (stage: WorkflowStage, id: string, updates: any) => {
      if (!currentProject) return;
      try {
        const collectionName = stageRegistry.getCollectionName(stage);
        // If it's a simple content update, use the debounced sync
        if (Object.keys(updates).length === 1 && updates.content !== undefined) {
          handleSubcollectionUpdate(collectionName, id, updates);
        } else {
          await updateSubcollectionDoc({
            projectId: currentProject.id,
            collectionName,
            docId: id,
            data: updates,
          }).unwrap();
        }
      } catch (e) {
        const classified = classifyError(e);
        addToast(classified.userMessage, "error");
      }
    },
    [currentProject, updateSubcollectionDoc, handleSubcollectionUpdate, addToast],
  );

  const handlePrimitiveDelete = useCallback(
    async (stage: WorkflowStage, id: string) => {
      if (!currentProject) return;
      try {
        const collectionName = stageRegistry.getCollectionName(stage);
        await deleteSubcollectionDoc({
          projectId: currentProject.id,
          collectionName,
          docId: id,
        }).unwrap();
        addToast(t("common.deletedSuccessfully", { stage }), "info");
      } catch (e) {
        const classified = classifyError(e);
        addToast(classified.userMessage, "error");
      }
    },
    [currentProject, deleteSubcollectionDoc, addToast, t],
  );

  return {
    handleStoryChange,
    onLoglineChange,
    handlePrimitiveAdd,
    handlePrimitiveUpdate,
    handlePrimitiveDelete,
    onValidateStage,
  };
}
