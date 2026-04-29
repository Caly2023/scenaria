import { useState, useCallback } from 'react';
import { Project } from '../types';
import { useUpdateProjectFieldMutation, useUpdateSubcollectionDocMutation } from '../services/firebaseApi';

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

  const handleContentUpdate = async (field: string, content: string) => {
    if (!currentProject) return;
    setSyncStatus('syncing');
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await updateField({ id: currentProject.id, field, content }).unwrap();
        setSyncStatus('synced');
        if (onSyncSuccess) onSyncSuccess(field, '');
        return;
      } catch (_error) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    setSyncStatus('error');
    addToast('Failed to sync changes', 'error', { label: 'Retry', onClick: () => handleContentUpdate(field, content) });
  };

  const syncSubcollectionToDb = async (collName: string, id: string, data: Record<string, unknown>) => {
    if (!currentProject) return;
    setSyncStatus('syncing');
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await updateSubcol({ projectId: currentProject.id, collectionName: collName, docId: id, data, orderByField: 'order' }).unwrap();
        setSyncStatus('synced');
        if (onSyncSuccess) onSyncSuccess(collName, id);
        return;
      } catch (_error) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    setSyncStatus('error');
    addToast('Failed to sync changes', 'error', { label: 'Retry', onClick: () => syncSubcollectionToDb(collName, id, data) });
  };

  const [debouncedSync] = useState(() => {
    let timeout: NodeJS.Timeout;
    return (collName: string, id: string, data: Record<string, unknown>) => {
      setSyncStatus('syncing');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        syncSubcollectionToDb(collName, id, data);
      }, 500);
    };
  });

  const handleSubcollectionUpdate = useCallback((collName: string, id: string, dataOrContent: string | Record<string, unknown>) => {
    const data = typeof dataOrContent === 'string' ? { content: dataOrContent } : dataOrContent;
    debouncedSync(collName, id, data);
  }, [debouncedSync]);

  return { syncStatus, setSyncStatus, handleContentUpdate, handleSubcollectionUpdate };
}
