import { IStageAgent } from '../types/stageContract';

import { ProjectBriefAgent } from './ProjectBriefAgent';
import { StoryBibleAgent } from './StoryBibleAgent';
import { TreatmentAgent } from './TreatmentAgent';
import { SequencerAgent } from './SequencerAgent';
import { DialogueContinuityAgent } from './DialogueContinuityAgent';
import { FinalScreenplayAgent } from './FinalScreenplayAgent';
import { BreakdownAgent } from './BreakdownAgent';
import { stageRegistry } from '../config/stageRegistry';

type AgentFactory = () => Promise<IStageAgent>;

class AgentRegistry {
  private _agents: Map<string, AgentFactory>;
  private _instances: Map<string, IStageAgent>;

  constructor() {
    this._instances = new Map();
    this._agents = new Map<string, AgentFactory>([
      ['Project Brief',       async () => new ProjectBriefAgent()],
      ['Story Bible',         async () => new StoryBibleAgent()],
      ['Treatment',           async () => new TreatmentAgent()],
      ['Sequencer',           async () => new SequencerAgent()],
      ['Dialogue Continuity', async () => new DialogueContinuityAgent()],
      ['Final Screenplay',    async () => new FinalScreenplayAgent()],
      ['Technical Breakdown', async () => new BreakdownAgent()],
    ]);
  }

  /** Get agent for a stage. Returns null if no agent registered. */
  async get(stageId: string): Promise<IStageAgent | null> {
    if (!stageId) return null;

    let normalizedId: string = stageId;
    try {
      // Use StageRegistry's fuzzy normalization logic
      normalizedId = stageRegistry.get(stageId).id;
    } catch {
      // Fallback to literal if stageRegistry doesn't know it
      normalizedId = stageId;
    }

    if (this._instances.has(normalizedId)) {
      return this._instances.get(normalizedId)!;
    }
    const factory = this._agents.get(normalizedId);
    if (!factory) return null;
    const instance = await factory();
    this._instances.set(normalizedId, instance);
    return instance;
  }

  /** Get agent or throw — use when agent MUST exist */
  async getOrThrow(stageId: string): Promise<IStageAgent> {
    const agent = await this.get(stageId);
    if (!agent) throw new Error(`[AgentRegistry] No agent registered for stage: "${stageId}"`);
    return agent;
  }

  /** All registered stage IDs */
  getRegisteredStages(): string[] {
    return Array.from(this._agents.keys());
  }

  /** Check if a stage has an agent */
  hasAgent(stageId: string): boolean {
    return this._agents.has(stageId);
  }
}

export const agentRegistry = new AgentRegistry();
