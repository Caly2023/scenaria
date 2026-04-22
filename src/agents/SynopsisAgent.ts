import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class SynopsisAgent extends BaseStageAgent {
  readonly stageId = 'Synopsis';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = this.getUnifiedContext(context);
      const synopsis = await this.retryWithBackoff(() => geminiService.generateSynopsis(unifiedCtx));
      const content: ContentPrimitive[] = [
        this.buildPrimitive('synopsis_0', 'Synopsis', synopsis, 'synopsis', 0),
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
      const refined = await geminiService.rewriteSequence(current?.content || '', instruction);
      const updated = currentContent.map(p =>
        p.id === primitiveId ? { ...p, content: refined } : p
      );
      if (!updated.find(p => p.id === primitiveId)) {
        updated.push(this.buildPrimitive(primitiveId, 'Synopsis', refined, 'synopsis', 0));
      }
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
    const text = content.map(p => p.content).join('\n').trim();
    if (!text) {
      return {
        analysis: this.buildAnalysis('No synopsis written yet.', ['Missing synopsis'], ['Generate from the 3-Act Structure']),
        state: 'empty',
      };
    }
    try {
      const unifiedCtx = this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Synopsis', text, unifiedCtx));
      const wordCount = text.split(/\s+/).length;
      const issues = raw.isReady && wordCount >= 200 ? [] : ['Synopsis may be too brief'];
      const analysis = this.buildAnalysis(
        raw.content, 
        issues, 
        raw.isReady ? [] : ['Expand to ~500 words covering the full narrative arc'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[SynopsisAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const wordCount = text.split(/\s+/).length;
      const analysis = this.buildAnalysis(
        `Synopsis: ~${wordCount} words.`,
        wordCount < 200 ? ['Synopsis is too short'] : [],
        wordCount < 200 ? ['Aim for at least 300-500 words'] : []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }

  }
}
