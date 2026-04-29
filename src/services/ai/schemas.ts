import { z } from 'zod';

export const PrimitiveSchema = z.object({
  primitive_id: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),
  type: z.string().optional(),
}).passthrough();

export const MetadataSchema = z.object({
  title: z.string().optional(),
  format: z.string().optional(),
  genre: z.string().optional(),
  tone: z.string().optional(),
  logline: z.string().optional(),
  languages: z.array(z.string()).optional(),
  targetDuration: z.string().optional(),
}).passthrough();

export const SCRIPT_DOCTOR_FUNCTION_DECLARATIONS = [
  { name: 'fetch_project_state',     description: 'Retrieves the complete list of stages, their primitive counts, and the full ID-MAP.',                                                parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_stage_structure',     description: 'Retrieve the complete structure of any stage with all primitive IDs, titles, order indices, and content previews.',                  parameters: { type: 'OBJECT', properties: { stage_id:    { type: 'STRING', description: 'The stage identifier' } },            required: ['stage_id'] } },
  { name: 'research_context',        description: 'Pull full content from any previous stage for coherence checks. Returns data with primitive_ids.',                                   parameters: { type: 'OBJECT', properties: { stageName:   { type: 'STRING', description: 'The stage name to research' } },        required: ['stageName'] } },
  { name: 'fetch_character_details', description: 'Retrieve full details for a specific character using its primitive_id.',                                                             parameters: { type: 'OBJECT', properties: { characterId: { type: 'STRING', description: 'The character primitive_id' } },        required: ['characterId'] } },
  { name: 'search_project_content',  description: 'Search across all project primitives and stages for a keyword or query.',                                                            parameters: { type: 'OBJECT', properties: { query:       { type: 'STRING', description: 'The search keyword' } },                 required: ['query'] } },
  { name: 'propose_patch',           description: 'Submit a modification for a specific primitive. The ID MUST be a valid primitive_id from the ID-MAP.',                              parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' }, updates: { type: 'OBJECT' } },                                                         required: ['id', 'stage', 'updates'] } },
  { name: 'execute_multi_stage_fix', description: 'Coordinate changes across multiple related stages using their primitive_ids.',                                                       parameters: { type: 'OBJECT', properties: { fixes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' }, updates: { type: 'OBJECT' } } } } }, required: ['fixes'] } },
  { name: 'sync_metadata',           description: "Ensure the project's DNA (title, tone, genre, etc.) is always up to date.",                                                         parameters: { type: 'OBJECT', properties: { metadata: { type: 'OBJECT' } }, required: ['metadata'] } },
  { name: 'add_primitive',           description: 'Adds a new structural element (primitive) to a production stage.',                                                                   parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, primitive: { type: 'OBJECT' }, position: { type: 'NUMBER' } }, required: ['stage', 'primitive'] } },
  { name: 'delete_primitive',        description: 'Removes a specific element from production using its primitive_id.',                                                                 parameters: { type: 'OBJECT', properties: { id: { type: 'STRING' }, stage: { type: 'STRING' } },                                                                                         required: ['id', 'stage'] } },
  { name: 'restructure_stage',       description: 'Replaces all primitives in a stage with a new set. Use with caution.',                                                              parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, primitives: { type: 'ARRAY', items: { type: 'OBJECT' } } },                                                      required: ['stage', 'primitives'] } },
  { name: 'update_stage_insight',    description: 'Provides a professional analysis (insight) of the current step state and readiness.',                                               parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, insight: { type: 'OBJECT', properties: { content: { type: 'STRING' }, isReady: { type: 'BOOLEAN' }, suggestions: { type: 'ARRAY', items: { type: 'STRING' } }, score: { type: 'NUMBER' } } } }, required: ['stage', 'insight'] } },
  { name: 'update_agent_status',     description: 'Updates the clinical status of the Script Doctor.',                                                                                  parameters: { type: 'OBJECT', properties: { status: { type: 'STRING' }, thinking: { type: 'STRING' } },                                                                                   required: ['status'] } },
  { name: 'set_suggested_actions',   description: 'Sets the contextual action chips for the user.',                                                                                     parameters: { type: 'OBJECT', properties: { actions: { type: 'ARRAY', items: { type: 'STRING' } } },                                                                                     required: ['actions'] } },
];
