import { useTranslation } from 'react-i18next';
import { Primitive } from './Primitive';
import { StepLayout } from './StepLayout';
import { StageInsight } from '../types';
import { StageAnalysis } from '../types/stageContract';

interface LoglineStageProps {
  content: string;
  onContentChange: (content: string) => void;
  onValidate: () => void;
  onRefine: (feedback: string, blockId?: string) => void;
  primitiveId?: string;
  isGenerating?: boolean;
  insight?: StageInsight | StageAnalysis;
  onAnalyze?: () => void | Promise<void>;
  onApplyFix?: (prompt: string) => void;
}

export function LoglineStage({ 
  content, 
  onContentChange, 
  onValidate,
  onRefine,
  primitiveId,
  isGenerating = false,
  insight,
  onAnalyze,
  onApplyFix
}: LoglineStageProps) {
  const { t } = useTranslation();

  return (
    <StepLayout
      stepIndex={2}
      stageName="Logline"
      title={t('stages.Logline.title')}
      subtitle={t('stages.Logline.subtitle', { defaultValue: 'Synthesize your story into a single, compelling sentence.' })}
      insight={insight}
      isGenerating={isGenerating}
      onValidate={onValidate}
      onAnalyze={onAnalyze}
      onApplyFix={onApplyFix}
      validateLabel={t('stages.Logline.validateLabel')}
    >
      <Primitive
        id={primitiveId}
        title={t('stages.Logline.label')}
        content={content}
        onContentChange={onContentChange}
        onAiRefine={() => {
          const action = (!content || content.trim() === '' || content === '...') ? 'Generate' : 'Refine';
          onRefine(`${action} logline`, primitiveId);
        }}
        isGenerating={isGenerating}
        placeholder={t('stages.Logline.placeholder')}
        mode="single"
      />
    </StepLayout>
  );
}
