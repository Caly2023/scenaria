/**
 * AGENT REGISTRY — Maps stage IDs to their agent instances.
 * All agents are singletons built with dynamic imports for code-splitting.
 */

import { IStageAgent } from '../types/stageContract';

type AgentFactory = () => Promise<IStageAgent>;

class AgentRegistry {
  private _agents: Map<string, AgentFactory>;
  private _instances: Map<string, IStageAgent>;

  constructor() {
    this._instances = new Map();
    this._agents = new Map<string, AgentFactory>([
      ['Project Metadata', async () => new (await import('./LoglineAgent')).LoglineAgent()], // Placeholder
      ['Initial Draft',    async () => new (await import('./LoglineAgent')).LoglineAgent()], // Placeholder
      ['Brainstorming',    async () => new (await import('./BrainstormingAgent')).BrainstormingAgent()],
      ['Logline',          async () => new (await import('./LoglineAgent')).LoglineAgent()],
      ['3-Act Structure',  async () => new (await import('./StructureAgent')).StructureAgent()],
      ['8-Beat Structure', async () => new (await import('./StructureAgent')).StructureAgent()], // Placeholder
      ['Synopsis',         async () => new (await import('./SynopsisAgent')).SynopsisAgent()],
      ['Character Bible',  async () => new (await import('./CharacterBibleAgent')).CharacterBibleAgent()],
      ['Location Bible',   async () => new (await import('./LocationBibleAgent')).LocationBibleAgent()],
      ['Treatment',        async () => new (await import('./TreatmentAgent')).TreatmentAgent()],
      ['Step Outline',     async () => new (await import('./StepOutlineAgent')).StepOutlineAgent()],
      ['Script',           async () => new (await import('./ScriptAgent')).ScriptAgent()],
      ['Global Script Doctoring', async () => new (await import('./ScriptAgent')).ScriptAgent()], // Placeholder
      ['Technical Breakdown',     async () => new (await import('./ScriptAgent')).ScriptAgent()], // Placeholder
      ['Visual Assets',           async () => new (await import('./CharacterBibleAgent')).CharacterBibleAgent()], // Placeholder
      ['AI Previs',               async () => new (await import('./LoglineAgent')).LoglineAgent()], // Placeholder
      ['Production Export',       async () => new (await import('./LoglineAgent')).LoglineAgent()], // Placeholder
    ]);
  }

  /** Get agent for a stage. Returns null if no agent registered. */
  async get(stageId: string): Promise<IStageAgent | null> {
    if (this._instances.has(stageId)) {
      return this._instances.get(stageId)!;
    }
    const factory = this._agents.get(stageId);
    if (!factory) return null;
    const instance = await factory();
    this._instances.set(stageId, instance);
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
