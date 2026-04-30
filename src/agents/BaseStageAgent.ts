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
import type { WorkflowStage } from '../types';
import { contextAssembler } from '../services/context';
import { classifyError } from '../lib/errorClassifier';
import { telemetryService } from '../services/telemetryService';
import { stageRegistry } from '../config/stageRegistry';


export abstract class BaseStageAgent implements IStageAgent {
  abstract readonly stageId: WorkflowStage;

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
    const startTime = Date.now();
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        telemetryService.trackAiOperation(this.stageId, Date.now() - startTime, true);
        return result;
      } catch (e: any) {
        if (attempt === maxRetries) {
          telemetryService.trackAiOperation(this.stageId, Date.now() - startTime, false);
          throw e;
        }
        
        const classification = classifyError(e);
        if (!classification.canRetry) {
          telemetryService.trackAiOperation(this.stageId, Date.now() - startTime, false);
          throw e; // Non-transient: fail fast
        }
        
        const delay = (classification.retryDelay || baseDelay) * Math.pow(2, attempt);
        console.warn(`[${this.stageId}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms — ${classification.type}`);
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
    content: any,
    primitiveType: string,
    order: number,
    extra?: Record<string, any>
  ): ContentPrimitive {
    const safeContent = typeof content === 'string' 
      ? content 
      : content != null ? (typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content)) : '';
      
    return {
      id,
      title,
      content: safeContent,
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

  /**
   * Standardized "Plan-Execute-Verify" pass.
   * Runs the generated content against the Stage Insight verifier.
   * If it fails quality checks and provides a suggested prompt, it will trigger a refinement pass.
   */
  protected async verifyAndRefine(
    initialContent: ContentPrimitive[],
    context: ProjectContext,
    refineCallback: (suggestion: string) => Promise<ContentPrimitive[]>
  ): Promise<ContentPrimitive[]> {
    if (!initialContent.length) return initialContent;

    try {
      const fullText = initialContent.map(p => `[${p.title}]\n${p.content}`).join('\n\n');
      const unifiedCtx = await this.getUnifiedContext(context);
      
      const verification = await this.retryWithBackoff(async () => {
        // We use dynamic import or require to avoid circular dependencies if any,
        // but since geminiService is likely imported in child classes, we can import it here.
        const { geminiService } = await import('../services/geminiService');
        return geminiService.generateStageInsight(this.stageId as string, fullText, unifiedCtx);
      });

      if (!verification.isReady && verification.suggestedPrompt) {
        console.log(`[${this.stageId}] Verification failed. Triggering refinement pass with: "${verification.suggestedPrompt}"`);
        const refinedContent = await refineCallback(verification.suggestedPrompt);
        return refinedContent.length > 0 ? refinedContent : initialContent;
      }

      return initialContent;
    } catch (e) {
      console.warn(`[${this.stageId}] Verification pass failed, proceeding with initial draft.`, e);
      return initialContent; // Fallback to the initial draft if verification fails
    }
  }

  /**
   * Standardized error handling for agent operations.
   */
  protected handleError(e: unknown, fallbackContent: ContentPrimitive[] = []): AgentOutput {
    const message = e instanceof Error ? e.message : String(e);
    return this.buildFallbackOutput(message, fallbackContent);
  }

  /**
   * Helper to get a prompt from the registry or fallback to a default.
   */
  protected getPrompt(type: 'generate' | 'magic' | 'refine', defaultPrompt: string): string {
    const def = stageRegistry.get(this.stageId);
    return def.prompts?.[type] || defaultPrompt;
  }
}

