import { WorkflowStage } from '../types';

export interface StageDefinition {
  id: WorkflowStage;
  label: string;
  subtitle: string;
  collectionName: string;
  step: number;
  primitiveType: string;
  isCustom?: boolean; // If it needs a completely custom UI (like Character Bible or Step Outline)
}

export const STAGE_DEFINITIONS: Record<WorkflowStage, StageDefinition> = {
  'Project Metadata': {
    id: 'Project Metadata',
    label: 'Métadonnées du projet',
    subtitle: 'Définissez les bases de votre film.',
    collectionName: 'pitch_primitives', // Special case, metadata is on project doc
    step: 1,
    primitiveType: 'metadata',
    isCustom: true
  },
  'Initial Draft': {
    id: 'Initial Draft',
    label: 'Draft initial',
    subtitle: 'Posez vos premières idées, sans filtre.',
    collectionName: 'draft_primitives',
    step: 2,
    primitiveType: 'draft'
  },
  'Brainstorming': {
    id: 'Brainstorming',
    label: 'Brainstorming',
    subtitle: 'Explorez les possibilités narratives et thématiques.',
    collectionName: 'pitch_primitives',
    step: 3,
    primitiveType: 'brainstorm'
  },
  'Logline': {
    id: 'Logline',
    label: 'Pitch / Logline',
    subtitle: 'Résumez votre histoire en une phrase percutante.',
    collectionName: 'logline_primitives',
    step: 4,
    primitiveType: 'logline'
  },
  '3-Act Structure': {
    id: '3-Act Structure',
    label: 'Structure en 3 actes',
    subtitle: 'Définissez l\'ossature dramatique de votre récit.',
    collectionName: 'structure_primitives',
    step: 5,
    primitiveType: 'act'
  },
  '8-Beat Structure': {
    id: '8-Beat Structure',
    label: 'Structure en 8 beats',
    subtitle: 'Détaillez les moments clés de l\'intrigue.',
    collectionName: 'beat_primitives',
    step: 6,
    primitiveType: 'beat'
  },
  'Synopsis': {
    id: 'Synopsis',
    label: 'Synopsis',
    subtitle: 'Racontez votre histoire du début à la fin.',
    collectionName: 'synopsis_primitives',
    step: 7,
    primitiveType: 'synopsis'
  },
  'Character Bible': {
    id: 'Character Bible',
    label: 'Bible des personnages',
    subtitle: 'Donnez vie à vos protagonistes et antagonistes.',
    collectionName: 'characters',
    step: 8,
    primitiveType: 'character',
    isCustom: true
  },
  'Location Bible': {
    id: 'Location Bible',
    label: 'Bible des lieux',
    subtitle: 'Définissez les décors de votre film.',
    collectionName: 'locations',
    step: 9,
    primitiveType: 'location',
    isCustom: true
  },
  'Treatment': {
    id: 'Treatment',
    label: 'Traitement',
    subtitle: 'Développez chaque acte en séquences narratives.',
    collectionName: 'treatment_sequences',
    step: 10,
    primitiveType: 'treatment'
  },
  'Step Outline': {
    id: 'Step Outline',
    label: 'Séquencier',
    subtitle: 'Organisez vos séquences et préparez le tournage.',
    collectionName: 'sequences',
    step: 11,
    primitiveType: 'sequence',
    isCustom: true
  },
  'Script': {
    id: 'Script',
    label: 'Continuité dialoguée',
    subtitle: 'Écrivez les scènes et les dialogues finaux.',
    collectionName: 'script_scenes',
    step: 12,
    primitiveType: 'scene'
  },
  'Global Script Doctoring': {
    id: 'Global Script Doctoring',
    label: 'Script Doctoring global',
    subtitle: 'Analyse transversale pour assurer la cohérence.',
    collectionName: 'doctoring_primitives',
    step: 13,
    primitiveType: 'analysis'
  },
  'Technical Breakdown': {
    id: 'Technical Breakdown',
    label: 'Découpage technique',
    subtitle: 'Transformez vos scènes en plans de tournage.',
    collectionName: 'breakdown_primitives',
    step: 14,
    primitiveType: 'breakdown'
  },
  'Visual Assets': {
    id: 'Visual Assets',
    label: 'Génération d\'assets visuels',
    subtitle: 'Préparez les références visuelles de votre projet.',
    collectionName: 'asset_primitives',
    step: 15,
    primitiveType: 'asset'
  },
  'AI Previs': {
    id: 'AI Previs',
    label: 'Prévisualisation IA',
    subtitle: 'Générez des storyboards et des prévisualisations.',
    collectionName: 'previs_primitives',
    step: 16,
    primitiveType: 'previs'
  },
  'Production Export': {
    id: 'Production Export',
    label: 'Export production',
    subtitle: 'Préparez les livrables finaux pour la production.',
    collectionName: 'export_primitives',
    step: 17,
    primitiveType: 'export'
  }
};

export const STAGE_LIST = Object.values(STAGE_DEFINITIONS).sort((a, b) => a.step - b.step);
