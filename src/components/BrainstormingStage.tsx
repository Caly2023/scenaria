import { useTranslation } from 'react-i18next';
import { StepLayout } from './StepLayout';
import { Primitive } from './Primitive';
import { StageInsight } from '@/types';
import { StageAnalysis } from '@/types/stageContract';

interface BrainstormingStageProps {
  analysis: string;
  story: string;
  onStoryChange: (content: string) => void;
  onValidate: () => void;
  onDoctorToggle: () => void;
  isGenerating: boolean;
  insight?: StageInsight | StageAnalysis;
  onAnalyze?: () => void | Promise<void>;
  onApplyFix?: (prompt: string) => void;
}

export function BrainstormingStage({ 
  analysis, 
  story, 
  onStoryChange, 
  onValidate,
  isGenerating,
  insight,
  onAnalyze,
  onApplyFix
}: BrainstormingStageProps) {
  const { t } = useTranslation();

  return (
    <StepLayout
      stepIndex={1}
      stageName="Brainstorming"
      title={t('stages.Brainstorming.title')}
      subtitle={t('stages.Brainstorming.subtitle')}
      insight={insight}
      isGenerating={isGenerating}
      onValidate={onValidate}
      onAnalyze={onAnalyze}
      onApplyFix={onApplyFix}
      validateLabel={t('stages.Brainstorming.validateLabel', { defaultValue: 'Passer à l\'étape suivante' })}
    >
      <div className="grid grid-cols-1 gap-8">
        {/* Primitive A: User Input (pitch_result) */}
        <Primitive
          title="Primitive A: User Input"
          content={story}
          type="pitch_result"
          onContentChange={onStoryChange}
          onAiRefine={() => {}} // Refine is handled by global input
          isGenerating={isGenerating}
          placeholder="Your story idea..."
          mode="stacked"
        />

        {/* Primitive B: AI Analysis (analysis_block) */}
        <Primitive
          title="Primitive B: AI Analysis"
          content={analysis || "AI is analyzing your story..."}
          type="analysis_block"
          onContentChange={() => {}} // Read-only
          onAiRefine={() => {}} // No refine for analysis
          isGenerating={isGenerating}
          placeholder="AI is analyzing your story..."
          mode="stacked"
        />
      </div>
    </StepLayout>
  );
}
