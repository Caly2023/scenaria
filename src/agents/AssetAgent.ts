import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class AssetAgent extends BaseStageAgent {
  readonly stageId = 'Visual Assets';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const prompt = this.getPrompt('generate', "Identify and describe visual assets needed for the film, including character looks, key props, and environment textures. Provide visual prompts for an image generator.");
      
      const raw = await geminiService.generateStageContent(this.stageId, prompt, unifiedCtx);
      
      const content: ContentPrimitive[] = [
        this.buildPrimitive('asset_1', 'Production Assets', raw, 'asset', 1),
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
      const prompt = `Refine these visual assets: "${current?.content || ''}". \nInstruction: ${instruction}`;
      
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
    if (!text) return { analysis: this.buildAnalysis('No assets defined.', ['Missing visual identity'], ['Generate asset list from character/location bibles']), state: 'empty' };

    try {
      const raw = await geminiService.generateStageInsight(this.stageId, text, await this.getUnifiedContext(context));
      const analysis = this.buildAnalysis(
        raw.evaluation || raw.content || '',
        raw.isReady ? [] : ['Assets lack detailed visual prompts'],
        raw.isReady ? [] : ['Add specific lighting and texture descriptions for key assets'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (_err) {
      return { analysis: this.buildAnalysis('Assets present.', [], []), state: 'good' };
    }
  }
}
