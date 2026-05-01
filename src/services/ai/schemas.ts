import { z } from 'zod';

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
  { name: 'update_stage_insight',    description: 'Provides a professional analysis (insight) of the current step state and readiness.',                                               parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING' }, insight: { type: 'OBJECT', properties: { evaluation: { type: 'STRING', description: 'Professional narrative evaluation (markdown)' }, isReady: { type: 'BOOLEAN' }, issues: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Identified weaknesses or gaps' }, recommendations: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Actionable improvement suggestions' }, suggestedPrompt: { type: 'STRING' }, score: { type: 'NUMBER' } } } }, required: ['stage', 'insight'] } },
  { name: 'update_agent_status',     description: 'Updates the clinical status of the Script Doctor.',                                                                                  parameters: { type: 'OBJECT', properties: { status: { type: 'STRING' }, thinking: { type: 'STRING' } },                                                                                   required: ['status'] } },
  { name: 'set_suggested_actions',   description: 'Sets the contextual action chips for the user.',                                                                                     parameters: { type: 'OBJECT', properties: { actions: { type: 'ARRAY', items: { type: 'STRING' } } },                                                                                     required: ['actions'] } },

  // ── Perception (advanced) ────────────────────────────────────────────────────
  { name: 'run_project_diagnostics', description: 'Performs a deep global coherence scan on the entire project. Checks prerequisites, narrative gaps, and contradictions across all stages.', parameters: { type: 'OBJECT', properties: {} } },

  // ── Workflow / Orchestration ─────────────────────────────────────────────────
  { name: 'trigger_stage_generation', description: 'Triggers AI generation for a specific workflow stage. Pass force=true to regenerate even if content already exists.', parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING', description: 'Target stage to generate' }, force: { type: 'BOOLEAN', description: 'Force regeneration even if content exists' } }, required: ['stage'] } },
  { name: 'approve_stage',           description: 'Formally approves a stage as complete, updates its state to good, and advances the project to the next stage.', parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING', description: 'Stage to approve' } }, required: ['stage'] } },

  // ── UI Navigation ────────────────────────────────────────────────────────────
  { name: 'navigate_to_stage',       description: 'Drives the UI to navigate to a specific stage so the user can see it while the agent explains.', parameters: { type: 'OBJECT', properties: { stage: { type: 'STRING', description: 'Stage ID to navigate to' } }, required: ['stage'] } },
  { name: 'focus_element',           description: 'Highlights a specific primitive element in the UI by its ID. Useful to point the user to a specific scene or beat.', parameters: { type: 'OBJECT', properties: { primitive_id: { type: 'STRING', description: 'The primitive ID to highlight' }, message: { type: 'STRING', description: 'Optional annotation message' } }, required: ['primitive_id'] } },
  { name: 'toggle_ui_panel',         description: 'Opens or closes a UI panel (e.g. chat, settings, sidebar). State can be "open", "close", or "toggle".', parameters: { type: 'OBJECT', properties: { panel: { type: 'STRING', description: 'Panel name' }, state: { type: 'STRING', description: '"open" | "close" | "toggle"' } }, required: ['panel'] } },

  // ── Safety / Versioning ──────────────────────────────────────────────────────
  { name: 'undo_last_action',        description: 'Reverts the last reversible mutation (update, add, or delete) performed by the agent. Safe to call when user requests rollback.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'request_user_approval',   description: 'Requests explicit user confirmation before executing a destructive or irreversible action.', parameters: { type: 'OBJECT', properties: { action: { type: 'STRING', description: 'Short name of the action to approve' }, description: { type: 'STRING', description: 'Full description of what will happen' }, risk_level: { type: 'STRING', description: '"low" | "medium" | "high"' } }, required: ['action', 'description'] } },

  // ── Platform ─────────────────────────────────────────────────────────────────
  { name: 'export_project_document', description: 'Generates and downloads the full project as a Markdown, JSON, or TXT document. Can export all stages or a specific stage.', parameters: { type: 'OBJECT', properties: { format: { type: 'STRING', description: '"markdown" | "json" | "txt"' }, stage: { type: 'STRING', description: 'Stage ID or "all"' } } } },
  { name: 'read_user_preferences',   description: 'Reads user preferences (theme, language, doctor severity, tone) from localStorage to adapt the analysis style.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'update_agent_memory',     description: "Persists the agent's scratchpad notes to the project for retrieval in future sessions.", parameters: { type: 'OBJECT', properties: { memory: { type: 'STRING', description: 'Agent notes or scratchpad content to persist' } }, required: ['memory'] } },
];
