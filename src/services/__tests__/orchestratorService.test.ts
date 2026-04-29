import { describe, it, expect, vi, beforeEach } from 'vitest';
import { interpretIntent } from '../orchestrator';
import { stageRegistry } from '../../config/stageRegistry';

vi.mock('../../config/stageRegistry', () => ({
  stageRegistry: {
    getAll: vi.fn(),
    get: vi.fn(),
  }
}));

describe('orchestratorService - interpretIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly defaults action to evaluate', () => {
    const decision = interpretIntent('Tell me about my project', 'Brainstorming');
    expect(decision.action).toBe('evaluate');
  });

  it('correctly maps generation keywords to generate action', () => {
    const decision = interpretIntent('Generate a new logline', 'Brainstorming');
    expect(decision.action).toBe('generate');
  });

  it('correctly maps update keywords to update action', () => {
    const decision = interpretIntent('Rewrite the first beat', '3-Act Structure');
    expect(decision.action).toBe('update');
  });

  it('correctly resolves explicit target stage based on registry definitions', () => {
    (stageRegistry.getAll as any).mockReturnValue([
      { id: 'Script', name: 'Script' }
    ]);
    const decision = interpretIntent('Rewrite the Script', 'Brainstorming');
    expect(decision.targetStage).toBe('Script');
  });
});
