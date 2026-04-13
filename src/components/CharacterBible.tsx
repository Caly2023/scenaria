import React, { useState } from 'react';
import { Plus, Users, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Primitive } from './Primitive';
import { Character, StageInsight } from '@/types';
import { StageAnalysis } from '@/types/stageContract';
import { StepLayout } from './StepLayout';

interface CharacterBibleProps {
  characters: Character[];
  onCharacterAdd: (name: string, description: string, tier: 1 | 2 | 3) => void;
  onCharacterUpdate: (id: string, updates: Partial<Character>) => void;
  onCharacterDelete: (id: string) => void;
  onGenerateViews: (id: string) => void;
  onDeepDevelop: (id: string) => void;
  isGenerating?: boolean;
  refiningBlockId?: string | null;
  onValidate: () => void;
  lastUpdatedPrimitiveId?: string | null;
  insight?: StageInsight | StageAnalysis;
}

export function CharacterBible({ 
  characters, 
  onCharacterAdd, 
  onCharacterUpdate, 
  onCharacterDelete, 
  onGenerateViews,
  onDeepDevelop,
  isGenerating = false,
  refiningBlockId = null,
  onValidate,
  lastUpdatedPrimitiveId = null,
  insight
}: CharacterBibleProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [newChar, setNewChar] = useState<{ name: string; description: string; tier: 1 | 2 | 3 }>({ 
    name: '', 
    description: '', 
    tier: 3 
  });
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChar.name && newChar.description) {
      onCharacterAdd(newChar.name, newChar.description, newChar.tier);
      setIsAdding(false);
      setNewChar({ name: '', description: '', tier: 3 });
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
      stepIndex={5}
      stageName="Character Bible"
      title={t('stages.Character Bible.title')}
      subtitle={t('stages.Character Bible.subtitle')}
      insight={insight}
      isGenerating={isGenerating}
      onValidate={onValidate}
      validateLabel={t('stages.Character Bible.validateLabel')}
    >
      <div className="space-y-12 pb-32">
        {/* Characters Section */}
        <div className="space-y-12">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <Users className="w-6 h-6 text-white/40" />
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white/80">{t('common.characters')}</h3>
          </div>
          
          <div className="space-y-12">
            <AnimatePresence mode="popLayout">
              {characters.map((char) => (
                <Primitive
                  key={char.id}
                  title={char.name}
                  content={char.description}
                  onContentChange={(description) => onCharacterUpdate(char.id, { description })}
                  onTitleChange={(name) => onCharacterUpdate(char.id, { name })}
                  onGenerateImage={() => handleGenerateClick(char.id)}
                  onDeepDevelop={() => onDeepDevelop(char.id)}
                  onDelete={() => onCharacterDelete(char.id)}
                  type="gallery"
                  tier={char.tier || 3}
                  mode="split"
                  images={char.views ? Object.values(char.views) as string[] : []}
                  onImageClick={setFullscreenImage}
                  isGenerating={isGenerating && (refiningBlockId === char.id || refiningBlockId === null)}
                  placeholder={t('stages.Character Bible.placeholder')}
                  visualPrompt={char.visualPrompt}
                  isUpdated={lastUpdatedPrimitiveId === char.id}
                />
              ))}
            </AnimatePresence>

            {isAdding ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#212121] p-12 rounded-[32px] shadow-2xl border border-white/5"
              >
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight mb-8">{t('common.newCharacter')}</h3>
                <form onSubmit={handleAdd} className="space-y-8">
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
                <span className="text-xs font-semibold uppercase tracking-widest text-white/20 group-hover:text-white/40">{t('common.addNewCharacter')}</span>
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
