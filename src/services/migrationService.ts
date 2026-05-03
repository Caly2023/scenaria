/**
 * MIGRATION SERVICE — One-time migration of root-field stage data to subcollections.
 *
 * Runs on project load (idempotent — safe to call multiple times).
 */

import { db } from '../lib/firebase';
import {
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Project } from '../types';
import { stageRegistry } from '../config/stageRegistry';
import { StageState } from '../types/stageContract';

// ─── Migration Entry ──────────────────────────────────────────────────────────

export async function migrateProjectIfNeeded(project: Project): Promise<void> {
  const updates: Record<string, unknown> = {};
  let needsUpdate = false;

  // ── 1. Migrate stageStates from validatedStages[] ────────────────────────
  if (!project.stageStates) {
    const stageStates: Record<string, StageState> = {};
    const validated = project.validatedStages || [];
    for (const stageName of stageRegistry.getAllIds()) {
      stageStates[stageName] = validated.includes(stageName) ? 'good' : 'empty';
    }
    updates.stageStates = stageStates;
    needsUpdate = true;
    console.info('[Migration] stageStates derived from validatedStages');
  }

  // ── 2. Migrate stageAnalyses from insights ────────────────────────────────
  if (!project.stageAnalyses && 'insights' in project) {
    const stageAnalyses: Record<string, unknown> = {};
    for (const [stageName, insight] of Object.entries((project as Record<string, unknown>).insights as Record<string, {content?: string, updatedAt?: number}>)) {
      // Fuzzy match stage name to canonical ID
      try {
        const canonicalId = stageRegistry.get(stageName).id;
        stageAnalyses[canonicalId] = {
          evaluation: insight.content || '',
          issues: [],
          recommendations: [],
          updatedAt: insight.updatedAt || Date.now(),
        };
      } catch {
        // Skip unknown stages
      }
    }
    updates.stageAnalyses = stageAnalyses;
    needsUpdate = true;
    console.info('[Migration] stageAnalyses derived from insights');
  }

  // ── 3. Apply top-level project document updates ────────────────────────────
  if (needsUpdate) {
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      console.info('[Migration] Project document updated with stageStates/stageAnalyses');
    } catch (e) {
      console.warn('[Migration] Failed to update project document:', e);
    }
  }
}
