import { PromptPayload } from '../types/context';
import { WorkflowStage } from '../types';
import { getStageStructure, hydrateFullIdMap } from './context/stageStructure';
import { buildPromptPayload, buildPayloadFromProjectContext } from './context/payloadBuilder';
import { formatPrompt } from './context/promptFormatter';

class ContextAssembler {
  async getStageStructure(
    projectId: string,
    stageName: string
  ): Promise<Array<{ id: string; title: string; content: string; order: number; [key: string]: any }>> {
    return getStageStructure(projectId, stageName);
  }

  async hydrateFullIdMap(projectId: string): Promise<void> {
    return hydrateFullIdMap(projectId);
  }

  async buildPromptPayload(
    projectId: string, 
    currentStage: WorkflowStage, 
    activePrimitiveId?: string
  ): Promise<PromptPayload> {
    return buildPromptPayload(projectId, currentStage, activePrimitiveId);
  }

  async getContextForStage(
    projectId: string, 
    currentStage: WorkflowStage, 
    activePrimitiveId?: string
  ): Promise<string> {
    const payload = await this.buildPromptPayload(projectId, currentStage, activePrimitiveId);
    return this.formatPrompt(payload, "");
  }

  async buildPayloadFromProjectContext(
    context: any, 
    currentStage: WorkflowStage
  ): Promise<PromptPayload> {
    return buildPayloadFromProjectContext(context, currentStage);
  }

  formatPrompt(payload: PromptPayload, task: string): string {
    return formatPrompt(payload, task);
  }
}

export const contextAssembler = new ContextAssembler();
