/**
 * BASE STAGE AGENT — Abstract base class for all stage agents.
 *
 * Provides shared logic:
 *  - computeState() — deterministic, no AI call
 *  - buildAnalysis() — helper to build StageAnalysis objects
 *  - Partial result on failure — never return empty
 *  - retryWithBackoff() — resilient wrapper for transient AI failures
 */

import {
  ContentPrimitive,
  ProjectContext,
  IStageAgent,
  AgentOutput,
  StageAnalysis,
  StageState
} from '../types/stageContract';
import { contextAssembler } from '../services/contextAssembler';

export abstract class BaseStageAgent implements IStageAgent {
  abstract readonly stageId: string;

  abstract generate(context: ProjectContext): Promise<AgentOutput>;

  abstract updatePrimitive(
    primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput>;

  abstract evaluate(
    content: ContentPrimitive[],
    context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>>;

  /**
   * Compute a StageState from a StageAnalysis.
   * Deterministic mapping — no AI required.
   */
  computeState(analysis: StageAnalysis): StageState {
    if (!analysis || !analysis.evaluation || analysis.evaluation.trim() === '') {
      return 'empty';
    }
    const issueCount = analysis.issues?.length ?? 0;
    const recCount = analysis.recommendations?.length ?? 0;

    if (issueCount === 0 && recCount === 0) return 'excellent';
    if (issueCount <= 1 && recCount <= 2) return 'good';
    if (issueCount <= 3) return 'needs_improvement';
    return 'needs_improvement';
  }

  /**
   * Build a StageAnalysis from raw AI text, already-parsed objects,
   * or fall back gracefully on failure.
   */
  protected buildAnalysis(
    evaluation: string,
    issues: string[] = [],
    recommendations: string[] = [],
    suggestedPrompt?: string
  ): StageAnalysis {
    return {
      evaluation: evaluation || 'Analysis pending.',
      issues: issues.filter(Boolean),
      recommendations: recommendations.filter(Boolean),
      suggestedPrompt,
      updatedAt: Date.now(),
    };
  }

  /**
   * Build a fallback AgentOutput when generation/evaluation fails.
   * Never returns empty — always partial result.
   */
  protected buildFallbackOutput(
    reason: string,
    existingContent: ContentPrimitive[] = []
  ): AgentOutput {
    const analysis = this.buildAnalysis(
      `⚠️ Analysis temporarily unavailable: ${reason}`,
      ['Could not complete analysis'],
      ['Retry when AI service is available']
    );
    return {
      analysis,
      content: existingContent,
      state: existingContent.length > 0 ? 'needs_improvement' : 'empty',
    };
  }

  /**
   * Retry an async operation with exponential backoff.
   * Only retries on transient errors (429, timeout, network).
   * Non-transient errors are thrown immediately.
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (e: any) {
        if (attempt === maxRetries) throw e;
        
        const msg = (e.message || e.toString() || '').toLowerCase();
        const isTransient = /429|timeout|network|econnreset|fetch|rate.?limit/i.test(msg);
        
        if (!isTransient) throw e; // Non-transient: fail fast
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[${this.stageId}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms — ${msg}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error('Unreachable');
  }

  /**
   * Extract a string value from an AI response that may be JSON.
   */
  protected safeParseJson<T>(text: string): T | null {
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }

  /**
   * Gemini helpers often return already-parsed JSON (see geminiService.safeJsonParse).
   * This coerces model output into a plain array for scene/block-style stages.
   */
  protected normalizeToJsonArray<T extends Record<string, unknown>>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const nested = obj.scenes ?? obj.blocks ?? obj.items ?? obj.script;
      if (Array.isArray(nested)) return nested as T[];
    }
    if (typeof raw === 'string') {
      const parsed = this.safeParseJson<T[]>(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  }

  /**
   * Build a ContentPrimitive from raw data.
   */
  protected buildPrimitive(
    id: string,
    title: string,
    content: string,
    primitiveType: string,
    order: number,
    extra?: Record<string, any>
  ): ContentPrimitive {
    return {
      id,
      title,
      content,
      primitiveType,
      order,
      agentGenerated: true,
      agentVersion: '2.0',
      ...extra,
    };
  }

  /**
   * Helper to get the unified, formatted context string for the current stage.
   */
  protected async getUnifiedContext(context: ProjectContext): Promise<string> {
    const payload = await contextAssembler.buildPayloadFromProjectContext(context, this.stageId as any);
    return contextAssembler.formatPrompt(payload, "");
  }
}
