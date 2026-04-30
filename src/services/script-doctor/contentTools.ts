import { ToolHandler } from "./toolTypes";
import { getArgString } from "../../utils/scriptDoctorUtils";

export const fetchCharacterDetails: ToolHandler = async (args, context) => {
  const { characters } = context;
  const characterId = getArgString(args, "characterId") ?? "";
  const char = characters.find((c) => c.id === characterId);
  if (!char) return { success: false, error: `Character ${characterId} not found` };
  return { success: true, data: char };
};

export const searchProjectContent: ToolHandler = async (args, context) => {
  const { characters, locations } = context;
  const q = (getArgString(args, "query") ?? "").toLowerCase();
  return {
    success: true,
    data: {
      characters: characters.filter(c => c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q)),
      locations: locations.filter(l => l.title.toLowerCase().includes(q) || l.content.toLowerCase().includes(q)),
    }
  };
};
