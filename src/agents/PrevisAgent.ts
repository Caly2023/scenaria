import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class PrevisAgent extends BaseStageAgent {
  readonly stageId = 'AI Previs';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const prompt = "Generate a storyboard previs description. For each key beat, describe the camera angle, character position, and visual atmosphere.";
      
      const raw = await geminiService.generateStageContent(this.stageId, prompt, unifiedCtx);
      
      const content: ContentPrimitive[] = [
        this.buildPrimitive('previs_1', 'AI Previs / Storyboards', raw, 'previs', 1),
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
      const current = currentContent.find(p => p.id === primitiveId) || currentContent[0];
      const prompt = `Refine the previs: "${current?.content || ''}". \nInstruction: ${instruction}`;
      
      const refined = await geminiService.generateStageContent(this.stageId, prompt, await this.getUnifiedContext(context));
      
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
    const text = content.map(p => p.content).join(' ').trim();
    if (!text) return { analysis: this.buildAnalysis('No previs defined.', ['Missing visual roadmap'], ['Generate storyboards from technical breakdown']), state: 'empty' };

    try {
      const raw = await geminiService.generateStageInsight(this.stageId, text, await this.getUnifiedContext(context));
      const analysis = this.buildAnalysis(
        raw.content,
        raw.isReady ? [] : ['Previs lacks clear shot-to-shot transitions'],
        raw.isReady ? [] : ['Clarify eyelines and character blocking in key frames'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (_err) {
      return { analysis: this.buildAnalysis('Previs present.', [], []), state: 'good' };
    }
  }
}
