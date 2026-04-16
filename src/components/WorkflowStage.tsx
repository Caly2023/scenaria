import { Primitive } from './Primitive';
import { StepLayout } from './StepLayout';
import { StageInsight } from '@/types';
import { StageAnalysis } from '@/types/stageContract';
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
  items?: Block[];
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
  insight?: StageInsight | StageAnalysis;
  onAnalyze?: () => void | Promise<void>;
  onApplyFix?: (prompt: string) => void;
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
  isGenerating = false,
  isHydrating = false,
  hydrationLabel = null,
  refiningBlockId = null,
  placeholder = "Start writing...",
  validateLabel = "Validate & Next Step",
  lastUpdatedPrimitiveId = null,
  insight,
  onAnalyze,
  onApplyFix
}: WorkflowStageProps) {
  
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
    } catch {
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
      onAnalyze={onAnalyze}
      onApplyFix={onApplyFix}
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
