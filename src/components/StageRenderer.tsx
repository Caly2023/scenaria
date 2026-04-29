import React, { Suspense } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { stageRegistry } from '../config/stageRegistry';
import { UnifiedStage } from './stages/UnifiedStage';
import { StageSkeleton } from './stages/StageSkeleton';
import { StageDefinition } from '../config/stageRegistry';
import { ContentPrimitive } from '../types/stageContract';
import { WorkflowStage } from '../types';

// Lazy-loaded custom stage components
const CharacterBible = React.lazy(() =>
  import("./stages/CharacterBible").then((m) => ({
    default: m.CharacterBible,
  })),
);
const LocationBible = React.lazy(() =>
  import("./stages/LocationBible").then((m) => ({
    default: m.LocationBible,
  })),
);
const MainCanvas = React.lazy(() =>
  import("./stages/MainCanvas").then((m) => ({ default: m.MainCanvas })),
);
const ProjectMetadataStage = React.lazy(() =>
  import("./stages/ProjectMetadataStage").then((m) => ({ default: m.ProjectMetadataStage })),
);

/** Minimal passthrough wrapper used as a default CanvasErrorBoundary. */
const DefaultBoundary = ({ children }: { children: React.ReactNode }) => <>{children}</>;

interface StageRendererProps {
  /** Optional error boundary to wrap the MainCanvas (Step Outline) stage. */
  CanvasErrorBoundary?: React.ComponentType<{ children: React.ReactNode }>;
}

const StageRendererComponent = ({ CanvasErrorBoundary = DefaultBoundary }: StageRendererProps) => {
  const project = useProject();
  const { activeStage } = project;
  const { t } = useTranslation();

  const definition = stageRegistry.get(activeStage);

  if (!definition) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20">
        Stage not found: {activeStage}
      </div>
    );
  }

  return (
    <Suspense fallback={<StageSkeleton />}>
      {renderStage(definition, project, CanvasErrorBoundary, t)}
    </Suspense>
  );
};

function renderStage(
  definition: StageDefinition,
  project: ReturnType<typeof useProject>,
  CanvasErrorBoundary: React.ComponentType<{ children: React.ReactNode }>,
  t: (key: string) => string,
) {
  const { currentProject } = project;
  if (!currentProject) return null;

  if (definition.isCustom) {
    switch (definition.id) {
      case "Project Metadata":
        return (
          <ProjectMetadataStage
            metadata={currentProject.metadata}
            onUpdate={project.handleMetadataUpdate}
            onValidate={() => project.onValidateStage("Project Metadata")}
          />
        );
      case "Character Bible":
        return (
          <CharacterBible
            characters={(project.stageContents["Character Bible"] || []).filter((p: ContentPrimitive) => p.order !== 0)}
            onCharacterAdd={(name, description, tier) => project.handlePrimitiveAdd("Character Bible", { name, description, tier })}
            onCharacterUpdate={(id, updates) => project.handlePrimitiveUpdate("Character Bible", id, updates)}
            onCharacterDelete={(id) => project.handlePrimitiveDelete("Character Bible", id)}
            onRefine={(f: string, id?: string) => project.handleStageRefine("Character Bible", f, id)}
            onGenerateViews={project.handleGenerateViews}
            onDeepDevelop={(id: string) => project.handleCharacterDeepDevelop(id, "Character Bible")}
            isGenerating={project.isTyping}
            refiningBlockId={project.refiningBlockId}
            onValidate={() => project.onValidateStage("Character Bible")}
            onAnalyze={() => project.handleStageAnalyze("Character Bible")}
            onApplyFix={project.onApplyFix}
            lastUpdatedPrimitiveId={project.lastUpdatedPrimitiveId}
            insight={currentProject.stageAnalyses?.["Character Bible"]}
          />
        );
      case "Location Bible":
        return (
          <LocationBible
            locations={(project.stageContents["Location Bible"] || []).filter((p: ContentPrimitive) => p.order !== 0)}
            onLocationAdd={(name, description) => project.handlePrimitiveAdd("Location Bible", { name, description })}
            onLocationUpdate={(id, updates) => project.handlePrimitiveUpdate("Location Bible", id, updates)}
            onLocationDelete={(id) => project.handlePrimitiveDelete("Location Bible", id)}
            onRefine={(f: string, id?: string) => project.handleStageRefine("Location Bible", f, id)}
            onGenerateViews={project.handleGenerateViews}
            onDeepDevelop={(id: string) => project.handleLocationDeepDevelop(id, "Location Bible")}
            isGenerating={project.isTyping}
            refiningBlockId={project.refiningBlockId}
            onValidate={() => project.onValidateStage("Location Bible")}
            onAnalyze={() => project.handleStageAnalyze("Location Bible")}
            onApplyFix={project.onApplyFix}
            lastUpdatedPrimitiveId={project.lastUpdatedPrimitiveId}
            insight={currentProject.stageAnalyses?.["Location Bible"]}
          />
        );
      case "Step Outline": {
        const stepOutlineItems = project.stageContents["Step Outline"] || [];
        return (
          <CanvasErrorBoundary>
            <MainCanvas
              sequences={stepOutlineItems}
              onSequenceUpdate={(id, updates) => project.handlePrimitiveUpdate("Step Outline", id, updates)}
              onSequenceAdd={() => project.handlePrimitiveAdd("Step Outline", {
                title: t("common.newSequenceLabel"),
                content: "",
                order: stepOutlineItems.length,
              })}
              onFocusMode={project.handleFocusMode}
              onAiMagic={project.handleAiMagic}
              onValidate={() => project.onValidateStage("Step Outline")}
              onAnalyze={() => project.handleStageAnalyze("Step Outline")}
              onApplyFix={project.onApplyFix}
              isGenerating={project.isTyping}
              refiningBlockId={project.refiningBlockId}
              insight={currentProject.stageAnalyses?.["Step Outline"]}
            />
          </CanvasErrorBoundary>
        );
      }
      default:
        return <UnifiedStage definition={definition} />;
    }
  }

  return <UnifiedStage definition={definition} />;
}

export const StageRenderer = React.memo(StageRendererComponent);
