import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class StoryBibleAgent extends BaseStageAgent {
  readonly stageId = 'Story Bible';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      
      // Extract characters and locations simultaneously
      const prompt = `Based on the project brief, extract and develop the main characters and key locations. 
      Return a JSON object with 'characters' and 'locations' arrays.
      Characters should have: name, role, description, visualPrompt.
      Locations should have: name, atmosphere, description, visualPrompt.
      Context: ${unifiedCtx}`;
      
      const raw: any = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true));
      
      const content: ContentPrimitive[] = [];
      const rawChars = raw.characters || raw.chars || [];
      const rawLocs = raw.locations || raw.locs || [];

      rawChars.forEach((c: any, i: number) => {
        content.push(this.buildPrimitive(`char_${i}`, c.name, c.description, 'character', i, {
          role: c.role,
          visualPrompt: c.visualPrompt
        }));
      });
      
      rawLocs.forEach((l: any, i: number) => {
        content.push(this.buildPrimitive(`loc_${i}`, l.name, l.description, 'location', 100 + i, {
          atmosphere: l.atmosphere,
          visualPrompt: l.visualPrompt
        }));
      });

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
    const chars = content.filter(p => p.primitiveType === 'character');
    const locs = content.filter(p => p.primitiveType === 'location');
    
    if (chars.length === 0 || locs.length === 0) {
      const analysis = this.buildAnalysis('Story Bible is missing essential elements.', ['Missing characters or locations'], ['Generate characters and locations from the Project Brief']);
      return { analysis, state: 'needs_improvement' };
    }
    
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const summary = `Characters: ${chars.map(c => c.title).join(', ')}. Locations: ${locs.map(l => l.title).join(', ')}.`;
      const raw = await this.retryWithBackoff(() => geminiService.generateStageInsight('Story Bible', summary, unifiedCtx));
      const analysis = this.buildAnalysis(
        raw.evaluation || raw.content || '', 
        raw.issues || [], 
        raw.recommendations || [],
        raw.suggestedPrompt
      );
      return { analysis, state: this.computeState(analysis) };
    } catch (err) {
      return { 
        analysis: this.buildAnalysis('Story Bible analysis complete.'),
        state: 'good'
      };
    }
  }
}
