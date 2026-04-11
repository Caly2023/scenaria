import React, { useState } from 'react';
import { Primitive } from './Primitive';
import { Check, Send, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StepLayout } from './StepLayout';
import { StageInsight } from '@/types';
interface Block {
  id: string;
  title: string;
  content: string;
  type?: 'text' | 'analysis' | 'gallery';
  visualPrompt?: string;
}

interface WorkflowStageProps {
  stage: string;
  step: number;
  title: string;
  subtitle: string;
  content: string;
  items?: any[];
  onContentChange: (content: string) => void;
  onItemChange?: (id: string, content: string) => void;
  onValidate: () => void;
  onRefine: (feedback: string, blockId?: string) => void;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  isHydrating?: boolean;
  hydrationLabel?: string | null;
  refiningBlockId?: string | null;
  placeholder?: string;
  validateLabel?: string;
  lastUpdatedPrimitiveId?: string | null;
  insight?: StageInsight;
}

export function WorkflowStage({ 
  stage,
  step,
  title,
  subtitle,
  content, 
  items,
  onContentChange, 
  onItemChange,
  onValidate, 
  onRefine,
  onRegenerate,
  isGenerating = false,
  isHydrating = false,
  hydrationLabel = null,
  refiningBlockId = null,
  placeholder = "Start writing...",
  validateLabel = "Validate & Next Step",
  lastUpdatedPrimitiveId = null,
  insight
}: WorkflowStageProps) {
  const { t } = useTranslation();
  
  let blocks: Block[] = [];
  let isJson = false;

  if (items && items.length > 0) {
    blocks = items.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      type: item.type,
      visualPrompt: item.visualPrompt
    }));
  } else {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.blocks)) {
        blocks = parsed.blocks;
        isJson = true;
      } else if (Array.isArray(parsed)) {
        blocks = parsed;
        isJson = true;
      }
    } catch (e) {
      // Not JSON, fallback to single block
      blocks = [{ id: 'main', title: stage, content: content }];
    }
  }

  const handleBlockChange = (id: string, newContent: string) => {
    if (items && onItemChange) {
      onItemChange(id, newContent);
    } else if (isJson) {
      const parsed = JSON.parse(content);
      let newBlocks;
      if (Array.isArray(parsed.blocks)) {
        newBlocks = parsed.blocks.map((b: Block) => 
          b.id === id ? { ...b, content: newContent } : b
        );
        onContentChange(JSON.stringify({ ...parsed, blocks: newBlocks }));
      } else if (Array.isArray(parsed)) {
        newBlocks = parsed.map((b: Block) => 
          b.id === id ? { ...b, content: newContent } : b
        );
        onContentChange(JSON.stringify(newBlocks));
      }
    } else {
      onContentChange(newContent);
    }
  };

  const hasContent = blocks.length > 0 && blocks.some(b => b.content?.trim());

  return (
    <StepLayout
      stepIndex={step}
      stageName={stage}
      title={title}
      subtitle={subtitle}
      insight={insight}
      isGenerating={isGenerating}
      isHydrating={isHydrating}
      hydrationLabel={hydrationLabel}
      onValidate={onValidate}
      validateLabel={validateLabel}
    >
      <div className="space-y-8">
        {blocks.map((block) => (
          <Primitive
            key={block.id}
            title={block.title}
            content={block.content}
            type={block.type}
            onContentChange={(c) => handleBlockChange(block.id, c)}
            onAiRefine={() => onRefine(`Refine block: ${block.title}`, block.id)}
            isGenerating={isGenerating && (refiningBlockId === block.id || refiningBlockId === null)}
            placeholder={placeholder}
            mode={isJson ? "stacked" : "single"}
            visualPrompt={block.visualPrompt}
            isUpdated={lastUpdatedPrimitiveId === block.id}
          />
        ))}
      </div>
    </StepLayout>
  );
}
