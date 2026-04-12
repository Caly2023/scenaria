import { useUpdateProjectFieldMutation } from '../services/firebaseApi';
import { contextAssembler } from '../services/contextAssembler';
import { WorkflowStage, Project } from '../types';
import { agentRegistry } from '../agents/agentRegistry';
import { buildProjectContext } from '../services/orchestratorService';

export function useStageAnalysis() {
  const [updateField] = useUpdateProjectFieldMutation();

  const handleStageAnalyze = async (currentProject: Project | null, stage: WorkflowStage, setIsTyping: (val: boolean) => void) => {
    if (!currentProject) return;
    
    setIsTyping(true);
    try {
      const stageContent = await contextAssembler.getStageStructure(currentProject.id, stage);
      const agent = await agentRegistry.get(stage);
      
      if (!agent) {
        throw new Error(`No Agent registered for stage: ${stage}`);
      }

      // We need a partial ProjectContext since we only have the current stage content easily available here.
      // In a full refactor, this would receive the full Context from the orchestrator.
      const pseudoContext = buildProjectContext(
        currentProject.id, 
        currentProject.metadata, 
        { [stage]: stageContent } as any, 
        currentProject.stageAnalyses || {}
      );

      const { analysis, state } = await agent.evaluate(stageContent as any, pseudoContext);
      
      await Promise.all([
        updateField({
          id: currentProject.id,
          field: `stageAnalyses.${stage}`,
          content: analysis
        }).unwrap(),
        updateField({
          id: currentProject.id,
          field: `stageStates.${stage}`,
          content: state
        }).unwrap()
      ]);
      
    } catch (error) {
      console.error('Stage analysis failed:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return { handleStageAnalyze };
}
