import { OrchestratorDecision, ProjectContext, ContentPrimitive, AgentOutput } from '../../types/stageContract';
import { agentRegistry } from '../../agents/agentRegistry';

export async function dispatchToAgent(
  decision: OrchestratorDecision,
  context: ProjectContext,
  currentContent: ContentPrimitive[]
): Promise<AgentOutput> {
  const agent = await agentRegistry.get(decision.targetStage);
  if (!agent) {
    // No agent for this stage → return graceful fallback
    return {
      analysis: {
        evaluation: `No agent registered for stage "${decision.targetStage}".`,
        issues: ['No agent available'],
        recommendations: ['This stage may not support AI-assisted operations yet'],
        updatedAt: Date.now(),
      },
      content: currentContent,
      state: currentContent.length > 0 ? 'good' : 'empty',
    };
  }

  switch (decision.action) {
    case 'generate':
      return agent.generate(context);

    case 'update':
      if (!decision.targetPrimitiveId) {
        // No specific primitive → treat as generate/refine of entire stage
        return agent.generate(context);
      }
      return agent.updatePrimitive(
        decision.targetPrimitiveId,
        decision.instruction,
        currentContent,
        context
      );

    case 'evaluate': {
      const evalResult = await agent.evaluate(currentContent, context);
      return { ...evalResult, content: currentContent };
    }

    default:
      return agent.evaluate(currentContent, context).then(r => ({ ...r, content: currentContent }));
  }
}
