import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Languages, Clock, Type } from 'lucide-react';
import { StepLayout } from './StepLayout';
import { ProjectMetadata, StageInsight } from '@/types';
import { StageAnalysis } from '@/types/stageContract';


interface ProjectMetadataStageProps {
  metadata: ProjectMetadata;
  onUpdate: (metadata: Partial<ProjectMetadata>) => void;
  onValidate: () => void;
  onAnalyze?: () => Promise<void> | void;
  insight?: StageInsight | StageAnalysis;
}

export function ProjectMetadataStage({ 
  metadata, 
  onUpdate, 
  onValidate, 
  onAnalyze,
  insight,
}: ProjectMetadataStageProps) {
  const { t } = useTranslation();
  const [localMeta, setLocalMeta] = useState<ProjectMetadata>(metadata);

  useEffect(() => {
    setLocalMeta(metadata);
  }, [metadata]);

  const handleChange = (field: keyof ProjectMetadata, value: any) => {
    const next = { ...localMeta, [field]: value };
    setLocalMeta(next);
    onUpdate({ [field]: value });
  };

  return (
    <StepLayout
      stepIndex={1}
      stageName="Project Metadata"
      title={t('stages.Project Metadata.title')}
      subtitle={t('stages.Project Metadata.subtitle')}
      insight={insight}
      onValidate={onValidate}
      onAnalyze={onAnalyze}
      validateLabel={t('stages.Project Metadata.validateLabel')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Title Section */}
        <div className="col-span-1 md:col-span-2 space-y-4 bg-white/5 p-8 rounded-[32px] border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Type className="w-5 h-5 text-white/40" />
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {t('common.title')}
            </label>
          </div>
          <input
            type="text"
            value={localMeta.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full bg-transparent border-none text-3xl md:text-4xl font-bold text-white placeholder:text-white/10 outline-none p-0"
            placeholder={t('common.projectNameOptional')}
          />
        </div>

        {/* Format & Genre */}
        <div className="space-y-6 bg-white/5 p-8 rounded-[32px] border border-white/10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Film className="w-5 h-5 text-white/40" />
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                {t('common.format')} & {t('common.genre')}
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4">
               <input
                type="text"
                value={localMeta.format}
                onChange={(e) => handleChange('format', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 h-14 text-white focus:border-white/20 outline-none transition-all"
                placeholder="Format (e.g. Feature Film, TV Series...)"
              />
              <input
                type="text"
                value={localMeta.genre}
                onChange={(e) => handleChange('genre', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 h-14 text-white focus:border-white/20 outline-none transition-all"
                placeholder="Genre (e.g. Sci-Fi, Drama...)"
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6 bg-white/5 p-8 rounded-[32px] border border-white/10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-white/40" />
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                {t('common.targetDuration')} & {t('common.tone')}
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4">
               <input
                type="text"
                value={localMeta.targetDuration}
                onChange={(e) => handleChange('targetDuration', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 h-14 text-white focus:border-white/20 outline-none transition-all"
                placeholder="Duration (e.g. 90 min, 52 min episode...)"
              />
              <input
                type="text"
                value={localMeta.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 h-14 text-white focus:border-white/20 outline-none transition-all"
                placeholder="Tone (e.g. Dark, Hopeful, Gritty...)"
              />
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="col-span-1 md:col-span-2 space-y-6 bg-white/5 p-8 rounded-[32px] border border-white/10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-white/40" />
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                {t('common.languages')}
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {localMeta.languages?.map((lang, idx) => (
                <span key={idx} className="px-4 py-2 bg-white/10 rounded-xl text-white font-medium border border-white/5">
                  {lang}
                </span>
              ))}
              <button 
                className="px-4 py-2 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all border border-dashed border-white/10"
                onClick={() => {
                  const lang = prompt('Enter language:');
                  if (lang) handleChange('languages', [...(localMeta.languages || []), lang]);
                }}
              >
                + Add Language
              </button>
            </div>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
