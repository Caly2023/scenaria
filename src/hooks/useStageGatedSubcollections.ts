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
export function useStageGatedSubcollections({ projectId, activeStageOrder }: GatedSubcollectionsProps): RawCollections {
  const skip = !projectId;

  const { data: pitchPrimitives     = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Brainstorming'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Brainstorming').order });
  const { data: draftPrimitives     = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Initial Draft'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Initial Draft').order });
  const { data: loglinePrimitives   = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Logline'),           orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Logline').order });
  const { data: structurePrimitives = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('3-Act Structure'),   orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('3-Act Structure').order });
  const { data: beatPrimitives      = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('8-Beat Structure'),   orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('8-Beat Structure').order });
  const { data: synopsisPrimitives  = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Synopsis'),          orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Synopsis').order });
  const { data: characters          = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Character Bible')                                }, { skip: skip || activeStageOrder < stageRegistry.get('Character Bible').order });
  const { data: locations           = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Location Bible')                                 }, { skip: skip || activeStageOrder < stageRegistry.get('Location Bible').order });
  const { data: treatmentSequences  = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Treatment'),       orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Treatment').order });
  const { data: sequences           = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Step Outline'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Step Outline').order });
  const { data: scriptScenes        = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Script'),           orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Script').order });
  const { data: doctoringPrimitives = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Global Script Doctoring'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Global Script Doctoring').order });
  const { data: breakdownPrimitives = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Technical Breakdown'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Technical Breakdown').order });
  const { data: assetPrimitives     = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Visual Assets'),     orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Visual Assets').order });
  const { data: previsPrimitives    = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('AI Previs'),        orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('AI Previs').order });
  const { data: exportPrimitives    = [] } = useGetSubcollectionQuery({ projectId: projectId || '', collectionName: stageRegistry.getCollectionName('Production Export'), orderByField: 'order' }, { skip: skip || activeStageOrder < stageRegistry.get('Production Export').order });

  return useMemo<RawCollections>(() => ({
    [stageRegistry.getCollectionName('Brainstorming')]:           pitchPrimitives,
    [stageRegistry.getCollectionName('Initial Draft')]:           draftPrimitives,
    [stageRegistry.getCollectionName('Logline')]:                 loglinePrimitives,
    [stageRegistry.getCollectionName('3-Act Structure')]:         structurePrimitives,
    [stageRegistry.getCollectionName('8-Beat Structure')]:         beatPrimitives,
    [stageRegistry.getCollectionName('Synopsis')]:                synopsisPrimitives,
    [stageRegistry.getCollectionName('Character Bible')]:         characters,
    [stageRegistry.getCollectionName('Location Bible')]:          locations,
    [stageRegistry.getCollectionName('Treatment')]:               treatmentSequences,
    [stageRegistry.getCollectionName('Step Outline')]:            sequences,
    [stageRegistry.getCollectionName('Script')]:                  scriptScenes,
    [stageRegistry.getCollectionName('Global Script Doctoring')]: doctoringPrimitives,
    [stageRegistry.getCollectionName('Technical Breakdown')]:     breakdownPrimitives,
    [stageRegistry.getCollectionName('Visual Assets')]:           assetPrimitives,
    [stageRegistry.getCollectionName('AI Previs')]:               previsPrimitives,
    [stageRegistry.getCollectionName('Production Export')]:       exportPrimitives,
  }), [
    pitchPrimitives, draftPrimitives, loglinePrimitives, structurePrimitives,
    beatPrimitives, synopsisPrimitives, characters, locations,
    treatmentSequences, sequences, scriptScenes,
    doctoringPrimitives, breakdownPrimitives, assetPrimitives,
    previsPrimitives, exportPrimitives,
  ]);
}
