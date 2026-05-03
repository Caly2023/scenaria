import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class SequencerAgent extends BaseStageAgent {
  readonly stageId = 'Sequencer';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const prompt = `Based on the Treatment and Story Bible, break down the story into a sequence of scenes. 
      Each scene should have a title and a narrative description.
      Return a JSON array of scenes.
      Context: ${unifiedCtx}`;
      
      const raw: any = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true));
      const scenes = Array.isArray(raw) ? raw : (raw?.scenes || raw?.sequences || []);
      
      const content: ContentPrimitive[] = scenes.map((s: any, i: number) => 
        this.buildPrimitive(`seq_${i}`, s.title || `Sequence ${i+1}`, s.content || s.description || '', 'sequence', i)
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
      return { analysis: this.buildAnalysis('No sequences yet.'), state: 'empty' };
    }
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const summary = content.map(p => p.title).join('\n');
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Sequencer', summary, unifiedCtx));
      const analysis = this.buildAnalysis(
        raw.evaluation || raw.content || '', 
        raw.issues || [], 
        raw.recommendations || [],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      return { analysis: this.buildAnalysis('Sequencer ready.'), state: 'good' };
    }
  }
}
