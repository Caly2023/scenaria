import React from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WorkflowStage } from '../../types';
import { StageDefinition } from '../../config/stageRegistry';

interface PrimitiveAddButtonProps {
  stage: WorkflowStage;
  definition: StageDefinition;
  onAdd: (stage: WorkflowStage, data: any) => Promise<void>;
  contentCount: number;
}

export const PrimitiveAddButton: React.FC<PrimitiveAddButtonProps> = ({
  stage,
  definition,
  onAdd,
  contentCount
}) => {
  const { t } = useTranslation();
  const isCanvas = definition.displayMode === 'canvas';

  const handleAdd = () => {
    onAdd(stage, {
      title: isCanvas ? t('common.newSequenceLabel') : t(`common.new${definition.id.includes('Character') ? 'Character' : 'Location'}`), 
      content: '',
      order: contentCount + 1
    });
  };

  return (
    <button 
      onClick={handleAdd}
      className="w-full py-12 rounded-[32px] bg-surface/30 hover:bg-surface/50 transition-all flex flex-col items-center justify-center gap-3 group border-2 border-dashed border-white/5"
    >
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
        <Plus className="w-6 h-6 text-white/20 group-hover:text-white" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-widest text-white/20 group-hover:text-white/40">
        {isCanvas ? t('common.addNewSequence') : t(`common.addNew${definition.id.includes('Character') ? 'Character' : 'Location'}`)}
      </span>
    </button>
  );
};

