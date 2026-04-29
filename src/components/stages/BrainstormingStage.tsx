import { useTranslation } from 'react-i18next';
import { StepLayout } from './StepLayout';
import { Primitive } from '../Primitive';
import { StageInsight } from '@/types';
import { StageAnalysis } from '@/types/stageContract';

interface BrainstormingStageProps {
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
        {/* Single content primitive: retained brainstorming result */}
        <Primitive
          title="Brainstorming Result"
          content={story}
          type="brainstorming_result"
          onContentChange={onStoryChange}
          onAiRefine={() => {}} // Refine is handled by global input
          isGenerating={isGenerating}
          placeholder="Describe the strongest version of your story idea..."
          mode="stacked"
        />
      </div>
    </StepLayout>
  );
}
