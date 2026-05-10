import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';
import * as Prompts from '../services/ai/prompts';

export class SequencerAgent extends BaseStageAgent {
  readonly stageId = 'Sequencer';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const treatmentContent = context.stageContents['Treatment'] || [];
      
      if (!treatmentContent.length) {
        return {
          analysis: this.buildAnalysis('Treatment stage is empty. Please generate treatment first.', ['Missing treatment']),
          content: [],
          state: 'empty'
        };
      }

      const allScenes: ContentPrimitive[] = [];
      let globalIndex = 0;

      for (const treatmentNode of treatmentContent) {
        const nodeText = `[${treatmentNode.title}]\n${treatmentNode.content}`;
        const prompt = Prompts.SEQUENCER_PROMPT(nodeText, unifiedCtx);
        
        const raw: unknown = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true, 'sequenceArray'));
        const items = this.normalizeToJsonArray(raw);
        
        for (const s of items) {
          const prim = this.buildPrimitive(
            `seq_${globalIndex}`, 
            (s.title as string) || `Sequence ${globalIndex+1}`, 
            (s.content as string) || (s.description as string) || '', 
            'sequence', 
            globalIndex,
            {
              metadata: {
                treatmentNodeId: treatmentNode.id,
                emotionalShift: s.emotionalShift,
                conflict: s.conflict,
                visualFocus: s.visualFocus,
                characterIds: s.characterIds,
                locationIds: s.locationIds
              }
            }
          );
          allScenes.push(prim);
          globalIndex++;
        }
      }

      const evalResult = await this.evaluate(allScenes, context);
      return { ...evalResult, content: allScenes };
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
    } catch (e: unknown) {
      return this.handleError(e, currentContent);
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
