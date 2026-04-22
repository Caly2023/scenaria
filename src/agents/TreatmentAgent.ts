import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class TreatmentAgent extends BaseStageAgent {
  readonly stageId = 'Treatment';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateTreatment(unifiedCtx));
      const blocks = this.normalizeToJsonArray<any>(raw);

      const content: ContentPrimitive[] = blocks.length >= 3
        ? blocks.map((block: any, i: number) =>
            this.buildPrimitive(`treatment_${i}`, block.title || `Section ${i + 1}`, block.content || '', 'treatment_section', i)
          )
        : [
            this.buildPrimitive(
              'treatment_0',
              'Treatment',
              typeof raw === 'string' ? raw : JSON.stringify(raw ?? ''),
              'treatment_section',
              0,
            ),
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
      const unifiedCtx = this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Treatment', fullText, unifiedCtx));
      const issues = raw.isReady && content.length >= 5 ? [] : [`Only ${content.length} sections (minimum 5 recommended)`];
      const analysis = this.buildAnalysis(
        raw.content, 
        issues, 
        raw.isReady ? [] : ['Add more detailed cinematic sections'],
        raw.suggestedPrompt
      );
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
  }
