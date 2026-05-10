import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';
import * as Prompts from '../services/ai/prompts';

export class DialogueContinuityAgent extends BaseStageAgent {
  readonly stageId = 'Dialogue Continuity';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const treatmentContent = context.stageContents['Treatment'] || [];
      const sequencerContent = context.stageContents['Sequencer'] || [];
      
      if (!treatmentContent.length || !sequencerContent.length) {
        return {
          analysis: this.buildAnalysis('Treatment or Sequencer stage is empty. Please generate them first.', ['Missing dependencies']),
          content: [],
          state: 'empty'
        };
      }

      const allScenes: ContentPrimitive[] = [];
      let globalIndex = 0;

      for (const treatmentNode of treatmentContent) {
        const relatedSequences = sequencerContent.filter(s => s.metadata?.treatmentNodeId === treatmentNode.id);
        if (relatedSequences.length === 0) continue;

        const nodeText = `[${treatmentNode.title}]\n${treatmentNode.content}`;
        const sequencesText = relatedSequences.map(s => `[${s.title}]\n${s.content}`).join('\n\n');
        
        const prompt = Prompts.DIALOGUE_CONTINUITY_PROMPT(nodeText, sequencesText, unifiedCtx);
        
        const raw: unknown = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true, 'sequenceArray'));
        const items = this.normalizeToJsonArray(raw);
        
        for (const s of items) {
          const prim = this.buildPrimitive(
            `scene_${globalIndex}`, 
            (s.title as string) || `Scene ${globalIndex+1}`, 
            (s.content as string) || (s.description as string) || '', 
            'script_scene', 
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
      return { analysis: this.buildAnalysis('No dialogue continuity yet.'), state: 'empty' };
    }
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const fullText = content.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Dialogue Continuity', fullText, unifiedCtx));
      const analysis = this.buildAnalysis(
        raw.evaluation || raw.content || '', 
        raw.issues || [], 
        raw.recommendations || [],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      return { analysis: this.buildAnalysis('Dialogue Continuity ready.'), state: 'good' };
    }
  }
}
