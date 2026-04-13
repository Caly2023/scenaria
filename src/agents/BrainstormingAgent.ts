import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class BrainstormingAgent extends BaseStageAgent {
  readonly stageId = 'Brainstorming';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const brainstormContent = context.stageContents['Brainstorming']?.[0]?.content || '';
      if (!brainstormContent.trim()) {
        return this.buildFallbackOutput('No brainstorming content provided');
      }
      const content = context.stageContents['Brainstorming'] || [];
      const evalResult = await this.evaluate(content, context);
      return { ...evalResult, content };
    } catch (e: any) {
      return this.buildFallbackOutput(e.message);
    }
  }

  async updatePrimitive(
    _primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput> {
    try {
      const masterStory = currentContent.find(p => p.primitiveType === 'pitch_result')?.content || '';
      const result = await geminiService.brainstormDual(
        instruction,
        masterStory,
        context.metadata
      );

      const updatedContent: ContentPrimitive[] = [
        this.buildPrimitive(
          currentContent[0]?.id || 'brainstorm_0',
          'Primitive A: The Critique',
          result.critique,
          'analysis_block',
          0
        ),
        this.buildPrimitive(
          currentContent[1]?.id || 'brainstorm_1',
          'Primitive B: The Final Pitch',
          result.pitch,
          'pitch_result',
          1
        ),
      ];

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
    const fullText = content.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
    if (!fullText.trim()) {
      const analysis = this.buildAnalysis('Stage is empty — no brainstorming content yet.', ['No content'], ['Start adding your story ideas']);
      return { analysis, state: 'empty' };
    }
    try {
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Brainstorming', fullText, context.metadata.logline || ''));
      const analysis = this.buildAnalysis(
        raw.content,
        raw.isReady ? [] : ['Content may need strengthening'],
        raw.isReady ? [] : ['Expand on the core conflict and protagonist motivation']
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[BrainstormingAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(fullText.length > 100 ? 'Content present — detailed analysis unavailable.' : 'Content too sparse.');
      return { analysis, state: this.computeState(analysis) };
    }
  }
}
