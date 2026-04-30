import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class MetadataAgent extends BaseStageAgent {
  readonly stageId = 'Project Metadata';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      // For metadata, "generating" usually means refining the existing metadata based on a prompt.
      // Or extracting metadata from an initial draft if available.
      const draftContent = context.stageContents['Initial Draft']?.[0]?.content || '';
      const prompt = draftContent 
        ? `Based on this initial premise: "${draftContent}", suggest optimal genre, tone, and format settings for this project.`
        : `Suggest professional genre, tone, and format settings for a project titled "${context.metadata.title}".`;

      const result = await geminiService.generateStageContent(this.stageId, prompt, '');
      
      // Metadata is unique because it updates the PROJECT fields, not a subcollection usually.
      // But we return it as a primitive for consistency in the UI if needed.
      const content: ContentPrimitive[] = [
        this.buildPrimitive('metadata_1', 'Project DNA', result, 'metadata', 1),
      ];

      const evalResult = await this.evaluate(content, context);
      return { ...evalResult, content };
    } catch (e: any) {
      return this.buildFallbackOutput(e.message);
    }
  }

  async updatePrimitive(
    primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput> {
    try {
      const current = currentContent.find(p => p.id === primitiveId) || currentContent[0];
      const prompt = current?.content
        ? `Refine these project metadata settings: "${current.content}". Instruction: ${instruction}`
        : `Suggest project settings for: ${instruction}`;
      const result = await geminiService.generateStageContent(this.stageId, prompt, '');
      const updated = currentContent.map(p =>
        p.id === primitiveId ? { ...p, content: result, agentGenerated: true } : p
      );
      const evalResult = await this.evaluate(updated, context);
      return { ...evalResult, content: updated };
    } catch (e: any) {
      return this.buildFallbackOutput(e.message, currentContent);
    }
  }

  async evaluate(
    content: ContentPrimitive[],
    context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>> {
    const m = context.metadata;
    const missing = [];
    if (!m.genre) missing.push('Genre');
    if (!m.tone) missing.push('Tone');
    if (!m.format) missing.push('Format');

    if (missing.length > 0) {
      return {
        analysis: this.buildAnalysis(
          `Project DNA is incomplete. Missing: ${missing.join(', ')}.`,
          missing.map(f => `${f} is not defined`),
          ['Complete the project settings to enable better AI assistance']
        ),
        state: 'empty'
      };
    }

    return {
      analysis: this.buildAnalysis(
        'Project DNA is solid. Genre, tone, and format are well-defined.',
        [],
        [],
        'Suggest improvements to the project theme'
      ),
      state: 'good'
    };
  }
}
