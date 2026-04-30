import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Primitive } from '../primitive/Primitive';
import { ContentPrimitive, WorkflowStage, StageDefinition } from '../../types';

interface PrimitiveListProps {
  primitives: ContentPrimitive[];
  stage: WorkflowStage;
  definition: StageDefinition;
  isGenerating: boolean;
  onUpdate: (stage: WorkflowStage, id: string, updates: any) => Promise<void>;
  onDelete: (stage: WorkflowStage, id: string) => Promise<void>;
  onAiMagic?: (id: string) => Promise<void>;
  onDeepDevelop?: (id: string) => void;
  onFocus?: (id: string) => void;
  onRegenerate: () => Promise<void>;
  onImageClick?: (url: string) => void;
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
  lastUpdatedPrimitiveId
}) => {
  const { t } = useTranslation();
  const isGallery = definition.displayMode === 'gallery';
  const isCanvas = definition.displayMode === 'canvas';

  return (
    <div className="space-y-8">
      <AnimatePresence mode="popLayout">
        {primitives.map((prim, index) => (
          <Primitive
            key={prim.id}
            title={isCanvas ? `${t('common.sequence')} ${index + 1}: ${prim.title || t('common.untitled')}` : prim.title}
            content={prim.content}
            type={isGallery ? 'gallery' : (prim.primitiveType || definition.primitiveTypes[0]) as any}
            onContentChange={(c) => onUpdate(stage, prim.id, { content: c })}
            onTitleChange={(t) => onUpdate(stage, prim.id, { title: t })}
            onDelete={isGallery ? () => onDelete(stage, prim.id) : undefined}
            onAiRefine={onAiMagic ? () => onAiMagic(prim.id) : undefined}
            onDeepDevelop={onDeepDevelop ? () => onDeepDevelop(prim.id) : undefined}
            onFocus={onFocus ? () => onFocus(prim.id) : undefined}
            onRegenerate={onRegenerate}
            onImageClick={onImageClick}
            images={prim.metadata?.views ? Object.values(prim.metadata.views) as string[] : prim.images}
            isGenerating={isGenerating}
            mode={isGallery ? "split" : (primitives.length > 1 ? "stacked" : "single")}
            visualPrompt={prim.visualPrompt}
            isUpdated={lastUpdatedPrimitiveId === prim.id}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

