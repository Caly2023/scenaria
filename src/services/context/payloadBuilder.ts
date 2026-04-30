import { store } from "../../store";
import { firebaseService } from "../firebaseService";
import { telemetryService } from "../telemetryService";
import { stageRegistry } from "../../config/stageRegistry";
import { PromptPayload } from "../../types/context";
import { Character, Location, Sequence, WorkflowStage } from "../../types";
import { buildCascadingContext } from "./cascadingContext";
import { getStageStructure } from "./stageStructure";

function formatBibleContext(stage: 'Character Bible' | 'Location Bible', items: any[]): string {
  if (stage === 'Character Bible') {
    return `[CHARACTER BIBLE]\n${JSON.stringify(items.map(c => ({
      name: c.name || c.title,
      role: c.role,
      description: c.description || c.content,
      wantsNeeds: c.deepDevelopment?.nowStory?.wantsNeeds || ""
    })), null, 2)}\n\n`;
  } else {
    return `[LOCATION BIBLE]\n${JSON.stringify(items.map(l => ({
      name: l.name || l.title,
      atmosphere: l.atmosphere,
      description: l.description || l.content
    })), null, 2)}\n\n`;
  }
}

async function getStageTextInternal(
  projectId: string, 
  stageName: string, 
  allCharacters: any[], 
  allLocations: any[]
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

  const charResult = await store.dispatch(firebaseService.endpoints.getSubcollection.initiate({ projectId, collectionName: "characters" }));
  const allCharacters = (charResult.data || []) as Character[];
  
  const locResult = await store.dispatch(firebaseService.endpoints.getSubcollection.initiate({ projectId, collectionName: "locations" }));
  const allLocations = (locResult.data || []) as Location[];

  telemetryService.hydrateStage("Character Bible", "characters", allCharacters as any);
  telemetryService.hydrateStage("Location Bible", "locations", allLocations as any);

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
    characters: [],
    locations: []
  };

  const getStageText = (sName: string) => getStageTextInternal(projectId, sName, allCharacters, allLocations);

  const isUnlocked = (sName: string): boolean => {
    const state = project.stageStates?.[sName];
    return !!(state && state !== "empty");
  };

  const cascadingContext = await buildCascadingContext(
    getStageText, 
    currentStage, 
    isUnlocked
  );

  const primitives = await getStageStructure(projectId, currentStage);
  const sectionalContent = JSON.stringify(primitives, null, 2);
  
  payload.sectionalContext = `${cascadingContext}\n[CURRENT STAGE CONTENT: ${currentStage}]\n${sectionalContent}`;
  payload.idMapContext = telemetryService.getIdMapContext();

  if (activePrimitiveId && (currentStage === "Step Outline" || currentStage === "Script" || currentStage === "Treatment")) {
    const collName = stageRegistry.getCollectionName(currentStage) || "sequences";
    const seqsResult = await store.dispatch(firebaseService.endpoints.getSubcollection.initiate({ projectId, collectionName: collName, orderByField: "order" }));
    const allSeqs = (seqsResult.data || []) as Sequence[];
    const currentSeqIndex = allSeqs.findIndex(s => s.id === activePrimitiveId);
    
    if (currentSeqIndex !== -1) {
      const currentSeq = allSeqs[currentSeqIndex];
      payload.currentSequence = { title: currentSeq.title, content: currentSeq.content };

      if (currentSeq.characterIds && currentSeq.characterIds.length > 0) {
        payload.characters = allCharacters.filter(c => currentSeq.characterIds?.includes(c.id));
      }
      if (currentSeq.locationIds && currentSeq.locationIds.length > 0) {
        payload.locations = allLocations.filter(l => currentSeq.locationIds?.includes(l.id));
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
  context: any, 
  currentStage: WorkflowStage
): Promise<PromptPayload> {
  const { metadata, stageContents } = context;
  
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
    characters: (stageContents["Character Bible"] || []).map((c: any) => ({
      id: c.id, name: c.title || c.name, role: c.role,
      description: c.content || c.description, deepDevelopment: c.deepDevelopment
    })),
    locations: (stageContents["Location Bible"] || []).map((l: any) => ({
      id: l.id, name: l.title || l.name, atmosphere: l.atmosphere, description: l.content || l.description
    })),
  };

  const getStageText = (sName: string) => {
    if (sName === "__characterBible__") return formatBibleContext('Character Bible', stageContents["Character Bible"] || []);
    if (sName === "__locationBible__") return formatBibleContext('Location Bible', stageContents["Location Bible"] || []);
    return (stageContents[sName] || []).map((p: any) => p.content).join("\n\n");
  };

  const cascadingContext = await buildCascadingContext(
    getStageText, 
    currentStage
  );
  
  const currentItems = stageContents[currentStage] || [];
  payload.sectionalContext = `${cascadingContext}\n[CURRENT STAGE CONTENT: ${currentStage}]\n${JSON.stringify(currentItems, null, 2)}`;

  return payload;
}
