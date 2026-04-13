import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class TreatmentAgent extends BaseStageAgent {
  readonly stageId = 'Treatment';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const structure = this._getStructure(context);
      const synopsis = this._getSynopsis(context);
      const brainstorming = this._getBrainstorming(context);

      const promptContext = [
        structure && `[3-ACT STRUCTURE]\n${structure}`,
        synopsis && `[SYNOPSIS]\n${synopsis}`,
        brainstorming && `[BRAINSTORMING]\n${brainstorming}`,
      ].filter(Boolean).join('\n\n');

      const raw = await this.retryWithBackoff(() => geminiService.generateTreatment(promptContext));
      const blocks = this.safeParseJson<any[]>(raw) || [];

      const content: ContentPrimitive[] = Array.isArray(blocks) && blocks.length >= 3
        ? blocks.map((block: any, i: number) =>
            this.buildPrimitive(`treatment_${i}`, block.title || `Section ${i + 1}`, block.content || '', 'treatment_section', i)
          )
        : [this.buildPrimitive('treatment_0', 'Treatment', raw, 'treatment_section', 0)];

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
      const prim = currentContent.find(p => p.id === primitiveId);
      if (!prim) return this.buildFallbackOutput(`Primitive ${primitiveId} not found`, currentContent);
      const refined = await geminiService.rewriteSequence(prim.content, instruction);
      const updated = currentContent.map(p => p.id === primitiveId ? { ...p, content: refined } : p);
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
      return {
        analysis: this.buildAnalysis('No treatment written yet.', ['Missing treatment'], ['Generate cinematic treatment from previous stages']),
        state: 'empty',
      };
    }
    const fullText = content.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
    try {
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Treatment', fullText, context.metadata.logline));
      const issues = raw.isReady && content.length >= 5 ? [] : [`Only ${content.length} sections (minimum 5 recommended)`];
      const analysis = this.buildAnalysis(raw.content, issues, raw.isReady ? [] : ['Add more detailed cinematic sections']);
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[TreatmentAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(
        `${content.length} treatment section(s).`,
        content.length < 5 ? ['Too few sections'] : [],
        content.length < 5 ? ['Aim for 5+ narrative sections'] : []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }

  private _getBrainstorming(context: ProjectContext): string {
    const p = context.stageContents['Brainstorming'] || [];
    return p.find(x => x.primitiveType === 'pitch_result')?.content || p[1]?.content || p[0]?.content || '';
  }

  private _getStructure(context: ProjectContext): string {
    return context.stageContents['3-Act Structure']?.map(p => `[${p.title}]\n${p.content}`).join('\n\n') || '';
  }

  private _getSynopsis(context: ProjectContext): string {
    return context.stageContents['Synopsis']?.[0]?.content || '';
  }
}
