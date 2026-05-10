import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Primitive, PrimitiveType } from '../primitive/Primitive';
import { ContentPrimitive, WorkflowStage } from '../../types';
import { StageDefinition } from '../../config/stageRegistry';
import { CinematicImageModal } from './CinematicImageModal';

interface PrimitiveListProps {
  primitives: ContentPrimitive[];
  stage: WorkflowStage;
  definition: StageDefinition;
  isGenerating: boolean;
  onUpdate: (stage: WorkflowStage, id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (stage: WorkflowStage, id: string) => Promise<void>;
  onAiMagic?: (id: string) => Promise<void>;
  onDeepDevelop?: (id: string) => void;
  onFocus?: (id: string) => void;
  onRegenerate: () => Promise<void>;
  onImageClick?: (url: string) => void;
  onGenerateImage?: (id: string) => Promise<void>;
  onGenerateCinematicImage?: (primitiveId: string, prompt: string, referenceImages: string[]) => Promise<string>;
  onValidateCinematicImage?: (primitiveId: string, imageUrl: string, index: number) => Promise<void>;
  onDeleteCinematicImage?: (primitiveId: string, index: number) => Promise<void>;
  lastUpdatedPrimitiveId?: string | null;
}

export const PrimitiveList: React.FC<PrimitiveListProps> = ({
  primitives,
  stage,
  definition,
  isGenerating,
  onUpdate,
  onDelete,
  onAiMagic,
  onDeepDevelop,
  onFocus,
  onRegenerate,
  onImageClick,
  onGenerateImage,
  onGenerateCinematicImage,
  onValidateCinematicImage,
  onDeleteCinematicImage,
  lastUpdatedPrimitiveId
}) => {
  const { t } = useTranslation();
  const isGallery = definition.displayMode === 'gallery';
  const isCanvas = definition.displayMode === 'canvas';
  
  const [activeModalPrimitiveId, setActiveModalPrimitiveId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <AnimatePresence mode="popLayout">
        {primitives.map((prim, index) => (
          <React.Fragment key={prim.id}>
            <Primitive
              title={isCanvas ? `${t('common.sequence')} ${index + 1}: ${prim.title || t('common.untitled')}` : prim.title}
              content={prim.content}
              type={isGallery ? 'gallery' : (prim.primitiveType || definition.primitiveTypes[0]) as PrimitiveType}
              onContentChange={(c) => onUpdate(stage, prim.id, { content: c })}
              onTitleChange={(t) => onUpdate(stage, prim.id, { title: t })}
              onDelete={isGallery ? () => onDelete(stage, prim.id) : undefined}
              onAiRefine={onAiMagic ? () => onAiMagic(prim.id) : undefined}
              onDeepDevelop={onDeepDevelop ? () => onDeepDevelop(prim.id) : undefined}
              onFocus={onFocus ? () => onFocus(prim.id) : undefined}
              onRegenerate={onRegenerate}
              onImageClick={onImageClick}
              onGenerateImage={onGenerateImage ? () => onGenerateImage(prim.id) : undefined}
              onOpenCinematicModal={() => setActiveModalPrimitiveId(prim.id)}
              images={prim.metadata?.views ? Object.values(prim.metadata.views as Record<string, string>) : ((prim.metadata?.images as string[]) || [])}
              isGenerating={isGenerating}
              mode={isGallery ? "split" : (primitives.length > 1 ? "stacked" : "single")}
              visualPrompt={prim.visualPrompt}
              referencePrompts={prim.referencePrompts}
              isUpdated={lastUpdatedPrimitiveId === prim.id}
            />
            {activeModalPrimitiveId === prim.id && onGenerateCinematicImage && onValidateCinematicImage && onDeleteCinematicImage && (
              <CinematicImageModal
                primitive={prim}
                isOpen={true}
                onClose={() => setActiveModalPrimitiveId(null)}
                onGenerate={(prompt, refs) => onGenerateCinematicImage(prim.id, prompt, refs)}
                onValidate={(url, idx) => onValidateCinematicImage(prim.id, url, idx)}
                onDelete={(idx) => onDeleteCinematicImage(prim.id, idx)}
              />
            )}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
};

