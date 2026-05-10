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
      
      const raw: unknown = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true));
      const res = raw as Record<string, unknown>;
      const rawChars = this.normalizeToJsonArray(res.characters);
      const rawLocs = this.normalizeToJsonArray(res.locations);
      
      const content: ContentPrimitive[] = [];
      
      rawChars.forEach((c, i) => {
        content.push(this.buildPrimitive(
          `char_${i}`, 
          (c.name as string) || (c.title as string) || `Character ${i+1}`,
          (c.description as string) || (c.content as string) || "",
          'character',
          i,
          { tier: c.tier, visualPrompt: c.visualPrompt } as Record<string, unknown>
        ));
      });
      
      rawLocs.forEach((l, i) => {
        content.push(this.buildPrimitive(
          `loc_${i}`, 
          (l.name as string) || (l.title as string) || `Location ${i+1}`,
          (l.description as string) || (l.content as string) || (l.atmosphere as string) || "",
          'location',
          rawChars.length + i,
          { visualPrompt: l.visualPrompt } as Record<string, unknown>
        ));
      });

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
