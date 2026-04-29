export type CollectionGate = {
  /** Firestore collection name */
  collection: string;
  /** Minimum stage order at which this collection is needed (inclusive) */
  minOrder: number;
  /** Optional: fetch sorted by this field */
  orderByField?: string;
};

export const COLLECTION_GATES: CollectionGate[] = [
  { collection: 'pitch_primitives',    minOrder: 0,  orderByField: 'order' },
  { collection: 'draft_primitives',    minOrder: 1,  orderByField: 'order' },
  { collection: 'logline_primitives',  minOrder: 3,  orderByField: 'order' },
  { collection: 'structure_primitives',minOrder: 4,  orderByField: 'order' },
  { collection: 'beat_primitives',     minOrder: 5,  orderByField: 'order' },
  { collection: 'synopsis_primitives', minOrder: 6,  orderByField: 'order' },
  { collection: 'characters',          minOrder: 0  }, // always needed (Script Doctor, context)
  { collection: 'locations',           minOrder: 0  }, // always needed
  { collection: 'treatment_sequences', minOrder: 9,  orderByField: 'order' },
  { collection: 'sequences',           minOrder: 10, orderByField: 'order' },
  { collection: 'script_scenes',       minOrder: 11, orderByField: 'order' },
  { collection: 'doctoring_primitives',minOrder: 12, orderByField: 'order' },
  { collection: 'breakdown_primitives',minOrder: 13, orderByField: 'order' },
  { collection: 'asset_primitives',    minOrder: 14, orderByField: 'order' },
  { collection: 'previs_primitives',   minOrder: 15, orderByField: 'order' },
  { collection: 'export_primitives',   minOrder: 16, orderByField: 'order' },
];
