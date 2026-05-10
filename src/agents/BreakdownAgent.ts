import { BaseStageAgent } from './BaseStageAgent';
import { AgentOutput, ContentPrimitive, ProjectContext } from '../types/stageContract';
import { geminiService } from '../services/geminiService';
import type { Shot } from '../types';

/**
 * BREAKDOWN AGENT — Découpage Technique
 *
 * Strategy:
 *  1. Read all `script_scene` primitives from the Dialogue Continuity stage.
 *  2. For each scene, call the dedicated `generateTechnicalBreakdown` Genkit flow.
 *  3. The flow returns an array of shots (plans), each with full cinematic values:
 *       cadrage · axe · mouvement caméra · focale · cadence · éclairage · son · durée · notes DP
 *  4. Each shot is persisted as an individual ContentPrimitive (type: 'shot').
 *  5. Shots link back to their parent scene via `metadata.parentSceneId`.
 */
export class BreakdownAgent extends BaseStageAgent {
  readonly stageId = 'Technical Breakdown';

  // ── Generate ────────────────────────────────────────────────────────────────

  async generate(context: ProjectContext): Promise<AgentOutput> {
    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      const dialogueContent = context.stageContents['Dialogue Continuity'] || [];

      if (!dialogueContent.length) {
        return {
          analysis: this.buildAnalysis(
            'La Continuité Dialoguée est vide. Veuillez la générer avant de lancer le découpage technique.',
            ['Étape dépendante manquante : Dialogue Continuity'],
            ['Générer la continuité dialoguée en premier']
          ),
          content: [],
          state: 'empty',
        };
      }

      const allShots: ContentPrimitive[] = [];
      let globalIndex = 0;
      let failedScenes = 0;

      // ── Batch: one call per dialogue scene ──────────────────────────────────
      for (const scene of dialogueContent) {
        const sceneTitle   = scene.title   || `Scène ${globalIndex + 1}`;
        const sceneContent = scene.content || '';

        if (!sceneContent.trim()) {
          console.warn(`[BreakdownAgent] Skipping empty scene: ${sceneTitle}`);
          continue;
        }

        try {
          const rawShots: Shot[] = await this.retryWithBackoff(
            () => geminiService.generateTechnicalBreakdown(sceneTitle, sceneContent, unifiedCtx),
            2,
            1500
          );

          for (const shot of rawShots) {
            const prim = this.buildShotPrimitive(shot, scene.id, sceneTitle, globalIndex);
            allShots.push(prim);
            globalIndex++;
          }
        } catch (err) {
          console.error(`[BreakdownAgent] Failed to generate shots for scene "${sceneTitle}":`, err);
          failedScenes++;
          // Continue with remaining scenes — partial breakdown is better than none
        }
      }

      if (allShots.length === 0) {
        return {
          analysis: this.buildAnalysis(
            `Aucun plan généré (${failedScenes} scène(s) en échec). Vérifiez le contenu de la Continuité Dialoguée.`,
            ['Génération des plans impossible'],
            ['Vérifier la qualité du contenu de la Continuité Dialoguée', 'Réessayer la génération']
          ),
          content: [],
          state: 'empty',
        };
      }

      const evalResult = await this.evaluate(allShots, context);
      return { ...evalResult, content: allShots };

    } catch (e: unknown) {
      return this.handleError(e);
    }
  }

  // ── Build Primitive ──────────────────────────────────────────────────────────

  /**
   * Converts a raw Shot object (from Genkit) into a typed ContentPrimitive.
   * The `content` field is a rich Markdown card (readable in the UI).
   * All cinematic values are also stored in `metadata` for programmatic access.
   */
  private buildShotPrimitive(
    shot: Shot,
    parentSceneId: string,
    parentSceneTitle: string,
    order: number
  ): ContentPrimitive {
    const content = this.buildShotMarkdown(shot);

    return this.buildPrimitive(
      `shot_${order}`,
      shot.title || `Plan ${order + 1}`,
      content,
      'shot',
      order,
      {
        metadata: {
          // ── Parent linkage ────────────────────────────────────────────────
          parentSceneId,
          parentSceneTitle,
          sceneTitle: parentSceneTitle,
          // ── Cinematic values ──────────────────────────────────────────────
          shotType:       shot.shotType       || 'PM',
          angle:          shot.angle          || 'Niveau',
          cameraMovement: shot.cameraMovement || 'Fixe',
          lens:           shot.lens,
          frameRate:      shot.frameRate      || '24fps',
          lighting:       shot.lighting,
          soundDesign:    shot.soundDesign,
          duration:       shot.duration,
          notes:          shot.notes,
          characterIds:   shot.characterIds   || [],
          locationId:     shot.locationId,
        },
      }
    );
  }

  /**
   * Renders a rich Markdown card for the shot — displayed in the UI panel.
   * Follows the "découpage technique" sheet format used in professional production.
   */
  private buildShotMarkdown(shot: Shot): string {
    const lines: string[] = [
      `## 🎬 ${shot.title || 'Plan'}`,
      ``,
      `| Paramètre | Valeur |`,
      `|-----------|--------|`,
      `| **Cadrage** | ${shot.shotType || '—'} |`,
      `| **Axe** | ${shot.angle || '—'} |`,
      `| **Mouvement** | ${shot.cameraMovement || '—'} |`,
      `| **Focale** | ${shot.lens || '—'} |`,
      `| **Cadence** | ${shot.frameRate || '24fps'} |`,
      `| **Durée** | ${shot.duration || '—'} |`,
      ``,
      `### 📷 Action visuelle`,
      shot.content || '—',
    ];

    if (shot.lighting) {
      lines.push(``, `### 💡 Éclairage`, shot.lighting);
    }

    if (shot.soundDesign) {
      lines.push(``, `### 🔊 Son & Ambiance`, shot.soundDesign);
    }

    if (shot.notes) {
      lines.push(``, `### 📝 Notes Réalisation / DP`, shot.notes);
    }

    if (shot.characterIds?.length) {
      lines.push(``, `**Personnages :** ${shot.characterIds.join(', ')}`);
    }

    if (shot.locationId) {
      lines.push(`**Lieu :** ${shot.locationId}`);
    }

    return lines.join('\n');
  }

  // ── Update Primitive ─────────────────────────────────────────────────────────

  async updatePrimitive(
    primitiveId: string,
    instruction: string,
    currentContent: ContentPrimitive[],
    context: ProjectContext
  ): Promise<AgentOutput> {
    try {
      const current = currentContent.find(p => p.id === primitiveId);
      if (!current) return this.handleError(new Error(`Plan introuvable: ${primitiveId}`), currentContent);

      const refined = await geminiService.refineStageContent(
        this.stageId,
        current.content,
        instruction,
        await this.getUnifiedContext(context)
      );

      const updated = currentContent.map(p =>
        p.id === primitiveId
          ? { ...p, content: refined, agentGenerated: true }
          : p
      );

      const evalResult = await this.evaluate(updated, context);
      return { ...evalResult, content: updated };

    } catch (e: unknown) {
      return this.handleError(e, currentContent);
    }
  }

  // ── Evaluate ─────────────────────────────────────────────────────────────────

  async evaluate(
    content: ContentPrimitive[],
    context: ProjectContext
  ): Promise<Pick<AgentOutput, 'analysis' | 'state'>> {
    if (content.length === 0) {
      return {
        analysis: this.buildAnalysis(
          'Aucun plan dans le découpage technique.',
          ['Découpage technique vide'],
          ['Lancer la génération du découpage technique']
        ),
        state: 'empty',
      };
    }

    try {
      const unifiedCtx = await this.getUnifiedContext(context);
      // Sample the first 6 shots for the evaluation (avoid token overflow)
      const sampleText = content
        .slice(0, 6)
        .map(p => `[${p.title}]\n${p.content}`)
        .join('\n\n---\n\n');

      const totalShots    = content.length;
      const sceneIds      = new Set(content.map(p => (p.metadata as Record<string, unknown>)?.parentSceneId).filter(Boolean));
      const scenesCount   = sceneIds.size;
      const avgShotsPerScene = scenesCount > 0 ? (totalShots / scenesCount).toFixed(1) : '—';

      const enrichedSample = `STATISTIQUES: ${totalShots} plans | ${scenesCount} scènes | ~${avgShotsPerScene} plans/scène\n\n${sampleText}`;

      const raw = await this.retryWithBackoff(
        () => geminiService.generateStageInsight(this.stageId, enrichedSample, unifiedCtx)
      );

      const analysis = this.buildAnalysis(
        raw.evaluation || `**${totalShots} plans** générés pour ${scenesCount} scènes (~${avgShotsPerScene} plans/scène).`,
        raw.isReady ? [] : (raw.issues || [
          'Vérifier la cohérence des axes de prise de vue (règle des 180°)',
          'S\'assurer que les raccords de regard sont respectés',
        ]),
        raw.isReady ? [] : (raw.recommendations || [
          'Détailler les plans d\'établissement pour chaque lieu',
          'Ajouter des plans cutaway pour renforcer le rythme',
        ]),
        raw.suggestedPrompt
      );

      return { analysis, state: this.computeState(analysis) };

    } catch {
      const totalShots = content.length;
      return {
        analysis: this.buildAnalysis(
          `**${totalShots} plans** générés dans le découpage technique.`,
          [],
          []
        ),
        state: 'good',
      };
    }
  }
}
