import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class DraftAgent extends BaseStageAgent {
  readonly stageId = 'Initial Draft';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      // For Initial Draft, we often start with nothing or very little.
      // We use the project metadata (title, genre, tone) to seed the initial idea.
      const prompt = `Based on the project titled "${context.metadata.title}" (Genre: ${context.metadata.genre}, Tone: ${context.metadata.tone}), draft a compelling initial premise or "spark" for a short film. Focus on a single dramatic objective and a clear protagonist.`;
      
      const result = await geminiService.generateStageContent(this.stageId, prompt, context.metadata.logline || '');
      
      const content: ContentPrimitive[] = [
        this.buildPrimitive('draft_1', 'Initial Premise', result, 'draft', 1),
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
      const prompt = `Update the following initial premise: "${current?.content || ''}". \nInstruction: ${instruction}`;
      
      const refined = await geminiService.generateStageContent(this.stageId, prompt, context.metadata.logline || '');
      
      const updated = currentContent.map(p =>
        p.id === primitiveId ? { ...p, content: refined, agentGenerated: true } : p
      );
      
      if (!updated.find(p => p.id === primitiveId)) {
        updated.push(this.buildPrimitive(primitiveId, 'Initial Premise', refined, 'draft', 1));
      }
      
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
    if (!text) {
      return {
        analysis: this.buildAnalysis('Premise is empty.', ['Missing core idea'], ['Describe your initial idea in a few sentences']),
        state: 'empty'
      };
    }

    try {
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight(this.stageId, text, context.metadata.logline || ''));
      const issues = raw.isReady ? [] : ['Premise might be too vague or lacks conflict'];
      const analysis = this.buildAnalysis(
        raw.content,
        issues,
        raw.isReady ? [] : ['Focus on one protagonist with a clear emotional need'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[DraftAgent] evaluate() failed, using fallback:`, err);
      const wordCount = text.split(/\s+/).length;
      const analysis = this.buildAnalysis(
        wordCount > 10 ? 'Premise present.' : 'Premise seems too brief.',
        wordCount <= 10 ? ['Content is very sparse'] : [],
        wordCount <= 10 ? ['Expand on the inciting incident or main character'] : []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }
}
