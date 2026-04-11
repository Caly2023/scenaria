import { useUpdateProjectFieldMutation } from '../services/firebaseApi';
import { geminiService } from '../services/geminiService';
import { contextAssembler } from '../services/contextAssembler';
import { WorkflowStage, Project } from '../types';

export function useStageAnalysis() {
  const [updateField] = useUpdateProjectFieldMutation();

  const handleStageAnalyze = async (currentProject: Project | null, stage: WorkflowStage, setIsTyping: (val: boolean) => void) => {
    if (!currentProject) return;
    
    setIsTyping(true);
    try {
      const stageContent = await contextAssembler.getStageStructure(currentProject.id, stage);
      const contentText = stageContent.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
      const projectContext = currentProject.pitch_result || '';
      
      const insight = await geminiService.generateStageInsight(stage, contentText, projectContext);
      
      await updateField({
        id: currentProject.id,
        field: `insights.${stage}`,
        content: {
          ...insight,
          updatedAt: Date.now()
        }
      }).unwrap();
      
    } catch (error) {
      console.error('Stage analysis failed:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return { handleStageAnalyze };
}
