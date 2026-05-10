import { store } from "../../store";
import { firebaseService } from "../firebaseService";
import { telemetryService } from "../telemetryService";
import { stageRegistry } from "../../config/stageRegistry";
import { PromptPayload } from "../../types/context";
import { WorkflowStage, ContentPrimitive, Project, Sequence, Character, Location } from '../../types';
import { buildCascadingContext } from "./cascadingContext";
import { getStageStructure } from "./stageStructure";

function formatBibleContext(stage: 'Character Bible' | 'Location Bible', items: ContentPrimitive[]): string {
  if (stage === 'Character Bible') {
    return `[CHARACTER BIBLE]\n${JSON.stringify(items.map(c => ({
      name: (c as unknown as Record<string, unknown>).name as string || c.title,
      role: (c as unknown as Record<string, unknown>).role as string,
      description: (c as unknown as Record<string, unknown>).description as string || c.content,
      wantsNeeds: (c as unknown as Record<string, unknown>).deepDevelopment ? ((c as unknown as Record<string, unknown>).deepDevelopment as Record<string, Record<string, string>>).nowStory?.wantsNeeds || "" : ""
    })), null, 2)}\n\n`;
  } else {
    return `[LOCATION BIBLE]\n${JSON.stringify(items.map(l => ({
      name: (l as unknown as Record<string, unknown>).name as string || l.title,
      atmosphere: (l as unknown as Record<string, unknown>).atmosphere as string,
      description: (l as unknown as Record<string, unknown>).description as string || l.content
    })), null, 2)}\n\n`;
  }
}

async function getStageTextInternal(
  projectId: string, 
  stageName: string, 
  allCharacters: ContentPrimitive[], 
  allLocations: ContentPrimitive[]
): Promise<string> {
  if (stageName === "__characterBible__") return formatBibleContext('Character Bible', allCharacters);
  if (stageName === "__locationBible__") return formatBibleContext('Location Bible', allLocations);
  
  const primitives = await getStageStructure(projectId, stageName);
  return primitives.map(p => p.content).join("\n\n");
}

export async function buildPromptPayload(
  projectId: string, 
  currentStage: WorkflowStage, 
  activePrimitiveId?: string
): Promise<PromptPayload> {
  const projectResult = await store.dispatch(firebaseService.endpoints.getProjectById.initiate(projectId));
  const project = projectResult.data;
  if (!project) throw new Error("Project not found");

  // Get Story Bible primitives (which now contains both characters and locations)
  const bibleResult = await store.dispatch(firebaseService.endpoints.getSubcollection.initiate({ projectId, collectionName: "bible_primitives" }));
  const biblePrimitives = (bibleResult.data || []) as unknown as ContentPrimitive[];
  
  const allCharacters = biblePrimitives.filter(p => p.primitiveType === 'character');
  const allLocations = biblePrimitives.filter(p => p.primitiveType === 'location');

  const payload: PromptPayload = {
    metadata: {
      title: project.metadata?.title || "Untitled",
      genre: project.metadata?.genre || "N/A",
      format: project.metadata?.format || "Feature",
      tone: project.metadata?.tone || "N/A",
      languages: project.metadata?.languages || [],
      logline: project.metadata?.logline || "",
      targetDuration: project.metadata?.targetDuration
    },
    characters: allCharacters.map(c => ({
      id: c.id,
      name: (c as unknown as Record<string, unknown>).name as string || c.title,
      role: (c as unknown as Record<string, unknown>).role as string || '',
      description: (c as unknown as Record<string, unknown>).description as string || c.content || '',
      order: c.order || 0,
      deepDevelopment: (c as unknown as Record<string, unknown>).deepDevelopment as Character["deepDevelopment"]
    })),
    locations: allLocations.map(l => ({
      id: l.id,
      name: (l as unknown as Record<string, unknown>).name as string || l.title,
      atmosphere: (l as unknown as Record<string, unknown>).atmosphere as string || '',
      description: (l as unknown as Record<string, unknown>).description as string || l.content || '',
      order: l.order || 0
    }))
  };

  const getStageText = (sName: string) => getStageTextInternal(projectId, sName, allCharacters, allLocations);

  const cascadingContext = await buildCascadingContext(
    getStageText, 
    currentStage
  );

  const primitives = await getStageStructure(projectId, currentStage);
  const sectionalContent = JSON.stringify(primitives, null, 2);
  
  payload.sectionalContext = `${cascadingContext}\n[CURRENT STAGE CONTENT: ${currentStage}]\n${sectionalContent}`;
  payload.idMapContext = telemetryService.getIdMapContext();

  if (activePrimitiveId && (currentStage === "Sequencer" || currentStage === "Dialogue Continuity" || currentStage === "Treatment")) {
    const collName = stageRegistry.getCollectionName(currentStage);
    const seqsResult = await store.dispatch(firebaseService.endpoints.getSubcollection.initiate({ projectId, collectionName: collName, orderByField: "order" }));
    const allSeqs = (seqsResult.data || []) as unknown as Sequence[];
    const currentSeqIndex = allSeqs.findIndex(s => s.id === activePrimitiveId);
    
    if (currentSeqIndex !== -1) {
      const currentSeq = allSeqs[currentSeqIndex];
      payload.currentSequence = { title: currentSeq.title, content: currentSeq.content };

      if (currentSeq.characterIds && currentSeq.characterIds.length > 0) {
        payload.characters = allCharacters
          .filter(c => currentSeq.characterIds?.includes(c.id))
          .map(c => ({
            id: c.id,
            name: (c as unknown as Record<string, unknown>).name as string || c.title,
            role: (c as unknown as Record<string, unknown>).role as string || '',
            description: (c as unknown as Record<string, unknown>).description as string || c.content || '',
            order: c.order || 0,
            deepDevelopment: (c as unknown as Record<string, unknown>).deepDevelopment as Character["deepDevelopment"]
          }));
      }
      if (currentSeq.locationIds && currentSeq.locationIds.length > 0) {
        payload.locations = allLocations
          .filter(l => currentSeq.locationIds?.includes(l.id))
          .map(l => ({
            id: l.id,
            name: (l as unknown as Record<string, unknown>).name as string || l.title,
            atmosphere: (l as unknown as Record<string, unknown>).atmosphere as string || '',
            description: (l as unknown as Record<string, unknown>).description as string || l.content || '',
            order: l.order || 0
          }));
      }

      if (currentSeqIndex > 0) {
        const prevSeq = allSeqs[currentSeqIndex - 1];
        payload.previousSequence = { title: prevSeq.title, content: prevSeq.content };
      }
      if (currentSeqIndex < allSeqs.length - 1) {
        const nextSeq = allSeqs[currentSeqIndex + 1];
        payload.nextSequence = { title: nextSeq.title, content: nextSeq.content };
      }
    }
  }

  return payload;
}

export async function buildPayloadFromProjectContext(
  context: {
    metadata: Project["metadata"];
    stageContents: Record<string, ContentPrimitive[]>;
    stageAnalyses: Record<string, unknown>;
  }, 
  currentStage: WorkflowStage
): Promise<PromptPayload> {
  const { metadata, stageContents } = context;
  const storyBiblePrims = stageContents["Story Bible"] || [];
  
  const payload: PromptPayload = {
    metadata: {
      title: metadata.title || "Untitled",
      genre: metadata.genre || "N/A",
      format: metadata.format || "Feature",
      tone: metadata.tone || "N/A",
      languages: metadata.languages || [],
      logline: metadata.logline || "",
      targetDuration: metadata.targetDuration
    },
    characters: storyBiblePrims.filter((p: ContentPrimitive) => p.primitiveType === 'character').map((c: ContentPrimitive) => ({
      id: c.id, name: (c as unknown as Record<string, unknown>).name as string || c.title, role: (c as unknown as Record<string, unknown>).role as string || '',
      description: c.content || (c as unknown as Record<string, unknown>).description as string || '', order: c.order || 0,
      deepDevelopment: (c as unknown as Record<string, unknown>).deepDevelopment as Character["deepDevelopment"]
    })),
    locations: storyBiblePrims.filter((p: ContentPrimitive) => p.primitiveType === 'location').map((l: ContentPrimitive) => ({
      id: l.id, name: (l as unknown as Record<string, unknown>).name as string || l.title, atmosphere: (l as unknown as Record<string, unknown>).atmosphere as string || '', 
      description: l.content || (l as unknown as Record<string, unknown>).description as string || '', order: l.order || 0
    })),
  };

  const getStageText = (sName: string) => {
    if (sName === "Story Bible") {
      const chars = payload.characters;
      const locs = payload.locations;
      return `[CHARACTERS]\n${JSON.stringify(chars, null, 2)}\n\n[LOCATIONS]\n${JSON.stringify(locs, null, 2)}`;
    }
    return (stageContents[sName] || []).map((p: ContentPrimitive) => p.content).join("\n\n");
  };

  const cascadingContext = await buildCascadingContext(
    getStageText, 
    currentStage
  );
  
  const currentItems = stageContents[currentStage] || [];
  payload.sectionalContext = `${cascadingContext}\n[CURRENT STAGE CONTENT: ${currentStage}]\n${JSON.stringify(currentItems, null, 2)}`;

  return payload;
}
