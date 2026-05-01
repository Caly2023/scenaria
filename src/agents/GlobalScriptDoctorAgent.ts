import { ScriptAgent } from './ScriptAgent';
import { WorkflowStage } from '../types';

export class GlobalScriptDoctorAgent extends ScriptAgent {
  readonly stageId: WorkflowStage = 'Global Script Doctoring';
}
