/**
 * CONTEXT SERVICE — Unified interface for project and stage context assembly.
 */

export * from './cascadingContext';
export * from './payloadBuilder';
export * from './promptFormatter';
export * from './stageStructure';

import type { PromptPayload } from '../../types/context';
import type { WorkflowStage } from '../../types';
import { getStageStructure, hydrateFullIdMap } from './stageStructure';
import { buildPromptPayload, buildPayloadFromProjectContext } from './payloadBuilder';
import { formatPrompt } from './promptFormatter';

/**
 * contextAssembler — plain-object singleton for context assembly.
 * Exposes the same API surface as the former class-based service.
 */
export const contextAssembler = {
  getStageStructure(projectId: string, stageName: string) {
    return getStageStructure(projectId, stageName);
  },

  hydrateFullIdMap(projectId: string): Promise<void> {
    return hydrateFullIdMap(projectId);
  },

  buildPromptPayload(
    projectId: string,
    currentStage: WorkflowStage,
    activePrimitiveId?: string
  ): Promise<PromptPayload> {
    return buildPromptPayload(projectId, currentStage, activePrimitiveId);
  },

  buildPayloadFromProjectContext(context: any, currentStage: WorkflowStage): Promise<PromptPayload> {
    return buildPayloadFromProjectContext(context, currentStage);
  },

  formatPrompt(payload: PromptPayload, task: string): string {
    return formatPrompt(payload, task);
  },
} as const;
