import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class LoglineAgent extends BaseStageAgent {
  readonly stageId = 'Logline';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = this.getUnifiedContext(context);
      const logline = await this.retryWithBackoff(() => geminiService.generateLoglineDraft(unifiedCtx));
      const content: ContentPrimitive[] = [
        this.buildPrimitive('logline_1', 'Logline', logline, 'logline', 1),
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
      const refined = await geminiService.refineLoglineDraft(current?.content || '', instruction);
      const updated = currentContent.map(p =>
        p.id === primitiveId ? { ...p, content: refined, agentGenerated: true } : p
      );
      if (!updated.find(p => p.id === primitiveId)) {
        updated.push(this.buildPrimitive(primitiveId, 'Logline', refined, 'logline', 1));
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
    const loglineText = content.map(p => p.content).join(' ').trim();
    if (!loglineText) {
      const analysis = this.buildAnalysis('No logline yet.', ['Missing logline'], ['Generate a logline from the Brainstorming stage']);
      return { analysis, state: 'empty' };
    }
    try {
      const unifiedCtx = this.getUnifiedContext(context);
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Logline', loglineText, unifiedCtx));
      const issues = raw.isReady ? [] : ['Logline may lack a clear protagonist or conflict'];
      const analysis = this.buildAnalysis(
        raw.content, 
        issues, 
        raw.isReady ? [] : ['Tighten to 1-2 sentences with protagonist, goal, conflict'],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      console.warn(`[LoglineAgent] evaluate() AI call failed, using heuristic fallback:`, err);
      const wordCount = loglineText.split(/\s+/).length;
      const analysis = this.buildAnalysis(
        wordCount > 15 ? 'Logline present.' : 'Logline seems too short.',
        wordCount <= 15 ? ['Logline is too brief'] : [],
        wordCount <= 15 ? ['Expand to include protagonist, goal, and central conflict'] : []
      );
      return { analysis, state: this.computeState(analysis) };
    }
  }
  }
