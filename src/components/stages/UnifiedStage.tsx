import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { StepLayout } from './StepLayout';
import { useProject } from '@/contexts/ProjectContext';
import { StageDefinition } from '@/config/stageRegistry';
import { PrimitiveList } from './PrimitiveList';
import { PrimitiveAddButton } from './PrimitiveAddButton';
import { Lightbox } from '../ui/Lightbox';

interface UnifiedStageProps {
  definition: StageDefinition;
}

export function UnifiedStage({ definition }: UnifiedStageProps) {
  const { t } = useTranslation();
  const project = useProject();
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
  const {
    currentProject,
    isTyping,
    isStageLoading,
    hydrationState,
    lastUpdatedPrimitiveId,
    handleStageValidate,
    handleStageAnalyze,
    onApplyFix,
    handleRegenerate,
    handlePrimitiveAdd,
    handlePrimitiveUpdate,
    handlePrimitiveDelete,
    handleAiMagic,
    handleCharacterDeepDevelop,
    handleLocationDeepDevelop,
    handleFocusMode
  } = project;

  if (!currentProject) return null;
  
  if (isStageLoading && !project.stageContents[definition.id]?.length) {
    return <div className="flex-1 flex items-center justify-center py-20"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full" /></div>;
  }

  const analysis = currentProject.stageAnalyses?.[definition.id];
  const primitives = project.stageContents[definition.id] || [];
  const contentPrimitives = primitives.filter(p => p.order !== 0);

  const isGallery = definition.displayMode === 'gallery';
  const isCanvas = definition.displayMode === 'canvas';
  const canAdd = isGallery || isCanvas;

  return (
    <StepLayout
      stepIndex={definition.order + 1}
      stageName={definition.id}
      title={definition.name}
      subtitle={definition.description}
      insight={analysis}
      isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === definition.id)}
      isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === definition.id}
      hydrationLabel={hydrationState.hydratingStage === definition.id ? hydrationState.hydratingLabel : undefined}
      onValidate={() => handleStageValidate(definition.id)}
      onAnalyze={() => handleStageAnalyze(definition.id)}
      onApplyFix={onApplyFix}
      validateLabel={t(`stages.${definition.id}.validateLabel`, { defaultValue: t('common.validateNext') })}
    >
      <div className="space-y-8 pb-20">
        <PrimitiveList
          primitives={contentPrimitives}
          stage={definition.id}
          definition={definition}
          isGenerating={isTyping}
          onUpdate={handlePrimitiveUpdate}
          onDelete={handlePrimitiveDelete}
          onAiMagic={handleAiMagic}
          onRegenerate={() => handleRegenerate(definition.id)}
          onImageClick={setFullscreenImage}
          onDeepDevelop={isGallery ? (id) => {
            if (definition.id === 'Character Bible') handleCharacterDeepDevelop(id, 'Character Bible');
            if (definition.id === 'Location Bible') handleLocationDeepDevelop(id, 'Location Bible');
          } : undefined}
          onFocus={isCanvas ? handleFocusMode : undefined}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
        />

        {canAdd && (
          <PrimitiveAddButton 
            stage={definition.id}
            definition={definition}
            onAdd={handlePrimitiveAdd}
            contentCount={contentPrimitives.length}
          />
        )}
      </div>

      <Lightbox 
        image={fullscreenImage} 
        onClose={() => setFullscreenImage(null)} 
        alt="Fullscreen character view"
      />
    </StepLayout>
  );
}
