import { ProjectMetadata } from '../types';

interface ValidationError {
  field: keyof ProjectMetadata;
  message: string;
}

export function validateProjectMetadata(meta: ProjectMetadata): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title validation
  if (!meta.title || meta.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title cannot be empty.' });
  } else if (meta.title.length > 100) {
    errors.push({ field: 'title', message: `Title must be 100 characters or fewer (${meta.title.length}/100).` });
  }

  // Format validation
  if (!meta.format || meta.format.trim().length === 0) {
    errors.push({ field: 'format', message: 'Format is required (e.g. Short Film, Feature).' });
  }

  // Genre validation
  if (!meta.genre || meta.genre.trim().length === 0) {
    errors.push({ field: 'genre', message: 'Genre cannot be empty.' });
  }

  // Tone validation
  if (!meta.tone || meta.tone.trim().length === 0) {
    errors.push({ field: 'tone', message: 'Tone cannot be empty.' });
  }

  // Languages duplicate check
  if (meta.languages && meta.languages.length > 0) {
    const uniqueLangs = new Set(meta.languages.map(l => l.trim().toLowerCase()));
    if (uniqueLangs.size !== meta.languages.length) {
      errors.push({ field: 'languages', message: 'Languages list contains duplicates.' });
    }
  }

  return errors;
}
