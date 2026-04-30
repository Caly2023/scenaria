import { SCREENPLAY_GENERATION_BLUEPRINT } from './blueprint';

/** Données structurées pour la génération du scénario (alignées sur le pipeline Scénaria). */
export interface ScriptGenerationContext {
  metadata: {
    title: string;
    genre: string;
    format: string;
    tone: string;
    languages: string[];
    logline: string;
    targetDuration?: string;
  };
  /** 8 temps / structure narrative (JSON ou texte) */
  structure: string;
  synopsis: string;
  /** Traitement cinématographique (séquences narratives) */
  treatment: string;
  /** Bible personnages — JSON sérialisé */
  characterBible: string;
  /** Bible des lieux — JSON sérialisé */
  locationBible: string;
  /** Séquencier (Step Outline) — une entrée par scène attendue */
  stepOutline: string;
}

export const SCRIPT_PROMPT = (ctx: ScriptGenerationContext) => {
  const lang = ctx.metadata.languages?.length ? ctx.metadata.languages.join(', ') : 'celle du projet';
  const duration = ctx.metadata.targetDuration ? `\nDurée cible: ${ctx.metadata.targetDuration}` : '';

  return `
Tu es un scénariste professionnel (cinéma / série). Ta mission est de rédiger le SCÉNARIO COMPLET du projet en t'appuyant PRIORITAIREMENT sur les sources ci-dessous — elles font autorité et doivent rester cohérentes entre elles.

SOURCES (ordre de priorité pour la fidélité narrative) :
1) Métadonnées du projet (identité, ton, langues)
2) Synopsis
3) Séquencier (Step Outline) : structure des scènes, enchaînements, sluglines
4) Bible des lieux : atmosphère, contraintes spatiales, récurrence des décors
5) Bible des personnages : voix, enjeux, relations
6) Structure en 8 temps (3-Act) et Traitement : pour la progression dramatique et le détail cinématographique

MÉTADONNÉES DU PROJET :
- Titre : \${ctx.metadata.title}
- Format : \${ctx.metadata.format}
- Genre : \${ctx.metadata.genre}
- Ton : \${ctx.metadata.tone}
- Langue(s) du dialogue et des didascalies : \${lang}\${duration}
- Logline : \${ctx.metadata.logline}

SYNOPSIS (référence narrative) :
\${ctx.synopsis || '[Non fourni — déduire du reste avec prudence.]'}

STRUCTURE (8 temps / 3 actes) :
\${ctx.structure || '[]'}

TRAITEMENT (prose ciné, présent) :
\${ctx.treatment || '[Non fourni]'}

BIBLE DES PERSONNAGES (JSON) :
\${ctx.characterBible || '[]'}

BIBLE DES LIEUX (JSON — noms, atmosphère, description ; respecter les lieux nommés pour les sluglines) :
\${ctx.locationBible || '[]'}

SÉQUENCIER — À RESPECTER (une scène du scénario par entrée, même ordre ; si une entrée manque, la créer en restant cohérent avec les entrées voisines) :
\${ctx.stepOutline || '[Séquencier vide — dériver les scènes du traitement et du synopsis en conservant une progression claire.]'}

RÈGLES DE FORMÉ SCÉNARIO (didascalies + dialogues) :
- Chaque scène commence par une ligne temps-lieu (slugline) au format classique : INT. ou EXT. — LIEU — JOUR/NUIT/CONTINUATION (alignée sur le séquencier et la bible des lieux).
- DIDASCALIES : texte d'action au présent, concis, visuel, lisible ; décrire ce que le spectateur voit et entend hors dialogue. Pas de listes de plans caméra sauf si le ton du projet le justifie.
- DIALOGUES : nom du personnage en MAJUSCULES sur sa propre ligne ; éventuellement une brève incise entre parenthèses sous le nom ; puis le répliques. Respecter la voix et les enjeux définis dans la bible des personnages.
- Ne pas mélanger action et dialogue sur la même ligne. Alterner clairement blocs de didascalie et blocs de dialogue.
- Écrire dans la/les langue(s) indiquée(s) aux métadonnées.
- Interdiction de s'arrêter à mi-parcours, de résumer à la place d'écrire, ou d'omettre des scènes prévues au séquencier.

${SCREENPLAY_GENERATION_BLUEPRINT}

SORTIE ATTENDUE — UNIQUEMENT du JSON valide : un tableau d'objets, une entrée par scène du séquencier (ou l'équivalent si séquencier vide), dans l'ordre chronologique.

Format exact :
[
  { "title": "INT. LIEU — JOUR", "content": "Slugline éventuelle répétée ou non + corps : didascalies et dialogues structurés comme ci-dessus pour toute la scène en Markdown." },
  ...
]

MANDATORY STRUCTURE: Tu dois retourner exactement UNE (1) primitive par séquence/scène. Chaque primitive doit comporter un 'title' et un 'content' formaté en Markdown.

Le champ "title" doit reprendre ou préciser la slugline de la scène ; le champ "content" contient l'intégralité du texte de la scène (didascalies et dialogues).`;
};
