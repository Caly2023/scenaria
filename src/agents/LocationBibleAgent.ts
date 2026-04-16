import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class LocationBibleAgent extends BaseStageAgent {
  readonly stageId = 'Location Bible';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const brainstorming = this._getBrainstorming(context);
      if (!brainstorming) return this.buildFallbackOutput('Brainstorming content required');

      const extraction = await this.retryWithBackoff(() => geminiService.extractCharactersAndSettings(brainstorming));
      const content: ContentPrimitive[] = extraction.settings.map((loc: any, i: number) =>
        this.buildPrimitive(
          `loc_gen_${i}`,
          loc.location,
          `**Atmosphere:** ${loc.atmosphere}\n\n${loc.description}`,
          'location',
          i,
          { visualPrompt: loc.visualPrompt }
        )
      );
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
        analysis: this.buildAnalysis('No locations defined yet.', ['No locations'], ['Extract locations from Brainstorming']),
        state: 'empty',
      };
    }
    const fullText = content.map(p => `**${p.title}**: ${p.content.substring(0, 200)}`).join('\n');
    try {
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Location Bible', fullText, context.metadata.logline));
      const analysis = this.buildAnalysis(
        raw.content, 
        raw.isReady ? [] : ['Locations need more detail'], 
        raw.isReady ? [] : ['Add atmosphere and narrative significance to each location'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[LocationBibleAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(
        `${content.length} location(s) defined.`,
        content.length < 1 ? ['No locations defined'] : [],
        []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }

  private _getBrainstorming(context: ProjectContext): string {
    const p = context.stageContents['Brainstorming'] || [];
    return p.find(x => x.primitiveType === 'brainstorming_result')?.content
      || p.find(x => x.primitiveType === 'pitch_result')?.content // backward compat
      || p[0]?.content
      || '';
  }
}
