import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Project, ContentPrimitive } from '../../types';
import { geminiService } from '../../services/geminiService';
import { stageRegistry } from '../../config/stageRegistry';
import { useUpdateSubcollectionDocMutation } from '../../services/firebaseService';
import { runAsyncAction } from '@/utils/actionUtils';

interface UseCharacterActionsProps {
  currentProject: Project | null;
  setIsTyping: (val: boolean) => void;
  setRefiningBlockId: (id: string | null) => void;
  addToast: (msg: string, type: 'error' | 'info' | 'success') => void;
  stageContents: Record<string, ContentPrimitive[]>;
}

export function useCharacterActions({
  currentProject,
  setIsTyping,
  setRefiningBlockId,
  addToast,
  stageContents,
}: UseCharacterActionsProps) {
  const { t } = useTranslation();
  const [updateSubcol] = useUpdateSubcollectionDocMutation();

  const handleGenerateViews = useCallback(async (id: string) => {
    if (!currentProject) return;
    const bible = stageContents['Story Bible'] || [];
    const prim = bible.find(c => c.id === id);
    if (!prim) return;

    await runAsyncAction(
      async () => {
        const promptsToUse = prim.referencePrompts || (prim.visualPrompt ? [{ prompt: prim.visualPrompt, description: "Main reference" }] : []);
        if (promptsToUse.length === 0) {
          throw new Error("Aucun prompt visuel disponible pour cet élément.");
        }

        const isSequential = window.confirm(
          "Voulez-vous générer les images en série (l'une après l'autre, en utilisant la précédente comme référence) ?\n\nCliquez sur OK pour Séquentiel, ou Annuler pour Parallèle."
        );

        const { cloudinaryService } = await import('../../services/cloudinaryService');
        let uploadedUrls: string[] = [];

        if (isSequential) {
          let lastImageUrl: string | undefined = undefined;
          for (let i = 0; i < promptsToUse.length; i++) {
            const rp = promptsToUse[i];
            const views = await geminiService.generateCharacterViews({ prompt: rp.prompt, referenceImageUrl: lastImageUrl });
            
            if (!views || views.length === 0) throw new Error("La génération d'image a échoué.");
            
            const isConfirmed = window.confirm(
              `Image ${i+1}/${promptsToUse.length} générée !\n\nVoulez-vous valider cette image pour l'utiliser comme référence pour la suite ?\n\nOK pour Valider, Annuler pour Arrêter ici.`
            );

            if (!isConfirmed) break;

            const res = await cloudinaryService.uploadImage(views[0]);
            lastImageUrl = res.secure_url;
            uploadedUrls.push(lastImageUrl);
          }
        } else {
          const results = await Promise.all(
            promptsToUse.map(async (rp) => {
              const views = await geminiService.generateCharacterViews({ prompt: rp.prompt });
              if (!views || views.length === 0) return null;
              const res = await cloudinaryService.uploadImage(views[0]);
              return res.secure_url;
            })
          );
          
          const isConfirmed = window.confirm(
            "Images générées avec succès en parallèle !\n\nVoulez-vous les sauvegarder ?"
          );

          if (!isConfirmed) return;
          uploadedUrls = results.filter(Boolean) as string[];
        }

        if (uploadedUrls.length === 0) return;

        const collectionName = stageRegistry.getCollectionName('Story Bible');
        const existingImages = (prim.metadata?.images as string[]) || [];
        const newImages = [...existingImages, ...uploadedUrls];

        await updateSubcol({ 
          projectId: currentProject.id, 
          collectionName, 
          docId: id, 
          data: {
            ...(prim.primitiveType === 'character' ? {
              views: {
                front: uploadedUrls[0] || (prim.metadata?.views as any)?.front || '',
                profile: uploadedUrls[1] || (prim.metadata?.views as any)?.profile || '',
                back: uploadedUrls[2] || (prim.metadata?.views as any)?.back || '',
                full: uploadedUrls[3] || (prim.metadata?.views as any)?.full || '',
              }
            } : {}),
            metadata: {
              ...(prim.metadata || {}),
              images: newImages
            }
          }
        }).unwrap();
      },
      {
        setIsTyping,
        addToast,
        successMessage: t('common.viewsGenerated', { defaultValue: 'Images générées avec succès !' })
      }
    );
  }, [currentProject, stageContents, setIsTyping, addToast, t, updateSubcol]);

  const onGenerateCinematicImage = useCallback(async (primitiveId: string, prompt: string, referenceImages: string[]) => {
    // Generate an image via genkit flow, uploading to Cloudinary
    const { cloudinaryService } = await import('../../services/cloudinaryService');
    const views = await geminiService.generateCharacterViews({ 
      prompt: `${prompt} cinematic lighting, movie still, 35mm anamorphic lens, ultra realistic, dramatic composition, depth of field, film grain, same character, same face, same outfit, same cinematic identity`,
      referenceImageUrl: referenceImages.length > 0 ? referenceImages[referenceImages.length - 1] : undefined
    });
    
    if (!views || views.length === 0) throw new Error("Génération échouée.");
    
    // Upload immediately to cloudinary (pending validation by user)
    const res = await cloudinaryService.uploadImage(views[0]);
    return res.secure_url;
  }, []);

  const onValidateCinematicImage = useCallback(async (primitiveId: string, imageUrl: string, index: number) => {
    if (!currentProject) return;
    const bible = stageContents['Story Bible'] || [];
    const prim = bible.find(c => c.id === primitiveId);
    if (!prim) return;

    const collectionName = stageRegistry.getCollectionName('Story Bible');
    const existingImages = (prim.metadata?.images as string[]) || [];
    
    // Clone and place at specific index
    const newImages = [...existingImages];
    newImages[index] = imageUrl;

    await updateSubcol({ 
      projectId: currentProject.id, 
      collectionName, 
      docId: primitiveId, 
      data: {
        metadata: {
          ...(prim.metadata || {}),
          images: newImages
        }
      }
    }).unwrap();
    addToast('Image validée et enregistrée !', 'success');
  }, [currentProject, stageContents, updateSubcol, addToast]);

  const onDeleteCinematicImage = useCallback(async (primitiveId: string, index: number) => {
    if (!currentProject) return;
    const bible = stageContents['Story Bible'] || [];
    const prim = bible.find(c => c.id === primitiveId);
    if (!prim) return;

    const collectionName = stageRegistry.getCollectionName('Story Bible');
    const existingImages = (prim.metadata?.images as string[]) || [];
    
    // Remove the image at index (set to undefined/null or slice)
    // Actually, setting it to null or filtering? If it's a sparse array, we should keep the length or just slice it
    // Cinematic N needs N-1. If we delete N, what happens to N+1? The user should probably only delete the last one, or we just remove it and compact.
    const newImages = existingImages.filter((_, i) => i !== index);

    await updateSubcol({ 
      projectId: currentProject.id, 
      collectionName, 
      docId: primitiveId, 
      data: {
        metadata: {
          ...(prim.metadata || {}),
          images: newImages
        }
      }
    }).unwrap();
    addToast('Image supprimée', 'info');
  }, [currentProject, stageContents, updateSubcol, addToast]);

  const handleCharacterDeepDevelop = useCallback(async (id: string) => {
    if (!currentProject) return;
    const bible = stageContents['Story Bible'] || [];
    const char = bible.find(c => c.id === id && c.primitiveType === 'character');
    if (!char) return;

    await runAsyncAction(
      async () => {
        const brief = stageContents['Project Brief'] || [];
        const briefText = brief.map(p => p.content).join('\n\n');
        
        const charData = {
          id: char.id,
          name: char.title,
          description: char.content,
          tier: char.metadata?.tier,
          visualPrompt: char.visualPrompt,
        };

        const otherChars = bible.filter(c => c.id !== id && c.primitiveType === 'character').map(c => ({ name: c.title, description: c.content }));

        const deepData = await geminiService.deepDevelopCharacter(
          charData as { name: string } & Record<string, unknown>, 
          briefText, 
          otherChars as { name: string }[]
        ) as {
          nowStory: { tags: string[], physical: string, wantsNeeds: string },
          backStory: string,
          forwardStory: string,
          relationshipMap: string
        };

        const formattedDescription = `
## Now-Story
**Personality Tags:** ${deepData.nowStory.tags.join(', ')}
**Physical:** ${deepData.nowStory.physical}
**Wants vs Needs:** ${deepData.nowStory.wantsNeeds}

## Back-Story (The Wound)
${deepData.backStory}

## Forward-Story (Arc)
${deepData.forwardStory}

## Relationship Map
${deepData.relationshipMap}
        `.trim();

        const collectionName = stageRegistry.getCollectionName('Story Bible');
        await updateSubcol({
          projectId: currentProject.id,
          collectionName,
          docId: id,
          data: { description: formattedDescription, deepDevelopment: deepData }
        }).unwrap();
      },
      {
        setIsTyping,
        setRefiningId: setRefiningBlockId,
        refiningId: id,
        addToast,
        successMessage: t('common.deepDeveloped', { name: char.title, defaultValue: 'Character deep developed!' })
      }
    );
  }, [currentProject, stageContents, setIsTyping, setRefiningBlockId, addToast, t, updateSubcol]);

  return useMemo(() => ({
    handleGenerateViews,
    handleCharacterDeepDevelop,
    onGenerateCinematicImage,
    onValidateCinematicImage,
    onDeleteCinematicImage
  }), [handleGenerateViews, handleCharacterDeepDevelop, onGenerateCinematicImage, onValidateCinematicImage, onDeleteCinematicImage]);
}
