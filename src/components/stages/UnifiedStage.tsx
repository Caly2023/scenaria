import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StepLayout } from './StepLayout';
import { useProject } from '@/contexts/ProjectContext';
import { StageDefinition } from '@/config/stageRegistry';
import { PrimitiveList } from './PrimitiveList';
import { PrimitiveAddButton } from './PrimitiveAddButton';

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
    hydrationState,
    lastUpdatedPrimitiveId,
    handleStageValidate,
    handleStageRefine,
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

      {/* Lightbox */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-12"
            onClick={() => setFullscreenImage(null)}
          >
            <button className="absolute top-12 right-12 p-4 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all">
              <X className="w-8 h-8" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={fullscreenImage} 
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
              alt="Fullscreen character view"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StepLayout>
  );
}
