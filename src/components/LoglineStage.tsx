import { useTranslation } from 'react-i18next';
import { Primitive } from './Primitive';
import { StepLayout } from './StepLayout';
import { StageInsight } from '../types';
import { StageAnalysis } from '../types/stageContract';

interface LoglineStageProps {
  content: string;
  onContentChange: (content: string) => void;
  onValidate: () => void;
  isGenerating?: boolean;
  insight?: StageInsight | StageAnalysis;
}

export function LoglineStage({ 
  content, 
  onContentChange, 
  onValidate,
  isGenerating = false,
  insight
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
      validateLabel={t('stages.Logline.validateLabel')}
    >
      <Primitive
        title={t('stages.Logline.label')}
        content={content}
        onContentChange={onContentChange}
        isGenerating={isGenerating}
        placeholder={t('stages.Logline.placeholder')}
        mode="single"
      />
    </StepLayout>
  );
}
