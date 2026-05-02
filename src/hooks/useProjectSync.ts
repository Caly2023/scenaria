import React, { useState, useCallback, useRef } from 'react';
import { Project } from '../types';
import { useUpdateProjectFieldMutation, useUpdateSubcollectionDocMutation } from '../services/firebaseService';
import { classifyError } from '../lib/errorClassifier';
import { stageRegistry } from '../config/stageRegistry';
import { mapPrimitiveToDb } from '../utils/primitiveUtils';

type ToastAction = {
  label: string;
  onClick: () => void;
};

export function useProjectSync(
  currentProject: Project | null,
  addToast: (msg: string, type: 'error' | 'info' | 'success', action?: ToastAction) => void,
  onSyncSuccess?: (collName: string, id: string) => void
) {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [updateField] = useUpdateProjectFieldMutation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();

  const MAX_RETRIES = 3;

  const handleContentUpdate = useCallback(async function update(field: string, content: string) {
    if (!currentProject) return;
    setSyncStatus('syncing');
    
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await updateField({ id: currentProject.id, field, content }).unwrap();
        setSyncStatus('synced');
        if (onSyncSuccess) onSyncSuccess(field, '');
        return;
      } catch (_error) {
        lastError = _error;
        if (attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    setSyncStatus('error');
    const classification = classifyError(lastError);
    addToast(classification.userMessage, 'error', { label: 'Retry', onClick: () => update(field, content) });
  }, [currentProject, updateField, onSyncSuccess, addToast]);

  const syncSubcollectionToDb = useCallback(async function sync(collName: string, id: string, data: Record<string, unknown>) {
    if (!currentProject) return;
    setSyncStatus('syncing');
    
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await updateSubcol({ projectId: currentProject.id, collectionName: collName, docId: id, data, orderByField: 'order' }).unwrap();
        setSyncStatus('synced');
        if (onSyncSuccess) onSyncSuccess(collName, id);
        return;
      } catch (_error) {
        lastError = _error;
        if (attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    setSyncStatus('error');
    const classification = classifyError(lastError);
    addToast(classification.userMessage, 'error', { label: 'Retry', onClick: () => sync(collName, id, data) });
  }, [currentProject, updateSubcol, onSyncSuccess, addToast]);

  const syncRef = React.useRef(syncSubcollectionToDb);
  syncRef.current = syncSubcollectionToDb;

  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const debouncedSync = useCallback((collName: string, id: string, data: Record<string, unknown>) => {
    setSyncStatus('syncing');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      syncRef.current(collName, id, data);
    }, 500);
  }, []);

  const handleSubcollectionUpdate = useCallback((collName: string, id: string, dataOrContent: string | Record<string, any>) => {
    let data = typeof dataOrContent === 'string' ? { content: dataOrContent } : dataOrContent;
    
    // Apply mapping for bible stages (Character/Location)
    const stage = stageRegistry.getByCollection(collName);
    if (stage) {
      data = mapPrimitiveToDb(stage.id, data);
    }
    
    debouncedSync(collName, id, data);
  }, [debouncedSync]);

  return { syncStatus, setSyncStatus, handleContentUpdate, handleSubcollectionUpdate };
}
