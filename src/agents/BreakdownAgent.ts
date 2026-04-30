import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class BreakdownAgent extends BaseStageAgent {
  readonly stageId = 'Technical Breakdown';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const prompt = this.getPrompt('generate', "Generate a technical breakdown for the script. Identify shots, camera movements, and equipment needed for each scene.");
      
      const raw = await geminiService.generateStageContent(this.stageId, prompt, unifiedCtx);
      const content: ContentPrimitive[] = [
        this.buildPrimitive('breakdown_1', 'Technical Breakdown', raw, 'breakdown', 1),
      ];
      
      const evalResult = await this.evaluate(content, context);
      return { ...evalResult, content };
    } catch (e: unknown) {
      return this.handleError(e);
    }
  }

  async updatePrimitive(
    primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput> {
    try {
      const current = currentContent.find(p => p.id === primitiveId) || currentContent[0];
      const basePrompt = this.getPrompt('magic', 'Update the technical breakdown');
      const prompt = `${basePrompt}: "${current?.content || ''}". \nInstruction: ${instruction}`;
      
      const refined = await geminiService.generateStageContent(this.stageId, prompt, await this.getUnifiedContext(context));
      
      const updated = currentContent.map(p =>
        p.id === primitiveId ? { ...p, content: refined, agentGenerated: true } : p
      );
      
      const evalResult = await this.evaluate(updated, context);
      return { ...evalResult, content: updated };
    } catch (e: unknown) {
      return this.handleError(e, currentContent);
    }
  }

  async evaluate(
    content: ContentPrimitive[],
    context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>> {
    const text = content.map(p => p.content).join(' ').trim();
    if (!text) return { analysis: this.buildAnalysis('No breakdown yet.', ['Missing technical details'], ['Generate shots from script']), state: 'empty' };

    try {
      const raw = await geminiService.generateStageInsight(this.stageId, text, await this.getUnifiedContext(context));
      const analysis = this.buildAnalysis(
        raw.content,
        raw.isReady ? [] : ['Technical breakdown lacks specific lens or movement details'],
        raw.isReady ? [] : ['Define camera angles and lighting strategy for key shots'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (_err) {
      return { analysis: this.buildAnalysis('Breakdown present.', [], []), state: 'good' };
    }
  }
}
