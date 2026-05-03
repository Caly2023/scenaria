# SCENARIA

Plateforme d’écriture scénaristique assistée par IA, conçue pour transformer une idée brute en scénario professionnel complet, jusqu’au découpage technique.

**SCENARIA** = _Scénario + IA_.

L’application guide l’auteur depuis un simple draft initial jusqu’à :

- un scénario finalisé,
- une continuité dialoguée complète,
- un découpage technique exploitable en production,
- des assets prêts pour la génération visuelle par IA.

---

# Vision

SCENARIA n’est pas un simple éditeur de texte.

C’est un environnement de développement narratif structuré, où chaque étape du processus scénaristique est assistée, analysée, validée et enrichie par des agents spécialisés en intelligence artificielle.

L’objectif est double :

1. aider l’auteur à écrire mieux, plus vite et avec plus de rigueur ;
2. produire des œuvres immédiatement exploitables en production audiovisuelle et en génération visuelle par IA.

La plateforme est particulièrement optimisée pour :

- les courts-métrages,
- les films indépendants,
- les contenus narratifs générés ou augmentés par IA.

---

# Principe fondamental

L’utilisateur commence avec un simple draft :

- idée,
- synopsis brut,
- note d’intention,
- concept,
- ou simple prémisse.

SCENARIA le transforme progressivement en :

- concept narratif solide,
- architecture dramatique cohérente,
- univers structuré,
- scénario complet,
- plan de tournage détaillé.

---

# Philosophie produit

Chaque étape :

- produit un livrable concret,
- est validée par une IA spécialisée,
- peut être améliorée automatiquement,
- doit atteindre un niveau suffisant avant de débloquer l’étape suivante.

Le passage à l’étape suivante n’est jamais arbitraire : il repose sur une validation qualitative.

---

# Architecture narrative en 17 étapes

## 1. Métadonnées du projet

- titre
- genre
- format
- durée
- langue
- public cible
- tonalité
- intention

## 2. Draft initial

- idée brute
- concept de départ
- matériau source

## 3. Brainstorming

Exploration des possibilités narratives, thématiques, visuelles et émotionnelles.

## 4. Pitch / Logline

Formulation concise de la promesse narrative.

## 5. Structure en trois actes

Architecture globale de l’histoire.

## 6. Structure en 8 beats

Découpage dramatique détaillé en huit moments clés.

## 7. Synopsis

Résumé complet de l’histoire.

## 8. Bible des personnages

Création et approfondissement des personnages.

## 9. Bible des lieux

Définition des espaces narratifs.

## 10. Traitement

Développement de l’histoire en blocs narratifs.

## 11. Séquencier

Découpage détaillé du traitement en séquences.

## 12. Continuité dialoguée

Version scénarisée complète avec dialogues.

## 13. Script Doctoring global

Analyse transversale du scénario.

## 14. Découpage technique

Transformation des séquences en plans.

## 15. Génération d’assets visuels

- personnages multi-angles
- décors
- accessoires
- références visuelles

## 16. Prévisualisation IA

Préparation pour storyboards et génération d’images.

## 17. Export production

Livrables finaux pour écriture, tournage et production.

---
# SCENARIA

Plateforme d’écriture scénaristique assistée par IA, conçue pour transformer une idée brute en scénario professionnel complet, jusqu’au découpage technique.

**SCENARIA** = _Scénario + IA_.

L’application guide l’auteur depuis un simple draft initial jusqu’à :

- un scénario finalisé,
- une continuité dialoguée complète,
- un découpage technique exploitable en production,
- des assets prêts pour la génération visuelle par IA.

---

# Vision

SCENARIA n’est pas un simple éditeur de texte.

C’est un environnement de développement narratif structuré, où chaque étape du processus scénaristique est assistée, analysée, validée et enrichie par des agents spécialisés en intelligence artificielle.

L’objectif est double :

1. aider l’auteur à écrire mieux, plus vite et avec plus de rigueur ;
2. produire des œuvres immédiatement exploitables en production audiovisuelle et en génération visuelle par IA.

La plateforme est particulièrement optimisée pour :

- les courts-métrages,
- les films indépendants,
- les contenus narratifs générés ou augmentés par IA.

---

# Principe fondamental

L’utilisateur commence avec un simple draft :

- idée,
- synopsis brut,
- note d’intention,
- concept,
- ou simple prémisse.

SCENARIA le transforme progressivement en :

- concept narratif solide,
- architecture dramatique cohérente,
- univers structuré,
- scénario complet,
- plan de tournage détaillé.

---

# Philosophie produit

Chaque étape :

- produit un livrable concret,
- est validée par une IA spécialisée,
- peut être améliorée automatiquement,
- doit atteindre un niveau suffisant avant de débloquer l’étape suivante.

Le passage à l’étape suivante n’est jamais arbitraire : il repose sur une validation qualitative.

---

# Architecture narrative en 17 étapes

## 1. Métadonnées du projet

- titre
- genre
- format
- durée
- langue
- public cible
- tonalité
- intention

## 2. Draft initial

- idée brute
- concept de départ
- matériau source

## 3. Brainstorming

Exploration des possibilités narratives, thématiques, visuelles et émotionnelles.

## 4. Pitch / Logline

Formulation concise de la promesse narrative.

## 5. Structure en trois actes

Architecture globale de l’histoire.

## 6. Structure en 8 beats

Découpage dramatique détaillé en huit moments clés.

## 7. Synopsis

Résumé complet de l’histoire.

## 8. Bible des personnages

Création et approfondissement des personnages.

## 9. Bible des lieux

Définition des espaces narratifs.

## 10. Traitement

Développement de l’histoire en blocs narratifs.

## 11. Séquencier

Découpage détaillé du traitement en séquences.

## 12. Continuité dialoguée

Version scénarisée complète avec dialogues.

## 13. Script Doctoring global

Analyse transversale du scénario.

## 14. Découpage technique

Transformation des séquences en plans.

## 15. Génération d’assets visuels

- personnages multi-angles
- décors
- accessoires
- références visuelles

## 16. Prévisualisation IA

Préparation pour storyboards et génération d’images.

## 17. Export production

Livrables finaux pour écriture, tournage et production.

---

# La Primitive : unité fondamentale de SCENARIA

Toute l’application repose sur un concept central : la **Primitive**.

Une primitive est une unité narrative modulaire composée de :

- un titre,
- un contenu structuré.

## Structure

```ts
interface Primitive {
  id: string;
  title: string;
  content: string;
  type: PrimitiveType;
  status: "draft" | "review" | "validated";
  metadata?: Record<string, any>;
}
```
