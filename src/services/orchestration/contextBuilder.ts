import { ProjectContext, ContentPrimitive, StageAnalysis } from '../../types/stageContract';

export function buildProjectContext(
  projectId: string,
  metadata: any,
  stageContentsMap: Record<string, ContentPrimitive[]>,
  stageAnalysesMap: Record<string, StageAnalysis>
): ProjectContext {
  return {
    projectId,
    metadata: {
      title: typeof metadata?.title === 'string' ? metadata.title : 'Untitled',
      genre: typeof metadata?.genre === 'string' ? metadata.genre : '',
      format: typeof metadata?.format === 'string' ? metadata.format : 'Short Film',
      tone: typeof metadata?.tone === 'string' ? metadata.tone : '',
      languages: Array.isArray(metadata?.languages) ? (metadata.languages as string[]) : [],
      logline: typeof metadata?.logline === 'string' ? metadata.logline : '',
      targetDuration: typeof metadata?.targetDuration === 'string' ? metadata.targetDuration : undefined,
    },
    stageContents: stageContentsMap,
    stageAnalyses: stageAnalysesMap,
  };
}
