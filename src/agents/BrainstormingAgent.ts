import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class BrainstormingAgent extends BaseStageAgent {
  readonly stageId = 'Brainstorming';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const currentContent = this.normalizeContent(context.stageContents['Brainstorming'] || []);
      const brainstormContent = this.getBrainstormingContent(currentContent);
      if (!brainstormContent.trim()) {
        return this.buildFallbackOutput('No brainstorming content provided');
      }
      const result = await geminiService.brainstormDual(
        brainstormContent,
        brainstormContent,
        context.metadata
      );
      const content = this.buildBrainstormPrimitives(currentContent, result.pitch);
      const evalResult = await this.evaluate(content, context);
      return { ...evalResult, content, metadataUpdates: result.metadataUpdates };
    } catch (e: any) {
      const normalized = this.normalizeContent(context.stageContents['Brainstorming'] || []);
      return this.buildFallbackOutput(e.message, normalized);
    }
  }

  async updatePrimitive(
    _primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput> {
    try {
      const normalizedContent = this.normalizeContent(currentContent);
      const masterStory = this.getBrainstormingContent(normalizedContent);
      const result = await geminiService.brainstormDual(
        instruction,
        masterStory,
        context.metadata
      );
      const updatedContent = this.buildBrainstormPrimitives(normalizedContent, result.pitch);

      const evalResult = await this.evaluate(updatedContent, context);
      return { ...evalResult, content: updatedContent, metadataUpdates: result.metadataUpdates };
    } catch (e: any) {
      const normalized = this.normalizeContent(currentContent);
      return this.buildFallbackOutput(e.message, normalized);
    }
  }

  async evaluate(
    content: ContentPrimitive[],
    context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>> {
    const normalizedContent = this.normalizeContent(content);
    const fullText = normalizedContent.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
    if (!fullText.trim()) {
      const analysis = this.buildAnalysis('Stage is empty — no brainstorming content yet.', ['No content'], ['Start adding your story ideas']);
      return { analysis, state: 'empty' };
    }
    try {
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Brainstorming', fullText, context.metadata.logline || ''));
      const analysis = this.buildAnalysis(
        raw.content,
        raw.isReady ? [] : ['Content may need strengthening'],
        raw.isReady ? [] : ['Expand on the core conflict and protagonist motivation'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[BrainstormingAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(fullText.length > 100 ? 'Content present — detailed analysis unavailable.' : 'Content too sparse.');
      return { analysis, state: this.computeState(analysis) };
    }
  }

  private normalizeContent(content: ContentPrimitive[]): ContentPrimitive[] {
    const brainstorming =
      content.find(p => p.primitiveType === 'brainstorming_result') ||
      content.find(p => p.primitiveType === 'pitch_result') || // backward compat
      content.find(p => /brainstorm|pitch|story|input/i.test(p.title)) ||
      content[0];

    if (!brainstorming) return [];

    return [
      {
        ...brainstorming,
        title: 'Brainstorming Result',
        primitiveType: 'brainstorming_result',
        order: 1,
      },
    ];
  }

  private buildBrainstormPrimitives(
    currentContent: ContentPrimitive[],
    pitch: string
  ): ContentPrimitive[] {
    const normalizedContent = this.normalizeContent(currentContent);
    const brainstormingPrimitive = normalizedContent[0];

    return [
      this.buildPrimitive(
        brainstormingPrimitive?.id || 'brainstorm_result',
        'Brainstorming Result',
        pitch,
        'brainstorming_result',
        1
      ),
    ];
  }

  private getBrainstormingContent(content: ContentPrimitive[]): string {
    return content.find(p => p.primitiveType === 'brainstorming_result')?.content || content[0]?.content || '';
  }
}
