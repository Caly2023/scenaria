import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class StepOutlineAgent extends BaseStageAgent {
  readonly stageId = 'Step Outline';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const treatmentText = this._getTreatmentText(context);
      const characters = this._getCharacters(context);
      const locations = this._getLocations(context);

      const scenes = await this.retryWithBackoff(() => geminiService.generateInitialSequences(
        treatmentText,
        context.metadata.format || 'Short Film',
        characters,
        locations
      ));

      const content: ContentPrimitive[] = scenes.map((scene: any, i: number) =>
        this.buildPrimitive(
          `scene_${i}`,
          scene.title,
          scene.content,
          'scene_outline',
          i + 1,
          { metadata: { characterIds: scene.characterIds || [], locationIds: scene.locationIds || [] } }
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
        analysis: this.buildAnalysis('No scenes defined yet.', ['Missing scene outline'], ['Generate step outline from the Treatment']),
        state: 'empty',
      };
    }
    const fullText = content.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Step Outline', fullText, unifiedCtx));
      const analysis = this.buildAnalysis(
        raw.content, 
        raw.isReady ? [] : ['Scenes need more detail'], 
        raw.isReady ? [] : ['Flesh out each scene with more action information'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[StepOutlineAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const analysis = this.buildAnalysis(
        `${content.length} scene(s) in the outline.`,
        content.length < 3 ? ['Very few scenes'] : [],
        content.length < 3 ? ['Add more scenes to cover the full story'] : []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }

  private _getTreatmentText(context: ProjectContext): string {
    return (context.stageContents['Treatment'] || []).map(p => `[${p.title}]\n${p.content}`).join('\n\n');
  }

  private _getCharacters(context: ProjectContext): any[] {
    return (context.stageContents['Character Bible'] || []).map(p => ({ id: p.id, name: p.title }));
  }

  private _getLocations(context: ProjectContext): any[] {
    return (context.stageContents['Location Bible'] || []).map(p => ({ id: p.id, name: p.title }));
  }
}
