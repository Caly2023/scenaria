import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

const BEAT_TITLES = [
  'The Hook',
  'The Inciting Event',
  'The First Plot Point',
  'The First Pinch Point',
  'The Midpoint',
  'The Second Pinch Point',
  'The Third Plot Point',
  'The Climax & Resolution',
];

export class StructureAgent extends BaseStageAgent {
  readonly stageId = '3-Act Structure';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generate3ActStructure(unifiedCtx));
      const parsed = this.safeParseJson<{ blocks?: any[]; [k: string]: any }>(raw);
      const blocks = parsed?.blocks || (Array.isArray(parsed) ? parsed : []);

      const content: ContentPrimitive[] = blocks.length > 0
        ? blocks.map((beat: any, i: number) =>
            this.buildPrimitive(
              `beat_${i}`,
              beat.title || BEAT_TITLES[i] || `Beat ${i + 1}`,
              beat.content || '',
              'beat',
              i,
              { visualPrompt: beat.visualPrompt }
            )
          )
        : this._parseLegacyText(raw);

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
      const currentJson = JSON.stringify({
        blocks: currentContent.map(p => ({ title: p.title, content: p.content })),
      });
      const raw = await geminiService.refine3ActStructure(currentJson, instruction);
      const parsed = this.safeParseJson<{ blocks?: any[] }>(raw);
      const blocks = parsed?.blocks || currentContent;

      const updated: ContentPrimitive[] = Array.isArray(blocks)
        ? blocks.map((beat: any, i: number) =>
            this.buildPrimitive(
              currentContent[i]?.id || `beat_${i}`,
              beat.title || BEAT_TITLES[i] || `Beat ${i + 1}`,
              beat.content || '',
              'beat',
              i
            )
          )
        : currentContent;

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
    if (!content.length) {
      const analysis = this.buildAnalysis('No 3-Act Structure defined yet.', ['Missing structure'], ['Generate the 8-beat framework']);
      return { analysis, state: 'empty' };
    }
    const fullText = content.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
    try {
      const unifiedCtx = this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('3-Act Structure', fullText, unifiedCtx));
      const beatCount = content.filter(p => p.primitiveType === 'beat').length;
      const issues = raw.isReady && beatCount >= 8 ? [] : [`Only ${beatCount}/8 beats defined`];
      const analysis = this.buildAnalysis(
        raw.content, 
        issues, 
        raw.isReady ? [] : ['Complete all 8 beats'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[StructureAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(
        `${content.length} beats defined.`,
        content.length < 8 ? [`Only ${content.length}/8 beats present`] : [],
        content.length < 8 ? ['Add the missing beats to complete the framework'] : []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }

  }

  private _parseLegacyText(raw: string): ContentPrimitive[] {
    return [this.buildPrimitive('structure_root', '3-Act Structure', raw, 'beat', 0)];
  }
}
