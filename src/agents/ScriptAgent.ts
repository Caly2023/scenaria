import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class ScriptAgent extends BaseStageAgent {
  readonly stageId = 'Script';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const structure = this._getStructure(context);
      const synopsis = this._getSynopsis(context);
      const treatmentText = this._getTreatmentText(context);
      const characters = this._getCharacters(context);

      const raw = await this.retryWithBackoff(() => geminiService.generateFullScript(structure, synopsis, treatmentText, characters));
      const scenes = this.safeParseJson<any[]>(raw) || [];

      const content: ContentPrimitive[] = Array.isArray(scenes) && scenes.length > 0
        ? scenes.map((scene: any, i: number) =>
            this.buildPrimitive(`script_${i}`, scene.title || `Scene ${i + 1}`, scene.content || '', 'script_scene', i)
          )
        : [this.buildPrimitive('script_0', 'Script', raw, 'script_scene', 0)];

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
        analysis: this.buildAnalysis('No script written yet.', ['Missing script'], ['Generate the full screenplay from previous stages']),
        state: 'empty',
      };
    }
    const fullText = content.map(p => `[${p.title}]\n${p.content.substring(0, 300)}`).join('\n\n');
    try {
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Script', fullText, context.metadata.logline));
      const analysis = this.buildAnalysis(
        raw.content, 
        raw.isReady ? [] : ['Script needs refinement'], 
        raw.isReady ? [] : ['Review dialogue, action lines, and scene structure'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[ScriptAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(`${content.length} scene(s) written.`, [], []);
      return { analysis, state: content.length > 5 ? 'good' : 'needs_improvement' };
    }
  }

  private _getStructure(context: ProjectContext): string {
    return JSON.stringify(context.stageContents['3-Act Structure']?.map(p => ({ title: p.title, content: p.content })) || []);
  }

  private _getSynopsis(context: ProjectContext): string {
    return context.stageContents['Synopsis']?.[0]?.content || '';
  }

  private _getTreatmentText(context: ProjectContext): string {
    return (context.stageContents['Treatment'] || []).map(p => `[${p.title}]\n${p.content}`).join('\n\n');
  }

  private _getCharacters(context: ProjectContext): any[] {
    return (context.stageContents['Character Bible'] || []).map(p => ({
      name: p.title, role: p.metadata?.role || '', description: p.content.substring(0, 300)
    }));
  }
}
