import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StepLayout } from './StepLayout';
import { Primitive } from '../Primitive';
import { useProject } from '@/contexts/ProjectContext';
import { StageDefinition } from '@/config/stageRegistry';
import { ContentPrimitive } from '@/types/stageContract';

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
    refiningBlockId,
    lastUpdatedPrimitiveId,
    handleSubcollectionUpdate,
    handleStageValidate,
    handleStageRefine,
    handleStageAnalyze,
    onApplyFix,
    handleRegenerate,
    handlePrimitiveAdd,
    handlePrimitiveDelete,
    handleGenerateViews,
    handleCharacterDeepDevelop,
    handleLocationDeepDevelop,
  } = project;

  if (!currentProject) return null;

  // Get stage analysis from project
  const analysis = currentProject.stageAnalyses?.[definition.id];
  
  // Dynamically get primitives for this stage from the project context
  const primitives = project.stageContents[definition.id] || [];
  const contentPrimitives = primitives.filter(p => p.order !== 0);

  const handlePrimitiveChange = (id: string, content: string) => {
    handleSubcollectionUpdate(definition.collectionName, id, { content });
  };

  const handleTitleChange = (id: string, title: string) => {
    handleSubcollectionUpdate(definition.collectionName, id, { title });
  };

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
        <AnimatePresence mode="popLayout">
          {contentPrimitives.map((primitive, index) => (
            <Primitive
              key={primitive.id}
              title={isCanvas ? `${t('common.sequence')} ${index + 1}: ${primitive.title || t('common.untitled')}` : primitive.title}
              content={primitive.content}
              type={isGallery ? 'gallery' : (primitive.primitiveType || definition.primitiveTypes[0]) as any}
              onContentChange={(c) => handlePrimitiveChange(primitive.id, c)}
              onTitleChange={(title) => handleTitleChange(primitive.id, title)}
              onAiRefine={() => {
                if (isCanvas) {
                  project.handleAiMagic(primitive.id);
                } else {
                  const action = (!primitive.content || primitive.content.trim() === '' || primitive.content === '...') ? 'Generate' : 'Refine';
                  handleStageRefine(definition.id, `${action} content for: ${primitive.title}`, primitive.id);
                }
              }}
              onFocus={isCanvas ? () => project.handleFocusMode(primitive.id) : undefined}
              onRegenerate={() => handleRegenerate(definition.id)}
              onDelete={isGallery ? () => handlePrimitiveDelete(definition.id, primitive.id) : undefined}
              onGenerateImage={isGallery ? () => handleGenerateViews(primitive.id) : undefined}
              onDeepDevelop={isGallery ? () => {
                if (definition.id === 'Character Bible') handleCharacterDeepDevelop(primitive.id, 'Character Bible');
                if (definition.id === 'Location Bible') handleLocationDeepDevelop(primitive.id, 'Location Bible');
              } : undefined}
              images={primitive.metadata?.views ? Object.values(primitive.metadata.views) as string[] : []}
              onImageClick={setFullscreenImage}
              isGenerating={isTyping && (refiningBlockId === primitive.id || refiningBlockId === null)}
              placeholder={t(`stages.${definition.id}.placeholder`, { defaultValue: "Commencez à écrire..." })}
              mode={isGallery ? "split" : (contentPrimitives.length > 1 ? "stacked" : "single")}
              visualPrompt={primitive.visualPrompt}
              isUpdated={lastUpdatedPrimitiveId === primitive.id}
            />
          ))}
        </AnimatePresence>

        {canAdd && (
          <button 
            onClick={() => handlePrimitiveAdd(definition.id, { 
              title: isCanvas ? t('common.newSequenceLabel') : t(`common.new${definition.id.includes('Character') ? 'Character' : 'Location'}`), 
              content: '',
              order: contentPrimitives.length + 1
            })}
            className="w-full py-12 rounded-[32px] bg-surface/30 hover:bg-surface/50 transition-all flex flex-col items-center justify-center gap-3 group border-2 border-dashed border-white/5"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
              <Plus className="w-6 h-6 text-white/20 group-hover:text-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/20 group-hover:text-white/40">
              {isCanvas ? t('common.addNewSequence') : t(`common.addNew${definition.id.includes('Character') ? 'Character' : 'Location'}`)}
            </span>
          </button>
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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StepLayout>
  );
}
