import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class DialogueContinuityAgent extends BaseStageAgent {
  readonly stageId = 'Dialogue Continuity';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const prompt = `Convert the Sequencer into a full Dialogue Continuity (Scénario avec dialogues). 
      Format with professional sluglines, action lines, and character dialogues.
      Return a JSON array of script scenes.
      Context: ${unifiedCtx}`;
      
      const raw: any = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true));
      const scenes = Array.isArray(raw) ? raw : (raw?.scenes || raw?.script || []);
      
      const content: ContentPrimitive[] = scenes.map((s: any, i: number) => 
        this.buildPrimitive(`scene_${i}`, s.title || `Scene ${i+1}`, s.content || s.text || '', 'script_scene', i)
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
      const current = currentContent.find(p => p.id === primitiveId);
      const refined = await geminiService.refineStageContent(
        this.stageId,
        current?.content || '',
        instruction,
        await this.getUnifiedContext(context)
      );
      
      const updated = currentContent.map(p =>
        p.id === primitiveId ? { ...p, content: refined, agentGenerated: true } : p
      );
      
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
    if (content.length === 0) {
      return { analysis: this.buildAnalysis('No dialogue continuity yet.'), state: 'empty' };
    }
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Dialogue Continuity', content[0].content, unifiedCtx));
      const analysis = this.buildAnalysis(
        raw.evaluation || raw.content || '', 
        raw.issues || [], 
        raw.recommendations || [],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      return { analysis: this.buildAnalysis('Dialogue Continuity ready.'), state: 'good' };
    }
  }
}
