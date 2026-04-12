import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';

export class StoryboardAgent extends BaseStageAgent {
  readonly stageId = 'Storyboard';

  async generate(context: ProjectContext): Promise<AgentOutput> {
    // Storyboard frames are manually triggered by the user — not auto-generated
    const scriptScenes = context.stageContents['Script'] || [];
    const content: ContentPrimitive[] = scriptScenes.map((scene, i) =>
      this.buildPrimitive(
        `storyboard_${i}`,
        scene.title,
        `Visual frame for: ${scene.title}`,
        'storyboard_frame',
        i,
        { visualPrompt: scene.visualPrompt || `Storyboard frame for scene: ${scene.title}` }
      )
    );
    const evalResult = await this.evaluate(content, context);
    return { ...evalResult, content };
  }

  async updatePrimitive(
    primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput> {
    const updated = currentContent.map(p =>
      p.id === primitiveId ? { ...p, content: instruction } : p
    );
    const evalResult = await this.evaluate(updated, context);
    return { ...evalResult, content: updated };
  }

  async evaluate(
    content: ContentPrimitive[],
    _context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>> {
    if (!content.length) {
      return {
        analysis: this.buildAnalysis('No storyboard frames created.', ['No visuals'], ['Generate frames from the Script stage']),
        state: 'empty',
      };
    }
    const withImages = content.filter(p => p.metadata?.imageUrl);
    const analysis = this.buildAnalysis(
      `${content.length} frame(s) defined. ${withImages.length} have generated images.`,
      content.length > withImages.length ? [`${content.length - withImages.length} frame(s) missing images`] : [],
      content.length > withImages.length ? ['Generate images for remaining frames'] : []
    );
    return { analysis, state: this.computeState(analysis) };
  }
}
