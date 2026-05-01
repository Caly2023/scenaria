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
 * We must call all hooks at the top level to follow the Rules of Hooks.
 */
export function useStageGatedSubcollections({ projectId, activeStageOrder }: GatedSubcollectionsProps): { data: RawCollections; isLoading: boolean } {
  const skip = !projectId;

  const pitchResult     = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Brainstorming'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Brainstorming').order });
  const draftResult     = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Initial Draft'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Initial Draft').order });
  const loglineResult   = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Logline'),           orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Logline').order });
  const structureResult = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('3-Act Structure'),   orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('3-Act Structure').order });
  const beatResult      = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('8-Beat Structure'),   orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('8-Beat Structure').order });
  const synopsisResult  = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Synopsis'),          orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Synopsis').order });
  const charactersResult = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Character Bible')                                }, { skip: skip || activeStageOrder < stageRegistry.get('Character Bible').order });
  const locationsResult  = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Location Bible')                                 }, { skip: skip || activeStageOrder < stageRegistry.get('Location Bible').order });
  const treatmentResult  = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Treatment'),       orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Treatment').order });
  const sequencesResult  = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Step Outline'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Step Outline').order });
  const scriptResult     = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Script'),           orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Script').order });
  const doctoringResult  = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Global Script Doctoring'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Global Script Doctoring').order });
  const breakdownResult  = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Technical Breakdown'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Technical Breakdown').order });
  const assetResult      = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Visual Assets'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Visual Assets').order });
  const previsResult     = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('AI Previs'),        orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('AI Previs').order });
  const exportResult     = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Production Export'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Production Export').order });

  const isLoading = 
    pitchResult.isLoading || draftResult.isLoading || loglineResult.isLoading || 
    structureResult.isLoading || beatResult.isLoading || synopsisResult.isLoading || 
    charactersResult.isLoading || locationsResult.isLoading || treatmentResult.isLoading || 
    sequencesResult.isLoading || scriptResult.isLoading || doctoringResult.isLoading || 
    breakdownResult.isLoading || assetResult.isLoading || previsResult.isLoading || 
    exportResult.isLoading;

  const data = useMemo<RawCollections>(() => ({
    [stageRegistry.getCollectionName('Brainstorming')]:           pitchResult.data || [],
    [stageRegistry.getCollectionName('Initial Draft')]:           draftResult.data || [],
    [stageRegistry.getCollectionName('Logline')]:                 loglineResult.data || [],
    [stageRegistry.getCollectionName('3-Act Structure')]:         structureResult.data || [],
    [stageRegistry.getCollectionName('8-Beat Structure')]:         beatResult.data || [],
    [stageRegistry.getCollectionName('Synopsis')]:                synopsisResult.data || [],
    [stageRegistry.getCollectionName('Character Bible')]:         charactersResult.data || [],
    [stageRegistry.getCollectionName('Location Bible')]:          locationsResult.data || [],
    [stageRegistry.getCollectionName('Treatment')]:               treatmentResult.data || [],
    [stageRegistry.getCollectionName('Step Outline')]:            sequencesResult.data || [],
    [stageRegistry.getCollectionName('Script')]:                  scriptResult.data || [],
    [stageRegistry.getCollectionName('Global Script Doctoring')]: doctoringResult.data || [],
    [stageRegistry.getCollectionName('Technical Breakdown')]:     breakdownResult.data || [],
    [stageRegistry.getCollectionName('Visual Assets')]:           assetResult.data || [],
    [stageRegistry.getCollectionName('AI Previs')]:               previsResult.data || [],
    [stageRegistry.getCollectionName('Production Export')]:       exportResult.data || [],
  }), [
    pitchResult.data, draftResult.data, loglineResult.data, structureResult.data,
    beatResult.data, synopsisResult.data, charactersResult.data, locationsResult.data,
    treatmentResult.data, sequencesResult.data, scriptResult.data,
    doctoringResult.data, breakdownResult.data, assetResult.data,
    previsResult.data, exportResult.data,
  ]);

  return { data, isLoading };
}
