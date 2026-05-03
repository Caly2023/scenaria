import { IStageAgent } from '../types/stageContract';
import { DraftAgent } from './DraftAgent';
import { MetadataAgent } from './MetadataAgent';
import { BrainstormingAgent } from './BrainstormingAgent';
import { LoglineAgent } from './LoglineAgent';
import { StructureAgent } from './StructureAgent';
import { SynopsisAgent } from './SynopsisAgent';
import { CharacterBibleAgent } from './CharacterBibleAgent';
import { LocationBibleAgent } from './LocationBibleAgent';
import { TreatmentAgent } from './TreatmentAgent';
import { StepOutlineAgent } from './StepOutlineAgent';
import { ScriptAgent } from './ScriptAgent';
import { BreakdownAgent } from './BreakdownAgent';
import { AssetAgent } from './AssetAgent';
import { PrevisAgent } from './PrevisAgent';
import { ExportAgent } from './ExportAgent';
import { Structure8BeatAgent } from './Structure8BeatAgent';
import { GlobalScriptDoctorAgent } from './GlobalScriptDoctorAgent';
import { stageRegistry } from '../config/stageRegistry';

type AgentFactory = () => Promise<IStageAgent>;

class AgentRegistry {
  private _agents: Map<string, AgentFactory>;
  private _instances: Map<string, IStageAgent>;

  constructor() {
    this._instances = new Map();
    this._agents = new Map<string, AgentFactory>([
      ['Project Metadata', async () => new MetadataAgent()],
      ['Initial Draft',    async () => new DraftAgent()],
      ['Brainstorming',    async () => new BrainstormingAgent()],
      ['Logline',          async () => new LoglineAgent()],
      ['3-Act Structure',  async () => new StructureAgent()],
      ['8-Beat Structure', async () => new Structure8BeatAgent()],
      ['Synopsis',         async () => new SynopsisAgent()],
      ['Character Bible',  async () => new CharacterBibleAgent()],
      ['Location Bible',   async () => new LocationBibleAgent()],
      ['Treatment',        async () => new TreatmentAgent()],
      ['Step Outline',     async () => new StepOutlineAgent()],
      ['Script',           async () => new ScriptAgent()],
      ['Global Script Doctoring', async () => new GlobalScriptDoctorAgent()],
      ['Technical Breakdown',     async () => new BreakdownAgent()],
      ['Visual Assets',           async () => new AssetAgent()],
      ['AI Previs',               async () => new PrevisAgent()],
      ['Production Export',       async () => new ExportAgent()],
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
