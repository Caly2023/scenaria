import { useMemo } from 'react';
import { useGetSubcollectionQuery } from '../services/firebaseService';
import { stageRegistry } from '../config/stageRegistry';
import { RawCollections } from '../lib/stageContent';

interface GatedSubcollectionsProps {
  projectId: string | null;
  activeStageOrder: number;
}

/**
 * Custom hook to handle all stage-gated subcollection fetches.
 * RTK Query deduplicates and caches these automatically.
 */
export function useStageGatedSubcollections({ projectId, activeStageOrder }: GatedSubcollectionsProps): { data: RawCollections; isLoading: boolean } {
  const skip = !projectId;

  // Project Brief is always fetched when a project is loaded —
  // it's the lightweight metadata collection and the first stage.
  const briefResult     = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Project Brief'),   orderByField: 'order' }, { skip });
  const bibleResult     = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Story Bible')                            }, { skip: skip || activeStageOrder < stageRegistry.get('Story Bible').order });
  const treatmentResult = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Treatment'),       orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Treatment').order });
  const sequencerResult = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Sequencer'),       orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Sequencer').order });
  const continuityResult = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Dialogue Continuity'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Dialogue Continuity').order });
  const scriptResult    = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Final Screenplay'),   orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Final Screenplay').order });
  const breakdownResult = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Technical Breakdown'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Technical Breakdown').order });

  const isLoading = 
    briefResult.isLoading || 
    bibleResult.isLoading || treatmentResult.isLoading || sequencerResult.isLoading || 
    continuityResult.isLoading || scriptResult.isLoading || breakdownResult.isLoading;

  const data = useMemo<RawCollections>(() => ({
    [stageRegistry.getCollectionName('Project Brief')]:       briefResult.data || [],
    [stageRegistry.getCollectionName('Story Bible')]:         bibleResult.data || [],
    [stageRegistry.getCollectionName('Treatment')]:           treatmentResult.data || [],
    [stageRegistry.getCollectionName('Sequencer')]:           sequencerResult.data || [],
    [stageRegistry.getCollectionName('Dialogue Continuity')]: continuityResult.data || [],
    [stageRegistry.getCollectionName('Final Screenplay')]:    scriptResult.data || [],
    [stageRegistry.getCollectionName('Technical Breakdown')]: breakdownResult.data || [],
  }), [
    briefResult.data, bibleResult.data,
    treatmentResult.data, sequencerResult.data, continuityResult.data,
    scriptResult.data, breakdownResult.data
  ]);

  return { data, isLoading };
}
