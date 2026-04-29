import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ContentPrimitive } from '@/types/stageContract';
import { BibleStage } from './BibleStage';

interface LocationBibleProps {
  locations: ContentPrimitive[];
  onLocationAdd: (name: string, description: string) => void;
  onLocationUpdate: (id: string, updates: any) => void;
  onLocationDelete: (id: string) => void;
  onRefine: (feedback: string, blockId?: string) => void;
  onGenerateViews: (id: string) => void;
  onDeepDevelop: (id: string) => void;
  onValidate: () => void;
  isGenerating?: boolean;
  refiningBlockId?: string | null;
  lastUpdatedPrimitiveId?: string | null;
  insight?: any;
  onAnalyze?: () => void;
  onApplyFix?: (prompt: string) => void;
}

export function LocationBible(props: LocationBibleProps) {
  const { t } = useTranslation();

  const renderAddForm = (onClose: () => void, onSubmit: (data: any) => void) => {
    const [newLoc, setNewLoc] = useState({ name: '', description: '' });
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#212121] p-10 md:p-14 rounded-[32px] shadow-2xl border border-white/10"
      >
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-10 text-white">{t('common.newLocation')}</h3>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newLoc.name && newLoc.description) onSubmit(newLoc);
          }} 
          className="space-y-10"
        >
          <input 
            type="text" 
            value={newLoc.name}
            onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
            placeholder={t('common.locationName')} 
            className="yt-input w-full"
            autoFocus
          />
          <div className="relative">
            <textarea 
              value={newLoc.description}
              onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })}
              placeholder={t('common.describeAtmosphere')} 
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
      items={props.locations}
      stageId="Location Bible"
      icon={MapPin}
      itemTypeLabel="location"
      onAdd={(data) => props.onLocationAdd(data.name, data.description)}
      onUpdate={props.onLocationUpdate}
      onDelete={props.onLocationDelete}
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
    />
  );
}
