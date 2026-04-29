import { Project, WorkflowStage, Sequence, StageInsight } from '../types';
import { StageAnalysis, ContentPrimitive } from '../types/stageContract';

type BrainstormPrimitive = Sequence & { primitiveType?: string };
type PrimitiveWithAnalysisMeta = Sequence & {
  primitiveType?: string;
  isReady?: boolean;
  suggestions?: string[];
  updatedAt?: number;
};

export function getBrainstormStory(primitives: Sequence[]): string {
  const typedPrimitives = primitives as BrainstormPrimitive[];
  // Skip analysis primitive (order 0) for the story content
  return typedPrimitives.find((p) => p.primitiveType === 'brainstorming_result')?.content
    // Backward compatibility for older projects
    || typedPrimitives.find((p) => p.primitiveType === 'pitch_result')?.content
    || primitives.find((p) => /pitch|story|input/i.test(p.title || '') && p.order !== 0)?.content
    || primitives.find((p) => p.order === 1)?.content
    || primitives.find((p) => p.order !== 0)?.content
    || "";
}

export function getStageInsight(
  stage: WorkflowStage,
  project: Project,
  primitives: Sequence[]
): StageInsight | StageAnalysis | undefined {
  const typed = primitives as PrimitiveWithAnalysisMeta[];
  const analysisPrim = typed.find((p) => p.order === 0 || p.primitiveType === 'analysis');
  if (analysisPrim) {
    return {
      content: analysisPrim.content,
      isReady: analysisPrim.isReady ?? project.stageAnalyses?.[stage]?.isReady,
      suggestions: analysisPrim.suggestions || project.stageAnalyses?.[stage]?.suggestions,
      updatedAt: analysisPrim.updatedAt || project.stageAnalyses?.[stage]?.updatedAt || Date.now(),
    };
  }
  return project.stageAnalyses?.[stage];
}
