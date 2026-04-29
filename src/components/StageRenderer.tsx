import React, { Suspense } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { stageRegistry } from '../config/stageRegistry';
import { UnifiedStage } from './stages/UnifiedStage';
import { StageSkeleton } from './stages/StageSkeleton';
import { StageDefinition } from '../config/stageRegistry';
import { WorkflowStage } from '../types';

// Lazy-loaded custom stage components
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
      default:
        return <UnifiedStage definition={definition} />;
    }
  }

  if (definition.id === "Step Outline") {
    return (
      <CanvasErrorBoundary>
        <UnifiedStage definition={definition} />
      </CanvasErrorBoundary>
    );
  }

  return <UnifiedStage definition={definition} />;
}

export const StageRenderer = React.memo(StageRendererComponent);
