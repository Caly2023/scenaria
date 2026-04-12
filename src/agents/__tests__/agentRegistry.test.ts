import { describe, it, expect, vi } from 'vitest';
import { agentRegistry } from '../agentRegistry';
import { IStageAgent } from '../../types/stageContract';

describe('agentRegistry', () => {
  it('instantiates all registered agents automatically with async lazy imports', async () => {
    const stages = agentRegistry.getRegisteredStages();
    expect(stages.length).toBeGreaterThan(0);
    // Spot check one of the agents dynamically
    const agent = await agentRegistry.get('Brainstorming');
    expect(agent).not.toBeNull();
    expect(agent?.stageId).toBe('Brainstorming');
  });

  it('getOrThrow fails gracefully for unknown stages', async () => {
    await expect(agentRegistry.getOrThrow('NonExistentStage')).rejects.toThrowError(/No agent registered for stage/);
  });

  it('keeps singletons cached', async () => {
    const firstCall = await agentRegistry.get('Logline');
    const secondCall = await agentRegistry.get('Logline');
    expect(firstCall).toBe(secondCall); // Should be exact same reference
  });
});
