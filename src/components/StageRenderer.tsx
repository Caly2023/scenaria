import React, { Suspense } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { STAGE_DEFINITIONS } from '../config/stageDefinitions';
import { UnifiedStage } from './stages/UnifiedStage';
import { StageSkeleton } from './stages/StageSkeleton';
import { ProjectContextType } from '../contexts/ProjectContext';
import { StageDefinition } from '../config/stageDefinitions';
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

const StageRendererComponent = ({ CanvasErrorBoundary }: { CanvasErrorBoundary: React.ComponentType<{ children: React.ReactNode }> }) => {
  const project = useProject();
  const { activeStage } = project;

  const definition = STAGE_DEFINITIONS[activeStage];
  
  if (!definition) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20">
        Stage not found: {activeStage}
      </div>
    );
  }

  return (
    <Suspense fallback={<StageSkeleton />}>
      {renderStage(definition, project, CanvasErrorBoundary)}
    </Suspense>
  );
};

function renderStage(
  definition: StageDefinition, 
  project: ProjectContextType, 
  CanvasErrorBoundary: React.ComponentType<{ children: React.ReactNode }>
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
            onValidate={project.onValidateProjectMetadata}
          />
        );
      case "Character Bible":
        return (
          <CharacterBible
            characters={(project.stageContents["Character Bible"] || []).filter((p) => p.order !== 0)}
            onCharacterAdd={project.handleCharacterAdd}
            onCharacterUpdate={project.handleCharacterUpdate}
            onCharacterDelete={project.handleCharacterDelete}
            onRefine={(f: string, id: string) => project.handleStageRefine("Character Bible", f, id)}
            onGenerateViews={project.handleGenerateViews}
            onDeepDevelop={(id: string) => project.handleCharacterDeepDevelop(id, "Character Bible")}
            isGenerating={project.isTyping}
            refiningBlockId={project.refiningBlockId}
            onValidate={project.onValidateCharacterBible}
            onAnalyze={() => project.handleStageAnalyze("Character Bible")}
            onApplyFix={project.onApplyFix}
            lastUpdatedPrimitiveId={project.lastUpdatedPrimitiveId}
            insight={currentProject.stageAnalyses?.["Character Bible"]}
          />
        );
      case "Location Bible":
        return (
          <LocationBible
            locations={(project.stageContents["Location Bible"] || []).filter((p) => p.order !== 0)}
            onLocationAdd={project.handleLocationAdd}
            onLocationUpdate={project.handleLocationUpdate}
            onLocationDelete={project.handleLocationDelete}
            onRefine={(f: string, id: string) => project.handleStageRefine("Location Bible", f, id)}
            onGenerateViews={project.handleGenerateViews}
            onDeepDevelop={(id: string) => project.handleLocationDeepDevelop(id, "Location Bible")}
            isGenerating={project.isTyping}
            refiningBlockId={project.refiningBlockId}
            onValidate={project.onValidateLocationBible}
            onAnalyze={() => project.handleStageAnalyze("Location Bible")}
            onApplyFix={project.onApplyFix}
            lastUpdatedPrimitiveId={project.lastUpdatedPrimitiveId}
            insight={currentProject.stageAnalyses?.["Location Bible"]}
          />
        );
      case "Step Outline":
        return (
          <CanvasErrorBoundary>
            <MainCanvas
              sequences={project.stageContents["Step Outline"] || []}
              onSequenceUpdate={project.handleSequenceUpdate}
              onSequenceAdd={project.handleSequenceAdd}
              onFocusMode={project.handleFocusMode}
              onAiMagic={project.handleAiMagic}
              onValidate={project.onValidateStepOutline}
              onAnalyze={() => project.handleStageAnalyze("Step Outline")}
              onApplyFix={project.onApplyFix}
              isGenerating={project.isTyping}
              refiningBlockId={project.refiningBlockId}
              insight={currentProject.stageAnalyses?.["Step Outline"]}
            />
          </CanvasErrorBoundary>
        );
      default:
        return <UnifiedStage definition={definition} />;
    }
  }

  return <UnifiedStage definition={definition} />;
}

export const StageRenderer = React.memo(StageRendererComponent);
