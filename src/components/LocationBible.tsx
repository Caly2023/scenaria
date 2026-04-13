import React, { useState } from 'react';
import { Plus, Check, MapPin, Maximize2, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Primitive } from './Primitive';
import { Location, StageInsight } from '@/types';
import { StageAnalysis } from '@/types/stageContract';
import { cn } from '@/lib/utils';
import { StepLayout } from './StepLayout';

interface LocationBibleProps {
  locations: Location[];
  onLocationAdd: (name: string, description: string) => void;
  onLocationUpdate: (id: string, updates: Partial<Location>) => void;
  onLocationDelete: (id: string) => void;
  onGenerateViews: (id: string) => void;
  onDeepDevelop: (id: string) => void;
  onValidate: () => void;
  isGenerating?: boolean;
  refiningBlockId?: string | null;
  lastUpdatedPrimitiveId?: string | null;
  insight?: StageInsight | StageAnalysis;
}

export function LocationBible({ 
  locations, 
  onLocationAdd, 
  onLocationUpdate, 
  onLocationDelete, 
  onGenerateViews,
  onDeepDevelop,
  onValidate,
  isGenerating = false,
  refiningBlockId = null,
  lastUpdatedPrimitiveId = null,
  insight
}: LocationBibleProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: '', description: '' });
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLoc.name && newLoc.description) {
      onLocationAdd(newLoc.name, newLoc.description);
      setIsAdding(false);
      setNewLoc({ name: '', description: '' });
    }
  };

  const handleGenerateClick = (id: string) => {
    setConfirmingId(id);
  };

  const confirmGeneration = () => {
    if (confirmingId) {
      onGenerateViews(confirmingId);
      setConfirmingId(null);
    }
  };

  return (
    <StepLayout
      stepIndex={6}
      stageName="Location Bible"
      title={t('stages.Location Bible.title')}
      subtitle={t('stages.Location Bible.subtitle')}
      insight={insight}
      isGenerating={isGenerating}
      onValidate={onValidate}
      validateLabel={t('stages.Location Bible.validateLabel')}
    >
      <div className="space-y-12 pb-32">
        {/* Locations Section */}
        <div className="space-y-12">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <MapPin className="w-6 h-6 text-white/40" />
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white/80">{t('common.locations')}</h3>
          </div>
          
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {locations.map((loc) => (
                <Primitive
                  key={loc.id}
                  title={loc.name}
                  content={loc.description}
                  onContentChange={(description) => onLocationUpdate(loc.id, { description })}
                  onTitleChange={(name) => onLocationUpdate(loc.id, { name })}
                  onGenerateImage={() => handleGenerateClick(loc.id)}
                  onDeepDevelop={() => onDeepDevelop(loc.id)}
                  onDelete={() => onLocationDelete(loc.id)}
                  type="gallery"
                  mode="split"
                  images={[]} // Location images coming soon
                  onImageClick={setFullscreenImage}
                  isGenerating={isGenerating && (refiningBlockId === loc.id || refiningBlockId === null)}
                  placeholder={t('stages.Location Bible.placeholder')}
                  visualPrompt={loc.visualPrompt}
                  isUpdated={lastUpdatedPrimitiveId === loc.id}
                />
              ))}
            </AnimatePresence>

            {isAdding ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#212121] p-12 rounded-[32px] shadow-2xl border border-white/5"
              >
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight mb-8">{t('common.newLocation')}</h3>
                <form onSubmit={handleAdd} className="space-y-6">
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
                      className="yt-input w-full min-h-[200px] resize-none no-scrollbar font-sans"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="yt-btn-secondary flex-1"
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      type="submit"
                      className="yt-btn-primary flex-1"
                    >
                      {t('common.create')}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-12 rounded-[32px] bg-surface/30 hover:bg-surface/50 transition-all flex flex-col items-center justify-center gap-3 group border-2 border-dashed border-white/5"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                  <Plus className="w-6 h-6 text-white/20 group-hover:text-white" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-white/20 group-hover:text-white/40">{t('common.addNewLocation')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#212121] p-12 rounded-[40px] shadow-2xl border border-white/10 max-w-md w-full text-center space-y-8"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <Maximize2 className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{t('common.generateVisuals')}</h3>
                <p className="text-secondary">{t('common.generateVisualsDesc')}</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmingId(null)}
                  className="yt-btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={confirmGeneration}
                  className="yt-btn-primary flex-1"
                >
                  {t('common.generate')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
