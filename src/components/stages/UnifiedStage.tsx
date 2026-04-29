import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepLayout } from './StepLayout';
import { Primitive } from '../Primitive';
import { useProject } from '@/contexts/ProjectContext';
import { StageDefinition } from '@/config/stageDefinitions';
import { ContentPrimitive } from '@/types/stageContract';

interface UnifiedStageProps {
  definition: StageDefinition;
}

export function UnifiedStage({ definition }: UnifiedStageProps) {
  const { t } = useTranslation();
  const project = useProject();
  
  const {
    currentProject,
    isTyping,
    hydrationState,
    refiningBlockId,
    lastUpdatedPrimitiveId,
    handleSubcollectionUpdate,
    handleStageValidate,
    handleStageRefine,
    handleStageAnalyze,
    onApplyFix,
    handleRegenerate,
  } = project;

  if (!currentProject) return null;

  // Get stage analysis from project
  const analysis = currentProject.stageAnalyses?.[definition.id];
  
  // Dynamically get primitives for this stage from the project context
  // This requires the ProjectContext to expose a generic way to get primitives by collection name
  // For now, we'll use a helper to map definition.id to the correct primitive list
  const getPrimitivesForStage = () => {
    switch (definition.id) {
      case 'Initial Draft': return project.draftPrimitives;
      case 'Brainstorming': return project.pitchPrimitives;
      case 'Logline': return project.loglinePrimitives;
      case '3-Act Structure': return project.structurePrimitives;
      case '8-Beat Structure': return project.beatPrimitives;
      case 'Synopsis': return project.synopsisPrimitives;
      case 'Treatment': return project.treatmentSequences;
      case 'Script': return project.scriptScenes;
      case 'Global Script Doctoring': return project.doctoringPrimitives;
      case 'Technical Breakdown': return project.breakdownPrimitives;
      case 'Visual Assets': return project.assetPrimitives;
      case 'AI Previs': return project.previsPrimitives;
      case 'Production Export': return project.exportPrimitives;
      default: return [];
    }
  };

  const primitives = getPrimitivesForStage();
  const contentPrimitives = primitives.filter(p => p.order !== 0);

  const handlePrimitiveChange = (id: string, content: string) => {
    handleSubcollectionUpdate(definition.collectionName, id, content);
  };

  return (
    <StepLayout
      stepIndex={definition.step}
      stageName={definition.id}
      title={definition.label}
      subtitle={definition.subtitle}
      insight={analysis}
      isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === definition.id)}
      isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === definition.id}
      hydrationLabel={hydrationState.hydratingStage === definition.id ? hydrationState.hydratingLabel : undefined}
      onValidate={() => handleStageValidate(definition.id)}
      onAnalyze={() => handleStageAnalyze(definition.id)}
      onApplyFix={onApplyFix}
      validateLabel={t(`stages.${definition.id}.validateLabel`, { defaultValue: t('common.validateNext') })}
    >
      <div className="space-y-8">
        {contentPrimitives.map((primitive) => (
          <Primitive
            key={primitive.id}
            title={primitive.title}
            content={primitive.content}
            type={(primitive as any).type || (definition.primitiveType as any)}
            onContentChange={(c) => handlePrimitiveChange(primitive.id, c)}
            onAiRefine={() => {
              const action = (!primitive.content || primitive.content.trim() === '' || primitive.content === '...') ? 'Generate' : 'Refine';
              handleStageRefine(definition.id, `${action} content for block: ${primitive.title}`, primitive.id);
            }}
            onRegenerate={() => handleRegenerate(definition.id)}
            isGenerating={isTyping && (refiningBlockId === primitive.id || refiningBlockId === null)}
            placeholder={t(`stages.${definition.id}.placeholder`, { defaultValue: "Commencez à écrire..." })}
            mode={contentPrimitives.length > 1 ? "stacked" : "single"}
            visualPrompt={(primitive as any).visualPrompt}
            isUpdated={lastUpdatedPrimitiveId === primitive.id}
          />
        ))}
      </div>
    </StepLayout>
  );
}
