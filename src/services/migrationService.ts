/**
 * MIGRATION SERVICE — One-time migration of root-field stage data to subcollections.
 *
 * Runs on project load (idempotent — safe to call multiple times).
 * Migrates: loglineDraft, structureDraft, synopsisDraft → subcollections.
 * Reads `stageStates` — if missing, derives from validatedStages[].
 */

import { db } from '../lib/firebase';
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { Project } from '../types';
import { stageRegistry } from '../config/stageRegistry';
import { StageState } from '../types/stageContract';

// ─── Legacy Stage Fields Map ──────────────────────────────────────────────────

const LEGACY_FIELD_MAP: Record<string, string> = {
  Logline: 'loglineDraft',
  '3-Act Structure': 'structureDraft',
  Synopsis: 'synopsisDraft',
};

// ─── Migration Entry ──────────────────────────────────────────────────────────

export async function migrateProjectIfNeeded(project: Project): Promise<void> {
  const updates: Record<string, any> = {};
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
  // ── 2. Migrate stageAnalyses from insights ────────────────────────────────
  if (!project.stageAnalyses && (project as any).insights) {
    const stageAnalyses: Record<string, any> = {};
    for (const [stageName, insight] of Object.entries((project as any).insights as Record<string, any>)) {
      stageAnalyses[stageName] = {
        evaluation: insight.content || '',
        issues: [],
        recommendations: [],
        updatedAt: insight.updatedAt || Date.now(),
      };
    }
    updates.stageAnalyses = stageAnalyses;
    needsUpdate = true;
    console.info('[Migration] stageAnalyses derived from insights');
  }

  // ── 3. Migrate legacy root fields → subcollections ─────────────────────────
  for (const [stageName, fieldName] of Object.entries(LEGACY_FIELD_MAP)) {
    const legacyContent = (project as any)[fieldName] as string | undefined;
    if (!legacyContent?.trim()) continue;

    try {
      const stageDef = stageRegistry.get(stageName as any);
      const collRef = collection(db, 'projects', project.id, stageDef.collectionName);
      const existing = await getDocs(query(collRef, orderBy(stageDef.orderField)));

      if (existing.empty) {
        // No primitives yet — migrate the root field content
        let title = stageName;
        let content = legacyContent;
        let primitiveType = stageDef.primitiveTypes[0] || 'content';

        // For 3-Act Structure: try to parse JSON blocks
        if (stageName === '3-Act Structure') {
          try {
            const parsed = JSON.parse(legacyContent);
            const blocks = parsed.blocks || (Array.isArray(parsed) ? parsed : null);
            if (blocks && blocks.length > 0) {
              await Promise.all(
                blocks.map((beat: any, i: number) =>
                  addDoc(collRef, {
                    title: beat.title || `Beat ${i + 1}`,
                    content: beat.content || '',
                    order: i,
                    primitiveType: 'beat',
                    agentGenerated: false,
                    projectId: project.id,
                    migratedFrom: fieldName,
                    createdAt: serverTimestamp(),
                  })
                )
              );
              console.info(`[Migration] ${stageName}: ${blocks.length} beats migrated to subcollection`);
              continue;
            }
          } catch {
            // Fall through to single-primitive migration
          }
        }

        await addDoc(collRef, {
          title,
          content,
          order: 0,
          primitiveType,
          agentGenerated: false,
          projectId: project.id,
          migratedFrom: fieldName,
          createdAt: serverTimestamp(),
        });
        console.info(`[Migration] ${stageName}: root field "${fieldName}" migrated to subcollection`);
      }
    } catch (e) {
      console.warn(`[Migration] Failed to migrate ${stageName}:`, e);
    }
  }

  // ── 4. Apply top-level project document updates ────────────────────────────
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
