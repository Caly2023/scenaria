import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class CharacterBibleAgent extends BaseStageAgent {
  readonly stageId = 'Character Bible';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const brainstorming = this._getBrainstorming(context);
      if (!brainstorming) return this.buildFallbackOutput('Brainstorming content required');

      const extraction = await this.retryWithBackoff(() => geminiService.extractCharactersAndSettings(brainstorming));
      const content: ContentPrimitive[] = extraction.characters.map((char: any, i: number) =>
        this.buildPrimitive(
          `char_gen_${i}`,
          char.name,
          `**Role:** ${char.role}\n\n${char.description}`,
          'character',
          i,
          { visualPrompt: char.visualPrompt, metadata: { tier: char.tier || 3, role: char.role } }
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
        analysis: this.buildAnalysis('No characters extracted yet.', ['No characters'], ['Extract characters from Brainstorming']),
        state: 'empty',
      };
    }
    const fullText = content.map(p => `**${p.title}**: ${p.content.substring(0, 200)}`).join('\n');
    try {
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Character Bible', fullText, context.metadata.logline));
      const hasTier1 = content.some(p => p.metadata?.tier === 1);
      const issues = raw.isReady && hasTier1 ? [] : ['No Tier-1 (main) character defined'];
      const analysis = this.buildAnalysis(
        raw.content, 
        issues, 
        raw.isReady ? [] : ['Ensure at least one main character with deep development'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[CharacterBibleAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(
        `${content.length} character(s) defined.`,
        content.length < 2 ? ['Too few characters'] : [],
        content.length < 2 ? ['Add at least 2-3 characters'] : []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }

  private _getBrainstorming(context: ProjectContext): string {
    const p = context.stageContents['Brainstorming'] || [];
    return p.find(x => x.primitiveType === 'pitch_result')?.content || p[1]?.content || p[0]?.content || '';
  }
}
