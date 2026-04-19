import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';
import type { ScriptGenerationContext } from '../services/ai/prompts';

export class ScriptAgent extends BaseStageAgent {
  readonly stageId = 'Script';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const scriptCtx: ScriptGenerationContext = {
        metadata: {
          title: context.metadata.title,
          genre: context.metadata.genre,
          format: context.metadata.format,
          tone: context.metadata.tone,
          languages: context.metadata.languages,
          logline: context.metadata.logline,
          targetDuration: context.metadata.targetDuration,
        },
        structure: this._getStructure(context),
        synopsis: this._getSynopsis(context),
        treatment: this._getTreatmentText(context),
        characterBible: this._serializeCharacterBible(context),
        locationBible: this._serializeLocationBible(context),
        stepOutline: this._serializeStepOutline(context),
      };

      const raw = await this.retryWithBackoff(() => geminiService.generateFullScript(scriptCtx));
      const scenes = this.normalizeToJsonArray<any>(raw);

      const content: ContentPrimitive[] = scenes.length > 0
        ? scenes.map((scene: any, i: number) => {
            const body = scene?.content;
            const text =
              typeof body === 'string'
                ? body
                : body != null
                  ? String(body)
                  : '';
            return this.buildPrimitive(
              `script_${i}`,
              scene?.title || `Scene ${i + 1}`,
              text,
              'script_scene',
              i,
            );
          })
        : [
            this.buildPrimitive(
              'script_0',
              'Script',
              typeof raw === 'string' ? raw : JSON.stringify(raw ?? ''),
              'script_scene',
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

  private _serializeCharacterBible(context: ProjectContext): string {
    const prims = context.stageContents['Character Bible'] || [];
    return JSON.stringify(
      prims.map((p) => ({
        name: p.title,
        role: (p.metadata?.role as string) || '',
        description: p.content,
        tier: p.metadata?.tier,
      })),
      null,
      2,
    );
  }

  private _serializeLocationBible(context: ProjectContext): string {
    const prims = context.stageContents['Location Bible'] || [];
    return JSON.stringify(
      prims.map((p) => ({
        name: p.title,
        atmosphere: (p.metadata?.atmosphere as string) || '',
        description: p.content,
      })),
      null,
      2,
    );
  }

  private _serializeStepOutline(context: ProjectContext): string {
    const prims = [...(context.stageContents['Step Outline'] || [])].sort((a, b) => a.order - b.order);
    return JSON.stringify(
      prims.map((p, i) => ({
        index: i + 1,
        title_slugline: p.title,
        beats_and_action: p.content,
        characterIds: p.metadata?.characterIds,
        locationIds: p.metadata?.locationIds,
      })),
      null,
      2,
    );
  }
}
