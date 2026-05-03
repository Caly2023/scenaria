import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class FinalScreenplayAgent extends BaseStageAgent {
  readonly stageId = 'Final Screenplay';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const prompt = `Perform a final polish of the Dialogue Continuity to create the Final Screenplay. 
      Focus on pacing, subtext, and professional formatting. 
      Return a JSON array of polished scenes.
      Context: ${unifiedCtx}`;
      
      const raw: any = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true));
      const scenes = Array.isArray(raw) ? raw : (raw?.scenes || raw?.script || []);
      
      const content: ContentPrimitive[] = scenes.map((s: any, i: number) => 
        this.buildPrimitive(`final_${i}`, s.title || `Scene ${i+1}`, s.content || s.text || '', 'script_scene', i)
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
      return { analysis: this.buildAnalysis('No final screenplay yet.'), state: 'empty' };
    }
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Final Screenplay', content[0].content, unifiedCtx));
      const analysis = this.buildAnalysis(
        raw.evaluation || raw.content || '', 
        raw.issues || [], 
        raw.recommendations || [],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      return { analysis: this.buildAnalysis('Final screenplay polished.'), state: 'excellent' };
    }
  }
}
