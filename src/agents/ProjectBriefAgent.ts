import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class ProjectBriefAgent extends BaseStageAgent {
  readonly stageId = 'Project Brief';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      // Generate a synthesis of the discovery conversation if content is empty
      const prompt = `Based on the project context, generate a complete Project Brief including a Logline, Synopsis, and Production Notes. 
      Format each as a distinct component.
      Context: ${unifiedCtx}`;
      
      const raw: any = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true));
      
      const content: ContentPrimitive[] = [
        this.buildPrimitive('brief_logline', 'Logline', raw.logline || raw.content || '', 'logline', 1),
        this.buildPrimitive('brief_synopsis', 'Synopsis', raw.synopsis || '', 'synopsis', 2),
        this.buildPrimitive('brief_notes', 'Production Notes', raw.productionNotes || raw.notes || '', 'production_notes', 3),
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
    const briefText = content.map(p => `${p.title}:\n${p.content}`).join('\n\n');
    if (!briefText || content.length < 2) {
      const analysis = this.buildAnalysis('Project Brief is incomplete.', ['Missing key components'], ['Ensure logline and synopsis are present']);
      return { analysis, state: 'needs_improvement' };
    }
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Project Brief', briefText, unifiedCtx));
      const analysis = this.buildAnalysis(
        raw.evaluation || raw.content || '', 
        raw.issues || [], 
        raw.recommendations || [],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      return { 
        analysis: this.buildAnalysis('Project Brief analysis failed, but content is present.'),
        state: 'good'
      };
    }
  }
}
