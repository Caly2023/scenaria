import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class ExportAgent extends BaseStageAgent {
  readonly stageId = 'Production Export';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const prompt = this.getPrompt('generate', "Prepare a final production export summary. Summarize the script, character details, locations, and technical requirements for hand-off to a crew.");
      
      const raw = await geminiService.generateStageContent(this.stageId, prompt, unifiedCtx);
      
      const content: ContentPrimitive[] = [
        this.buildPrimitive('export_1', 'Production Package', raw, 'export', 1),
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
      const prompt = `Refine the export package: "${current?.content || ''}". \nInstruction: ${instruction}`;
      
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
    _context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>> {
    const text = content.map(p => p.content).join(' ').trim();
    if (!text) return { analysis: this.buildAnalysis('Export not ready.', ['Incomplete production package'], ['Finalize all previous stages first']), state: 'empty' };

    return {
      analysis: this.buildAnalysis(
        'Production package is ready for export.',
        [],
        [],
        'Suggest a film festival strategy based on this script'
      ),
      state: 'good'
    };
  }
}
