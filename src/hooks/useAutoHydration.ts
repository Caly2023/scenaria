import { useEffect, useRef, useCallback, useState } from 'react';
import { WorkflowStage, Project, HydrationState } from '../types';
import { interpretIntent, buildProjectContext, dispatchToAgent, persistAgentOutput } from '../services/orchestration';
import { stageRegistry } from '../config/stageRegistry';

interface StageHydrationConfig {
  stage: WorkflowStage;
  isEmpty: () => boolean;
  generate: () => Promise<void>;
  label: string;
}

interface UseAutoHydrationProps {
  activeStage: WorkflowStage;
  currentProject: Project | null;
  stageContents: Record<string, import('../types/stageContract').ContentPrimitive[]>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  isStageLoading: boolean;
  /** Kept for API compatibility — no longer called automatically to avoid redundant Gemini calls. */
  onStageAnalyze: (stage: WorkflowStage) => Promise<void>;
}

// ── SessionStorage helpers ────────────────────────────────────────────────────
// Persists which stages have been confirmed non-empty across component remounts.
// Key format: `scenaria_hydration_${projectId}` → JSON array of hydrationKeys.

function sessionKey(projectId: string) {
  return `scenaria_hydration_${projectId}`;
}

function getPersistedChecked(projectId: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(sessionKey(projectId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistChecked(projectId: string, set: Set<string>) {
  try {
    sessionStorage.setItem(sessionKey(projectId), JSON.stringify([...set]));
  } catch {
    // ignore quota errors
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function useAutoHydration({
  activeStage,
  currentProject,
  stageContents,
  addToast,
  isStageLoading,
}: UseAutoHydrationProps): HydrationState {
  const [hydrationState, setHydrationState] = useState<HydrationState>({
    isHydrating: false,
    hydratingStage: null,
    hydratingLabel: null,
  });

  const activeHydrations = useRef<Set<string>>(new Set());

  const getContext = useCallback(() => {
    if (!currentProject) return null;
    return buildProjectContext(
      currentProject.id,
      currentProject.metadata,
      stageContents,
      currentProject.stageAnalyses || {}
    );
  }, [currentProject, stageContents]);

  const runStageHydration = useCallback(async (stageName: WorkflowStage) => {
    const context = getContext();
    if (!context || !currentProject) return;

    try {
      const decision = interpretIntent('generate', stageName);
      const agentOutput = await dispatchToAgent(decision, context, []);
      await persistAgentOutput(currentProject.id, stageName, agentOutput);
    } catch (e) {
      console.warn(`[AutoHydration] Failed to hydrate ${stageName}:`, e);
    }
  }, [currentProject, getContext]);


  const getHydrationConfig = useCallback((): StageHydrationConfig | null => {
    if (!currentProject) return null;

    const def = stageRegistry.get(activeStage);
    if (!def || !def.hydrationLabel) return null;

    return {
      stage: activeStage,
      isEmpty: () => (stageContents[activeStage] || []).length === 0,
      generate: async () => {
        await runStageHydration(activeStage);
      },
      label: def.hydrationLabel,
    };
  }, [
    activeStage, currentProject, stageContents,
    runStageHydration
  ]);

  useEffect(() => {
    if (!currentProject || isStageLoading) return;

    const config = getHydrationConfig();
    if (!config) return;

    const hydrationKey = `${currentProject.id}:${config.stage}`;
    const projectId = currentProject.id;

    // Skip if already hydrating or confirmed as populated this session
    if (activeHydrations.current.has(hydrationKey)) return;
    const checked = getPersistedChecked(projectId);
    if (checked.has(hydrationKey)) return;

    // ── Debounce 600ms to let RTK Query settle before deciding stage is empty ──
    // This prevents false-positive "empty" reads during the brief window between
    // isStageLoading becoming false and stageContents being populated from cache.
    const timer = setTimeout(() => {
      // Re-read contents after debounce — may have arrived
      if (!config.isEmpty()) {
        const latest = getPersistedChecked(projectId);
        latest.add(hydrationKey);
        persistChecked(projectId, latest);
        return;
      }

      // Truly empty → generate
      if (activeHydrations.current.has(hydrationKey)) return;
      activeHydrations.current.add(hydrationKey);

      setHydrationState({
        isHydrating: true,
        hydratingStage: config.stage,
        hydratingLabel: config.label,
      });

      addToast(config.label, 'info');

      config.generate()
        .then(() => {
          addToast(`${config.stage} generated successfully`, 'success');
          const latest = getPersistedChecked(projectId);
          latest.add(hydrationKey);
          persistChecked(projectId, latest);
        })
        .catch((error) => {
          console.error(`[AutoHydration] Failed for ${config.stage}:`, error);
          addToast(`Failed to auto-generate ${config.stage}`, 'error');
          // Do NOT mark as checked on failure — allow retry on next visit
        })
        .finally(() => {
          activeHydrations.current.delete(hydrationKey);
          setHydrationState({ isHydrating: false, hydratingStage: null, hydratingLabel: null });
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [activeStage, currentProject, getHydrationConfig, addToast, isStageLoading]);

  // Clear in-flight state when project changes
  useEffect(() => {
    activeHydrations.current.clear();
  }, [currentProject?.id]);

  const resetHydration = useCallback((stage: WorkflowStage) => {
    if (!currentProject) return;
    const hydrationKey = `${currentProject.id}:${stage}`;
    activeHydrations.current.delete(hydrationKey);
    // Clear from sessionStorage so the next visit re-evaluates (used after manual regenerate)
    const checked = getPersistedChecked(currentProject.id);
    checked.delete(hydrationKey);
    persistChecked(currentProject.id, checked);
  }, [currentProject]);

  return {
    ...hydrationState,
    resetHydration
  };
}
