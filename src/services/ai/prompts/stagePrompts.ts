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
${context}`;
export const SEQUENCER_PROMPT = (treatmentNode: string, context: string) => `
You are an Elite Screenwriter and Sequence Architect. Your task is to break down the following "Treatment Node" into a detailed Cinematic Sequence Outline (Séquencier).
IMPORTANT: The sequence outline MUST be written in the project's primary language or the user's language. If in doubt, write in French.

${SHORT_FILM_QUALITY_FRAMEWORK}
${STORY_DEVELOPMENT_BLUEPRINT}

CINEMATIC SEQUENCE STANDARDS:
1. SCENE-BY-SCENE BREAKDOWN: Break the provided treatment node into discrete, actionable scenes (or sequences). 
2. VISCERAL ACTION: Describe the physical action, visual beats, and core conflicts for each scene.
3. SLUGLINES & PACING: Give each scene a clear title or slugline (e.g., "INT. LOCATION - DAY").
4. CONTINUITY: Ensure emotional and narrative continuity from one scene to the next.

OUTPUT FORMAT:
Return a JSON array of objects, where each object represents ONE (1) scene/sequence primitive within this treatment node.
Each primitive MUST have:
- 'title': A clear slugline or scene title.
- 'content': The scene's narrative action and beat description in Markdown (focusing on action, not dialogue).
- 'emotionalShift': A brief description of the emotional change.
- 'conflict': The core conflict of the scene.
- 'visualFocus': Key visual metaphors, lighting, or camera directions.
- 'characterIds': Array of character names or IDs involved.
- 'locationIds': Array of location names or IDs involved.

Context of the overall project:
${context}

Treatment Node to break down into scenes:
${treatmentNode}`;

export const DIALOGUE_CONTINUITY_PROMPT = (treatmentNode: string, sequencerBlock: string, context: string) => `
You are an Elite Screenwriter. Your task is to write the Dialogue Continuity (Scénario détaillé) for the following Sequence Block, based on its parent Treatment Node.
IMPORTANT: The screenplay MUST be written in the project's primary language or the user's language. If in doubt, write in French.

${SHORT_FILM_QUALITY_FRAMEWORK}
${STORY_DEVELOPMENT_BLUEPRINT}

CINEMATIC SCRIPT STANDARDS:
1. ACTION & VISUALS (Didascalies): Write visceral, present-tense action. Show, don't tell. Focus on subtext, behavior, and visual storytelling rather than over-explaining.
2. DIALOGUE: Keep dialogue sparse, sharp, and loaded with subtext. Less is more. Humor, emotion, and character specific voices are essential.
3. PACING: Every scene must justify its existence. Build tension and emotional stakes.
4. FORMATTING: Use professional screenplay formatting (Sluglines, Action, Character names centered, Parentheticals, Dialogue).

OUTPUT FORMAT:
Return a JSON array of objects, where each object represents ONE (1) scripted scene.
Each primitive MUST have:
- 'title': The slugline (e.g., "INT. KITCHEN - DAY").
- 'content': The actual screenplay text in Markdown format.
- 'emotionalShift': A brief description of the emotional change.
- 'conflict': The core conflict of the scene.
- 'visualFocus': Key visual metaphors, lighting, or camera directions.
- 'characterIds': Array of character names or IDs involved.
- 'locationIds': Array of location names or IDs involved.

Context of the overall project (Metadata, Bibles, etc.):
${context}

Parent Treatment Node (For narrative grounding):
${treatmentNode}

Sequences to script:
${sequencerBlock}`;

// ── Technical Breakdown / Découpage Technique ─────────────────────────────────

/**
 * Decomposes a single scripted scene (from Dialogue Continuity)
 * into an atomic, production-ready SHOT LIST (plans).
 *
 * Shot values enforced per plan:
 *  - shotType    : Cadrage (GGG / GG / G / TG / MT / PA / PM / PMI / PP / GPP / TGP / DT / INS)
 *  - angle       : Axe (Niveau / Plongée / Contre-plongée / Dutch / Zénith / Nadir...)
 *  - cameraMovement : Mouvement (Fixe / Pan H / Pan V / Trav. Avant/Arrière / Dolly / Steadicam / Main Levée / Grue / Drone / Zoom...)
 *  - lens        : Focale (14mm, 24mm, 35mm, 50mm, 85mm, 135mm, Zoom 24-70mm, Zoom 70-200mm)
 *  - frameRate   : Cadence (24fps normal, 48fps, 120fps slow-motion)
 *  - lighting    : Description lumière (naturelle, artificielle, contre-jour, latérale...)
 *  - soundDesign : Son/ambiance/musique/bruitage pour ce plan précis
 *  - duration    : Durée estimée du plan
 *  - notes       : Notes DP / réalisateur, matériel spécial, VFX, sécurité
 */
export const TECHNICAL_BREAKDOWN_PROMPT = (sceneTitle: string, sceneContent: string, context: string) => `
Tu es le Directeur de la Photographie (DP) et le Premier Assistant Réalisateur (1er AD) du projet.
Ta mission est d'effectuer le DÉCOUPAGE TECHNIQUE PROFESSIONNEL de la scène suivante, en la décomposant en PLANS INDIVIDUELS (shots) atomiques, précis et prêts pour la production.

IMPORTANT : Tout le contenu généré DOIT être rédigé en français (ou dans la langue principale du projet).

${SHORT_FILM_QUALITY_FRAMEWORK}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES DU DÉCOUPAGE TECHNIQUE PROFESSIONNEL :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NARRATION VISUELLE PURE :
   - Chaque plan doit servir le récit, l'émotion ou le sous-texte.
   - Pas de plan inutile. Chaque coupe est intentionnelle.
   - Privilégier le "montrer" plutôt que "dire".

2. VALEURS DE PLAN (CADRAGE) — Choisir parmi :
   - GGG : Grand Grand Grand (drone altitude, paysage immense)
   - GG  : Grand Grand (plan d'ensemble très large, contexte spatial)
   - G   : Grand (plan d'ensemble, personnage entier dans décor)
   - TG  : Très Grand (personnage visible, décor important)
   - MT  : Moyen Taille (de la taille aux genoux)
   - PA  : Plan Américain (de mi-cuisse à la tête — action, western)
   - PM  : Plan Moyen (ceinture à la tête)
   - PMI : Plan Moyen Inférieur (poitrine basse à la tête)
   - PP  : Plan Poitrine (épaules à la tête)
   - GPP : Gros Plan Poitrine (gorge à la tête)
   - TGP : Très Gros Plan (yeux, bouche, main, objet)
   - DT  : Détail (texture, inscription, goutte de sang...)
   - INS : Insert (objet filmé en dehors de la continuité)

3. AXES DE PRISE DE VUE — Choisir parmi :
   - Niveau (aucun biais vertical)
   - Plongée (caméra au-dessus du sujet, diminue)
   - Contre-plongée (caméra sous le sujet, grandit)
   - Plongée Extrême (vue du dessus, aérien ou surplomb total)
   - Contre-plongée Extrême (grenouille, très en dessous)
   - Dutch (inclinaison latérale — tension, instabilité)
   - Zénith (vue strictement du dessus, 90°)
   - Nadir (vue strictement du dessous, 90°)

4. MOUVEMENTS DE CAMÉRA — Choisir parmi :
   - Fixe (trépied, aucun mouvement)
   - Panoramique H (rotation horizontale sur axe fixe)
   - Panoramique V (rotation verticale sur axe fixe)
   - Travelling Avant (caméra se déplace vers le sujet)
   - Travelling Arrière (caméra s'éloigne du sujet)
   - Travelling Latéral Gauche / Droit (translation horizontale)
   - Dolly In / Dolly Out (travelling sur rail, très fluide)
   - Steadicam (stabilisé, suit le personnage en mouvement)
   - Main Levée (épaule ou basculé — urgence, documentaire, tension)
   - Grue (élévation ou descente avec bras motorisé)
   - Drone (aérien — survol, élévation, plongée verticale)
   - Zoom In / Zoom Out (optique, pas de déplacement physique)
   - Arc (caméra tourne autour du sujet — révélation)
   - Combiné (plusieurs mouvements simultanés — préciser)

5. FOCALES :
   - 14mm (fish-eye, grand angle extrême, distorsion)
   - 24mm (grand angle, architecture, espace)
   - 35mm (légèrement large, naturel, reportage)
   - 50mm (focale standard, proche de l'œil humain)
   - 85mm (portrait, légère compression, intimité)
   - 100mm (portrait serré, macro possible)
   - 135mm (compression forte, isolation du sujet)
   - Zoom 24-70mm (polyvalent, raccords)
   - Zoom 70-200mm (téléobjectif, compression, surveillance)

6. CADENCES :
   - 24fps : Standard cinéma
   - 25fps : Broadcast Europe
   - 48fps : HFR (High Frame Rate)
   - 120fps : Slow-motion (à ralentir en post à 24fps → 5x ralenti)
   - 240fps : Ultra slow-motion

7. CONTINUITÉ & RACCORDS :
   - Respecter la règle des 180° entre plans dialogués.
   - Assurer les raccords de regard (eyeline match).
   - Respecter la direction-écran (screen direction).
   - Indiquer les plans cutaway ou contrechamps.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT DE SORTIE OBLIGATOIRE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Retourne un tableau JSON où chaque objet représente UN (1) PLAN.
Génère entre 3 et 15 plans selon la complexité dramatique de la scène.
Chaque plan DOIT avoir :

- "title"          : Identifiant du plan (ex: "Plan 1 — Établissement", "Plan 3B — Insert Mains")
- "content"        : Description visuelle précise de ce qu'on voit et entend dans ce plan (markdown, 2-6 lignes)
- "shotType"       : Valeur de cadrage (PA, PM, TGP, etc.)
- "angle"          : Axe de prise de vue
- "cameraMovement" : Mouvement de caméra
- "lens"           : Focale recommandée
- "frameRate"      : Cadence (ex: "24fps", "120fps slow-motion")
- "lighting"       : Description de l'éclairage pour CE plan spécifique
- "soundDesign"    : Son/musique/bruitage pour CE plan (ex: "Silence pesant. Respiration audible.")
- "duration"       : Durée estimée (ex: "3s", "8s", "12s")
- "notes"          : Notes DP/Réalisateur, équipement spécial, VFX, raccords à assurer
- "characterIds"   : Personnages présents dans le plan (tableau de noms ou IDs)
- "locationId"     : Lieu du plan
- "sceneTitle"     : Titre de la scène parente (= "${sceneTitle}")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contexte global du projet :
${context}

Scène parente à découper : ${sceneTitle}

Contenu de la scène (continuité dialoguée) :
${sceneContent}
`;

