import { describe, it, expect } from 'vitest';
import { agentRegistry } from '../agentRegistry';

describe('agentRegistry', () => {
  it('instantiates all registered agents automatically with async lazy imports', async () => {
    const stages = agentRegistry.getRegisteredStages();
    expect(stages.length).toBeGreaterThan(0);
    // Spot check one of the agents dynamically
    const agent = await agentRegistry.get('Project Brief');
    expect(agent).not.toBeNull();
    expect(agent?.stageId).toBe('Project Brief');
  });

  it('getOrThrow fails gracefully for unknown stages', async () => {
    await expect(agentRegistry.getOrThrow('NonExistentStage')).rejects.toThrowError(/No agent registered for stage/);
  });

  it('keeps singletons cached', async () => {
    const firstCall = await agentRegistry.get('Story Bible');
    const secondCall = await agentRegistry.get('Story Bible');
    expect(firstCall).toBe(secondCall); // Should be exact same reference
  });
});
