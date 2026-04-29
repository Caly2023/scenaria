import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';
import * as Prompts from '../services/ai/prompts';
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
      let scenes = this._normalizeScriptScenes(raw);

      // Align Script generation with the Script Doctor + verification flow:
      // run one automated verification pass and, if needed, regenerate once
      // using the verifier's suggestedPrompt.
      const previewForVerification = scenes
        .map((s, i) => `[Scene ${i + 1}] ${s.title}\n${s.content.substring(0, 250)}`)
        .join('\n\n')
        .trim();
      const projectSignal = context.metadata.logline || this._getSynopsis(context) || context.metadata.title;
      const unifiedCtx = await this.getUnifiedContext(context);
      const verification = await this.retryWithBackoff(() =>
        geminiService.generateStageInsight('Script', previewForVerification, unifiedCtx)
      );

      if (!verification.isReady && verification.suggestedPrompt) {
        const revisionPrompt = `${Prompts.SCRIPT_PROMPT(scriptCtx)}

REVISION REQUIRED BY VERIFICATION AGENT:
${verification.suggestedPrompt}

If the first draft below already satisfies part of the request, keep and improve it instead of replacing blindly.
FIRST DRAFT:
${JSON.stringify(scenes, null, 2)}`;

        const revisedRaw = await this.retryWithBackoff(() =>
          geminiService.generateScriptWithContext(revisionPrompt)
        );
        const revisedScenes = this._normalizeScriptScenes(revisedRaw);
        if (revisedScenes.length > 0) {
          scenes = revisedScenes;
        }
      }

      const content: ContentPrimitive[] = scenes.length > 0
        ? scenes.map((scene, i: number) => {
            return this.buildPrimitive(
              `script_${i}`,
              scene.title || `Scene ${i + 1}`,
              scene.content,
              'script_scene',
              i + 1,
            );
          })
        : [
            this.buildPrimitive(
              'script_0',
              'Script',
              typeof raw === 'string' ? raw : JSON.stringify(raw ?? ''),
              'script_scene',
              1,
            ),
          ];

      const evalResult = await this.evaluate(content, context);
      return { ...evalResult, content };
    } catch (e: any) {
      return this.buildFallbackOutput(e.message);
    }
  }

  private _normalizeScriptScenes(raw: unknown): Array<{ title: string; content: string }> {
    const rows = this.normalizeToJsonArray<Record<string, unknown>>(raw);
    return rows
      .map((scene, i) => {
        const titleValue = scene.title;
        const contentValue =
          scene.content ??
          scene.description ??
          scene.text ??
          scene.scene ??
          '';
        const title = typeof titleValue === 'string' && titleValue.trim()
          ? titleValue.trim()
          : `Scene ${i + 1}`;
        const content = typeof contentValue === 'string'
          ? contentValue
          : contentValue != null
            ? String(contentValue)
            : '';
        return { title, content };
      })
      .filter((scene) => scene.content.trim().length > 0);
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
      const unifiedCtx = await this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Script', fullText, unifiedCtx));
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
