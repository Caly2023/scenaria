import { Character, Location } from "./index";

export interface PromptPayload {
  metadata: {
    title: string;
    genre: string;
    format: string;
    tone: string;
    languages: string[];
    logline: string;
    targetDuration?: string;
  };
  sectionalContext?: string;
  characters: Character[];
  locations: Location[];
  previousSequence?: {
    content: string;
    title: string;
  };
  currentSequence?: {
    title: string;
    content: string;
  };
  nextSequence?: {
    title: string;
    content: string;
  };
  idMapContext?: string;
}
