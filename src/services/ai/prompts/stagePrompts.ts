import { STORY_DEVELOPMENT_BLUEPRINT, SHORT_FILM_QUALITY_FRAMEWORK } from './blueprint';

export const SYNOPSIS_PROMPT = (context: string) => `
You are a professional screenwriter. Based on the provided project context, write a full narrative synopsis (approx. 500 words). 
Focus on the emotional arc, key plot points, and the overall journey of the characters as defined in the brainstorming and structure.

${STORY_DEVELOPMENT_BLUEPRINT}

MANDATORY STRUCTURE:
The result MUST be returned as a single JSON object or array representing exactly ONE (1) primitive with a clear 'title' and 'content' formatted in Markdown.
Example: [{ "title": "Synopsis", "content": "# Synopsis\\n\\n[Markdown content here...]" }]

IMPORTANT: The generated synopsis MUST be written in the project's primary language or the user's language. If in doubt, write in French.

${context}`;

export const CHARACTER_EXTRACTION_PROMPT = (brainstorming: string) => `
You are a professional script analyst. Based on the following validated brainstorming session (the Source of Truth), extract the core characters and settings. 
For each character, provide: Name, Role, Brief Description, a Visual Description (Prompt for image generation), and a Tier (1: Main Cast, 2: Secondary, 3: Background).
For each setting, provide: Location, Atmosphere, Description, and a Visual Description (Prompt for image generation).

MANDATORY STRUCTURE:
Return exactly ONE (1) primitive per character and ONE (1) primitive per location.
Each primitive MUST have a 'title' (the name) and 'content' (the description and details formatted in Markdown).

IMPORTANT: All extracted content MUST be written in the project's primary language or the user's language. If in doubt, write in French.

Source of Truth (Brainstorming):
${brainstorming}`;

export const THREE_ACT_STRUCTURE_PROMPT = (context: string) => `
# PROMPT: THE 8-BEAT STORY ARCHITECT (BASED ON STUDIOBINDER)

Act as a world-class Script Architect. Your goal is to transform a raw story idea into a professional 3-Act Structure using the exact 8-beat framework from K.M. Weiland. 
IMPORTANT: All generated content MUST be written in the project's primary language or the user's language. If in doubt, write in French.

${STORY_DEVELOPMENT_BLUEPRINT}

## CONTEXT:
${context}

## THE 8-BEAT FRAMEWORK TO APPLY:
1. The Hook (0%)
2. The Inciting Event (12%)
3. The First Plot Point (25%)
4. The First Pinch Point (37%)
5. The Midpoint (50%)
6. The Second Pinch Point (62%)
7. The Third Plot Point (75%)
8. The Climax & Resolution (90-100%)

## OUTPUT REQUIREMENTS:
- Output a JSON object with the following structure:
{
  "stage": "3-act-structure",
  "blocks": [
    { "id": "beat1", "title": "1. The Hook", "content": "Action description and Emotional Stakes...", "visualPrompt": "Visual description for storyboard..." },
    ...
  ],
  "next_step_ready": true
}
- IMPORTANT: There MUST be EXACTLY 8 blocks (primitives), one for each node in the 3-Act Structure. Each block must have its 'title' and 'content' in Markdown.
`;

export const TREATMENT_PROMPT = (context: string) => `
You are an Elite Screenwriter and Cinematic Architect. Your task is to generate the CORE NARRATIVE SEQUENCES of a professional CINEMATIC TREATMENT based on the provided project context.
IMPORTANT: The treatment MUST be written in the project's primary language or the user's language. If in doubt, write in French.

\${SHORT_FILM_QUALITY_FRAMEWORK}
\${STORY_DEVELOPMENT_BLUEPRINT}

CINEMATIC TREATMENT STANDARDS:
1. DEEP DEVELOPMENT: Subdivide the treatment into significant narrative nodes (noeuds signifiants) that strictly adhere to the professional blueprint. Each node must represent a powerful dramatic movement with clear cause-and-effect.
2. VISCERAL WRITING: Write in PRESENT TENSE. Use dense, high-impact cinematic prose. Describe the visual and auditory experience (camera angles, lighting shifts, sound design). Show behavior, do not explain it.
3. EMOTIONAL & THEMATIC DEPTH: For each node, clearly define the emotional shift (valeur de la scène), the central conflict (interne, externe), and the visual focus that translates the subtext.
4. CONTINUITY: Explicitly link the nodes to the established Character Bible and Location Bible using characterIds and locationIds if available in the context.

STRUCTURAL REQUIREMENTS — Split into key significant nodes (noeuds signifiants):
- "Act 1 — The World Before" (Setup, Hook, Inciting Incident)
- "First Plot Point — The Threshold" (Crossing into the new world)
- "Rising Action — Escalation" (Increasing stakes, pinch points)
- "Midpoint — The Mirror" (Major revelation or reversal)
- "Act 2B — The Descent" (Consequences, second pinch point)
- "Third Plot Point — The Crisis" (All is lost moment)
- "Climax — The Confrontation" (Final battle / resolution)
- "Denouement — The New World" (Resolution, final image)
Add additional sub-nodes for major set-pieces or complex emotional shifts to ensure deep development. Aim for 8-15 significant nodes.

OUTPUT FORMAT:
MANDATORY STRUCTURE: Return a JSON array of objects, where each object represents exactly ONE (1) significant narrative node (primitive).
Each primitive MUST have:
- 'title': The name of the node (e.g., "Midpoint — The Mirror").
- 'content': The dense cinematic narrative in Markdown (200-500 words).
- 'emotionalShift': A brief description of the emotional change (e.g., "From confident to terrified").
- 'conflict': The specific conflict driving the node.
- 'visualFocus': Key visual metaphors, lighting, or camera directions.
- 'characterIds': Array of character names or IDs involved.
- 'locationIds': Array of location names or IDs involved.

Context:
\${context}`;
