/**
 * TELEMETRY SERVICE — Technical Data-Mapping & Firebase Feedback Loop
 * 
 * Maintains a live in-memory ID-Map of all primitives across stages,
 * classifies Firebase error codes, and implements retry/recovery protocol.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrimitiveEntry {
  primitive_id: string;
  stage_id: string;
  order_index: number;
  title: string;
  content_preview: string; // first 120 chars for quick reference
  subcollection: string;
  last_synced: number;
}

export interface StageStructureEntry {
  stage_id: string;
  stage_name: string;
  primitives: PrimitiveEntry[];
  total_count: number;
  last_fetched: number;
}

export interface FirebaseErrorClassification {
  code: number;
  type: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK' | 'UNKNOWN';
  message: string;
  recoverable: boolean;
  action: 'REPORT' | 'RESYNC_AND_RETRY' | 'MODEL_FALLBACK_RETRY' | 'RETRY';
}

export interface TelemetryStatus {
  phase: string;
  emoji: string;
  detail: string;
  timestamp: number;
  primitiveId?: string;
}

// ─── ID-Map Store ────────────────────────────────────────────────────────────

class TelemetryStore {
  private idMap: Map<string, PrimitiveEntry> = new Map();
  private stageMap: Map<string, StageStructureEntry> = new Map();
  private statusHistory: TelemetryStatus[] = [];
  private _currentStatus: TelemetryStatus | null = null;
  private _onStatusChange: ((status: TelemetryStatus | null) => void) | null = null;
  private _failureLog: Map<string, number> = new Map(); // primitive_id -> consecutive failure count

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage() {
    try {
      if (typeof window === 'undefined') return;
      const storedIdMap = sessionStorage.getItem('scenaria_telemetry_idMap');
      const storedStageMap = sessionStorage.getItem('scenaria_telemetry_stageMap');
      if (storedIdMap) {
        this.idMap = new Map(JSON.parse(storedIdMap));
      }
      if (storedStageMap) {
        this.stageMap = new Map(JSON.parse(storedStageMap));
      }
    } catch (e) {
      console.warn('Failed to restore telemetry map', e);
    }
  }

  private persistToStorage() {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem('scenaria_telemetry_idMap', JSON.stringify(Array.from(this.idMap.entries())));
      sessionStorage.setItem('scenaria_telemetry_stageMap', JSON.stringify(Array.from(this.stageMap.entries())));
    } catch (e) {
      console.warn('Failed to persist telemetry map', e);
    }
  }

  // ─── Status Subscription ───────────────────────────────────────────────

  onStatusChange(callback: (status: TelemetryStatus | null) => void) {
    this._onStatusChange = callback;
  }

  setStatus(phase: string, emoji: string, detail: string, primitiveId?: string) {
    const status: TelemetryStatus = {
      phase,
      emoji,
      detail,
      timestamp: Date.now(),
      primitiveId,
    };
    this._currentStatus = status;
    this.statusHistory.push(status);
    this._onStatusChange?.(status);
  }

  clearStatus() {
    this._currentStatus = null;
    this._onStatusChange?.(null);
  }

  get currentStatus(): TelemetryStatus | null {
    return this._currentStatus;
  }

  // ─── ID-Map Operations ─────────────────────────────────────────────────

  /**
   * Hydrates the ID-Map from a stage's primitives.
   * Call this every time you fetch stage data.
   */
  hydrateStage(
    stageName: string,
    subcollection: string,
    primitives: Array<{
      id: string;
      title?: string;
      content?: string;
      order?: number;
      name?: string;
      description?: string;
    }>
  ): StageStructureEntry {
    const entries: PrimitiveEntry[] = primitives.map((p, idx) => {
      const rawContent = p.content || p.description || '';
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      
      const entry: PrimitiveEntry = {
        primitive_id: p.id,
        stage_id: stageName,
        order_index: p.order ?? idx,
        title: p.title || p.name || `Primitive ${idx + 1}`,
        content_preview: content.substring(0, 120),
        subcollection,
        last_synced: Date.now(),
      };

      // Store in global flat map
      this.idMap.set(p.id, entry);
      return entry;
    });

    const stageEntry: StageStructureEntry = {
      stage_id: stageName,
      stage_name: stageName,
      primitives: entries,
      total_count: entries.length,
      last_fetched: Date.now(),
    };

    this.stageMap.set(stageName, stageEntry);
    this.persistToStorage();
    return stageEntry;
  }

  /**
   * Resolve a primitive ID from various identifiers:
   * - Direct ID match
   * - Title-based lookup (fuzzy)
   * - Stage + order index
   */
  resolvePrimitiveId(identifier: string, stageName?: string): PrimitiveEntry | null {
    // 1. Direct ID match
    if (this.idMap.has(identifier)) {
      return this.idMap.get(identifier)!;
    }

    // 2. Title-based lookup
    const lowerIdentifier = identifier.toLowerCase();
    for (const entry of this.idMap.values()) {
      if (entry.title.toLowerCase().includes(lowerIdentifier)) {
        if (!stageName || entry.stage_id === stageName) {
          return entry;
        }
      }
    }

    // 3. Index-based lookup within a stage
    if (stageName) {
      const stageEntry = this.stageMap.get(stageName);
      if (stageEntry) {
        const idx = parseInt(identifier);
        if (!isNaN(idx) && idx >= 0 && idx < stageEntry.primitives.length) {
          return stageEntry.primitives[idx];
        }
      }
    }

    return null;
  }

  /**
   * Get the full stage structure with all IDs and metadata.
   */
  getStageStructure(stageName: string): StageStructureEntry | null {
    return this.stageMap.get(stageName) || null;
  }

  /**
   * Get the complete ID-Map as a serializable object for injection into AI context.
   */
  getIdMapSnapshot(): Record<string, PrimitiveEntry[]> {
    const snapshot: Record<string, PrimitiveEntry[]> = {};
    for (const [stageName, stageEntry] of this.stageMap.entries()) {
      snapshot[stageName] = stageEntry.primitives;
    }
    return snapshot;
  }

  /**
   * Get a compact string representation of the ID-Map for AI context injection.
   */
  getIdMapContext(): string {
    const lines: string[] = ['[PRIMITIVE ID-MAP]'];
    for (const [stageName, stageEntry] of this.stageMap.entries()) {
      if (stageEntry.primitives.length === 0) continue;
      lines.push(`\n## ${stageName} (${stageEntry.total_count} primitives):`);
      for (const p of stageEntry.primitives) {
        lines.push(`  - ID: "${p.primitive_id}" | Order: ${p.order_index} | Title: "${p.title}" | Preview: "${p.content_preview}"`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Invalidate the map for a stage (triggers re-fetch on next access).
   */
  invalidateStage(stageName: string) {
    this.stageMap.delete(stageName);
    // Remove all primitives belonging to that stage from the flat map
    for (const [id, entry] of this.idMap.entries()) {
      if (entry.stage_id === stageName) {
        this.idMap.delete(id);
      }
    }
    this.persistToStorage();
  }

  /**
   * Full cache invalidation — triggers a complete re-hydration.
   */
  invalidateAll() {
    this.idMap.clear();
    this.stageMap.clear();
    this._failureLog.clear();
    this.persistToStorage();
  }
  // ─── Recovery Protocol ─────────────────────────────────────────────────

  /**
   * Track consecutive failures for a given primitive.
   * Returns the current failure count.
   */
  recordFailure(primitiveId: string): number {
    const current = this._failureLog.get(primitiveId) || 0;
    const next = current + 1;
    this._failureLog.set(primitiveId, next);
    return next;
  }

  /**
   * Clear failure count for a primitive (on success).
   */
  clearFailure(primitiveId: string) {
    this._failureLog.delete(primitiveId);
  }

  /**
   * Check if we've hit the recovery threshold (2 failures → full resync before 3rd attempt).
   */
  shouldTriggerFullResync(primitiveId: string): boolean {
    return (this._failureLog.get(primitiveId) || 0) >= 2;
  }

  /**
   * Get a summary of current failures for debugging.
   */
  getFailureSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const [id, count] of this._failureLog.entries()) {
      summary[id] = count;
    }
    return summary;
  }
}

// Singleton export
export const telemetryService = new TelemetryStore();
