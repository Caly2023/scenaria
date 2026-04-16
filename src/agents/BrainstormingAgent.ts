import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class BrainstormingAgent extends BaseStageAgent {
  readonly stageId = 'Brainstorming';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const currentContent = this.normalizeContent(context.stageContents['Brainstorming'] || []);
      const brainstormContent = this.getPitchContent(currentContent);
      if (!brainstormContent.trim()) {
        return this.buildFallbackOutput('No brainstorming content provided');
      }
      const result = await geminiService.brainstormDual(
        brainstormContent,
        brainstormContent,
        context.metadata
      );
      const content = this.buildBrainstormPrimitives(currentContent, result.pitch, result.critique);
      const evalResult = await this.evaluate(content, context);
      return { ...evalResult, content, metadataUpdates: result.metadataUpdates };
    } catch (e: any) {
      return this.buildFallbackOutput(e.message, context.stageContents['Brainstorming'] || []);
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
      const masterStory = this.getPitchContent(normalizedContent);
      const result = await geminiService.brainstormDual(
        instruction,
        masterStory,
        context.metadata
      );
      const updatedContent = this.buildBrainstormPrimitives(normalizedContent, result.pitch, result.critique);

      const evalResult = await this.evaluate(updatedContent, context);
      return { ...evalResult, content: updatedContent, metadataUpdates: result.metadataUpdates };
    } catch (e: any) {
      return this.buildFallbackOutput(e.message, currentContent);
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
    const pitch =
      content.find(p => p.primitiveType === 'pitch_result')
      || content.find(p => /pitch|story|input/i.test(p.title))
      || content[0];
    const critique =
      content.find(p => p.primitiveType === 'analysis_block')
      || content.find(p => /analysis|critique/i.test(p.title))
      || content[1];

    const normalized: ContentPrimitive[] = [];

    if (pitch) {
      normalized.push({
        ...pitch,
        title: 'Final Pitch',
        primitiveType: 'pitch_result',
        order: 1,
      });
    }

    if (critique) {
      normalized.push({
        ...critique,
        title: 'AI Critique',
        primitiveType: 'analysis_block',
        order: 2,
      });
    }

    return normalized;
  }

  private buildBrainstormPrimitives(
    currentContent: ContentPrimitive[],
    pitch: string,
    critique: string
  ): ContentPrimitive[] {
    const normalizedContent = this.normalizeContent(currentContent);
    const pitchPrimitive = normalizedContent.find(p => p.primitiveType === 'pitch_result');
    const critiquePrimitive = normalizedContent.find(p => p.primitiveType === 'analysis_block');

    return [
      this.buildPrimitive(
        pitchPrimitive?.id || 'brainstorm_pitch',
        'Final Pitch',
        pitch,
        'pitch_result',
        1
      ),
      this.buildPrimitive(
        critiquePrimitive?.id || 'brainstorm_analysis',
        'AI Critique',
        critique,
        'analysis_block',
        2
      ),
    ];
  }

  private getPitchContent(content: ContentPrimitive[]): string {
    return content.find(p => p.primitiveType === 'pitch_result')?.content || content[0]?.content || '';
  }
}
