import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';

export class StoryBibleAgent extends BaseStageAgent {
  readonly stageId = 'Story Bible';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      
      // Extract characters and locations simultaneously with full development depth
      const prompt = `You are a senior story development specialist tasked with building a complete Story Bible from a Project Brief.

## MISSION
Analyse the Project Brief IN ITS ENTIRETY (including the logline, the synopsis, and any production notes) and produce a fully developed Story Bible.
Every element you create MUST be directly anchored to and consistent with all the metadata and documents provided in the Project Brief. Do not ignore the production notes if they exist.

## OUTPUT FORMAT
Return a single JSON object with exactly two keys: "characters" and "locations".

### CHARACTERS ARRAY
For EACH main and secondary character, provide ALL of the following fields:
- name: Full character name (consistent with the brief)
- role: Their narrative function (protagonist, antagonist, mentor, foil, etc.)
- age: Approximate age or age range
- description: A rich, highly detailed paragraph describing their PHYSICAL APPEARANCE (face, body, clothes, distinct features), their mannerisms, and the first impression they give. A PHYSICAL DESCRIPTION IS MANDATORY.
- backstory: Their history BEFORE the story begins — formative events, traumas, relationships that shaped them
- desire: What they consciously WANT in this story (external goal)
- wound: Their deep psychological wound or unresolved trauma
- flaw: Their principal character flaw that creates conflict
- arc: Their transformation arc from story start to end (or confirmation of worldview if flat arc)
- voice: How they speak — vocabulary, rhythm, verbal tics, what they avoid saying
- relationships: Key relationships to other characters and how those relationships drive the plot
- visualPrompt: A concise, evocative image-generation prompt describing their visual appearance for AI art generation
- tier: "main" | "secondary" | "minor"

### LOCATIONS ARRAY
For EACH key location, provide ALL of the following fields:
- name: The location's name or designation
- type: Interior/Exterior, Urban/Rural, Real/Fantastical, etc.
- description: A rich paragraph describing the physical space in concrete, sensory detail. Describe the architecture, the objects, the colors, and the general physical layout. A PHYSICAL DESCRIPTION IS MANDATORY.
- atmosphere: The emotional and tonal quality of the space — light, sound, smell, temperature, feel
- symbolism: What this location represents thematically in the story
- narrativeRole: The narrative function this location serves (inciting incident, climax, refuge, trap, etc.)
- timeOfDay: Typical time of day or lighting conditions when it appears
- visualPrompt: A concise, evocative image-generation prompt for AI art generation

## ALIGNMENT RULES (CRITICAL)
1. Every character's desire, flaw, and arc MUST connect to the story's central conflict from the logline.
2. Every location's symbolism MUST reflect the story's genre and themes from the synopsis.
3. The tone of ALL descriptions (dark, lyrical, clinical, comedic, etc.) MUST match the production notes.
4. Character relationships MUST be consistent with the synopsis — no contradictions.
5. Do NOT invent characters or locations that have no basis in the brief.
6. Ensure at minimum: 1 protagonist, 1 antagonist or force of opposition, and 2 key locations.
7. INTEGRATE ALL METADATA: You must strictly incorporate the logline, synopsis, and any provided production notes into the development of these characters and locations.

## PROJECT CONTEXT
${unifiedCtx}`;
      
      const raw: unknown = await this.retryWithBackoff(() => geminiService.genericGeminiRequest(prompt, true));
      const res = raw as Record<string, unknown>;
      const rawChars = this.normalizeToJsonArray(res.characters);
      const rawLocs = this.normalizeToJsonArray(res.locations);
      
      const content: ContentPrimitive[] = [];
      
      rawChars.forEach((c, i) => {
        // Build rich description combining all narrative fields
        const richDescription = [
          c.description,
          c.backstory ? `**Backstory:** ${c.backstory}` : null,
          c.desire    ? `**Desire:** ${c.desire}` : null,
          c.wound     ? `**Wound:** ${c.wound}` : null,
          c.flaw      ? `**Flaw:** ${c.flaw}` : null,
          c.arc       ? `**Arc:** ${c.arc}` : null,
          c.voice     ? `**Voice:** ${c.voice}` : null,
          c.relationships ? `**Relationships:** ${c.relationships}` : null,
        ].filter(Boolean).join('\n\n');

        content.push(this.buildPrimitive(
          `char_${i}`,
          (c.name as string) || (c.title as string) || `Character ${i+1}`,
          (richDescription as string) || (c.content as string) || "",
          'character',
          i,
          {
            tier:          c.tier,
            visualPrompt:  c.visualPrompt,
            age:           c.age,
            role:          c.role,
            backstory:     c.backstory,
            desire:        c.desire,
            wound:         c.wound,
            flaw:          c.flaw,
            arc:           c.arc,
            voice:         c.voice,
            relationships: c.relationships,
          } as Record<string, unknown>
        ));
      });
      
      rawLocs.forEach((l, i) => {
        // Build rich description combining all spatial/narrative fields
        const richDescription = [
          l.description,
          l.atmosphere    ? `**Atmosphere:** ${l.atmosphere}` : null,
          l.symbolism     ? `**Symbolism:** ${l.symbolism}` : null,
          l.narrativeRole ? `**Narrative Role:** ${l.narrativeRole}` : null,
          l.timeOfDay     ? `**Time of Day:** ${l.timeOfDay}` : null,
        ].filter(Boolean).join('\n\n');

        content.push(this.buildPrimitive(
          `loc_${i}`,
          (l.name as string) || (l.title as string) || `Location ${i+1}`,
          (richDescription as string) || (l.content as string) || (l.atmosphere as string) || "",
          'location',
          rawChars.length + i,
          {
            visualPrompt:  l.visualPrompt,
            type:          l.type,
            atmosphere:    l.atmosphere,
            symbolism:     l.symbolism,
            narrativeRole: l.narrativeRole,
            timeOfDay:     l.timeOfDay,
          } as Record<string, unknown>
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
      const charSummary = chars.map(c => {
        const arc  = (c as unknown as Record<string, unknown>).arc  as string | undefined;
        const role = (c as unknown as Record<string, unknown>).role as string | undefined;
        return `${c.title}${role ? ` (${role})` : ''}${arc ? ` — arc: ${arc}` : ''}`;
      }).join(' | ');
      const locSummary = locs.map(l => {
        const sym = (l as unknown as Record<string, unknown>).symbolism as string | undefined;
        return `${l.title}${sym ? ` [${sym}]` : ''}`;
      }).join(' | ');
      const summary = `CHARACTERS: ${charSummary}\nLOCATIONS: ${locSummary}`;
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
