import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ContentPrimitive } from '@/types/stageContract';
import { BibleStage } from './BibleStage';
import { WorkflowStage } from '@/types';

interface CharacterBibleProps {
  characters: ContentPrimitive[];
  onCharacterAdd: (name: string, description: string, tier: 1 | 2 | 3) => void;
  onCharacterUpdate: (id: string, updates: any) => void;
  onCharacterDelete: (id: string) => void;
  onRefine: (feedback: string, blockId?: string) => void;
  onGenerateViews: (id: string) => void;
  onDeepDevelop: (id: string) => void;
  isGenerating?: boolean;
  refiningBlockId?: string | null;
  onValidate: () => void;
  lastUpdatedPrimitiveId?: string | null;
  insight?: any;
  onAnalyze?: () => void;
  onApplyFix?: (prompt: string) => void;
}

export function CharacterBible(props: CharacterBibleProps) {
  const { t } = useTranslation();

  const renderAddForm = (onClose: () => void, onSubmit: (data: any) => void) => {
    const [newChar, setNewChar] = useState({ name: '', description: '', tier: 3 as 1 | 2 | 3 });
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#212121] p-10 md:p-14 rounded-[32px] shadow-2xl border border-white/10"
      >
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-10 text-white">{t('common.newCharacter')}</h3>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newChar.name && newChar.description) onSubmit(newChar);
          }} 
          className="space-y-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input 
              type="text" 
              value={newChar.name}
              onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
              placeholder={t('common.characterName')} 
              className="yt-input w-full"
              autoFocus
            />
            <select
              value={newChar.tier}
              onChange={(e) => setNewChar({ ...newChar, tier: Number(e.target.value) as 1 | 2 | 3 })}
              className="yt-input w-full bg-[#1a1a1a]"
            >
              <option value={1}>{t('common.tier1', { defaultValue: 'Tier 1: Main Cast' })}</option>
              <option value={2}>{t('common.tier2', { defaultValue: 'Tier 2: Secondary' })}</option>
              <option value={3}>{t('common.tier3', { defaultValue: 'Tier 3: Background' })}</option>
            </select>
          </div>
          <div className="relative">
            <textarea 
              value={newChar.description}
              onChange={(e) => setNewChar({ ...newChar, description: e.target.value })}
              placeholder={t('common.describeCharacter')} 
              className="yt-input w-full min-h-[250px] py-6 resize-none no-scrollbar font-sans text-lg leading-relaxed"
            />
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="yt-btn-secondary flex-1">{t('common.cancel')}</button>
            <button type="submit" className="yt-btn-primary flex-1">{t('common.create')}</button>
          </div>
        </form>
      </motion.div>
    );
  };

  return (
    <BibleStage
      items={props.characters}
      stageId="Character Bible"
      icon={Users}
      itemTypeLabel="character"
      onAdd={(data) => props.onCharacterAdd(data.name, data.description, data.tier)}
      onUpdate={props.onCharacterUpdate}
      onDelete={props.onCharacterDelete}
      onRefine={props.onRefine}
      onGenerateViews={props.onGenerateViews}
      onDeepDevelop={props.onDeepDevelop}
      onValidate={props.onValidate}
      onAnalyze={props.onAnalyze}
      onApplyFix={props.onApplyFix}
      isGenerating={props.isGenerating}
      refiningBlockId={props.refiningBlockId}
      lastUpdatedPrimitiveId={props.lastUpdatedPrimitiveId}
      insight={props.insight}
      renderAddForm={renderAddForm}
      getItemProps={(item) => ({ tier: item.metadata?.tier || 3 })}
    />
  );
}
