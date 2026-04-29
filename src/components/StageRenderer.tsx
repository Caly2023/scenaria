import React, { Suspense } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { STAGE_DEFINITIONS } from '../config/stageDefinitions';
import { UnifiedStage } from './stages/UnifiedStage';
import { StageSkeleton } from './stages/StageSkeleton';

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

function renderStage(definition: any, project: any, CanvasErrorBoundary: any) {
  const {
    currentProject,
    isTyping,
    refiningBlockId,
    lastUpdatedPrimitiveId,
    handleMetadataUpdate,
    onValidateProjectMetadata,
    onValidateCharacterBible,
    onValidateLocationBible,
    onValidateStepOutline,
    handleCharacterAdd,
    handleCharacterUpdate,
    handleCharacterDelete,
    handleCharacterDeepDevelop,
    handleLocationAdd,
    handleLocationUpdate,
    handleLocationDelete,
    handleLocationDeepDevelop,
    handleGenerateViews,
    handleSequenceUpdate,
    handleSequenceAdd,
    handleFocusMode,
    handleAiMagic,
    handleStageAnalyze,
    onApplyFix,
  } = project;

  if (definition.isCustom) {
    switch (definition.id) {
      case "Project Metadata":
        return (
          <ProjectMetadataStage
            metadata={currentProject.metadata}
            onUpdate={handleMetadataUpdate}
            onValidate={onValidateProjectMetadata}
          />
        );
      case "Character Bible":
        return (
          <CharacterBible
            characters={project.characters.filter((p: any) => p.order !== 0)}
            onCharacterAdd={handleCharacterAdd}
            onCharacterUpdate={handleCharacterUpdate}
            onCharacterDelete={handleCharacterDelete}
            onRefine={(f: string, id: string) => project.handleStageRefine("Character Bible", f, id)}
            onGenerateViews={handleGenerateViews}
            onDeepDevelop={(id: string) => handleCharacterDeepDevelop(id, "Character Bible")}
            isGenerating={isTyping}
            refiningBlockId={refiningBlockId}
            onValidate={onValidateCharacterBible}
            onAnalyze={() => handleStageAnalyze("Character Bible")}
            onApplyFix={onApplyFix}
            lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
            insight={currentProject.stageAnalyses?.["Character Bible"]}
          />
        );
      case "Location Bible":
        return (
          <LocationBible
            locations={project.locations.filter((p: any) => p.order !== 0)}
            onLocationAdd={handleLocationAdd}
            onLocationUpdate={handleLocationUpdate}
            onLocationDelete={handleLocationDelete}
            onRefine={(f: string, id: string) => project.handleStageRefine("Location Bible", f, id)}
            onGenerateViews={handleGenerateViews}
            onDeepDevelop={(id: string) => handleLocationDeepDevelop(id, "Location Bible")}
            isGenerating={isTyping}
            refiningBlockId={refiningBlockId}
            onValidate={onValidateLocationBible}
            onAnalyze={() => handleStageAnalyze("Location Bible")}
            onApplyFix={onApplyFix}
            lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
            insight={currentProject.stageAnalyses?.["Location Bible"]}
          />
        );
      case "Step Outline":
        return (
          <CanvasErrorBoundary>
            <MainCanvas
              sequences={project.sequences}
              onSequenceUpdate={handleSequenceUpdate}
              onSequenceAdd={handleSequenceAdd}
              onFocusMode={handleFocusMode}
              onAiMagic={handleAiMagic}
              onValidate={onValidateStepOutline}
              onAnalyze={() => handleStageAnalyze("Step Outline")}
              onApplyFix={onApplyFix}
              isGenerating={isTyping}
              refiningBlockId={refiningBlockId}
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
