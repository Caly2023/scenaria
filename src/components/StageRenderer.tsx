import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Image as ImageIcon } from 'lucide-react';
import { 
  Project, 
  WorkflowStage, 
  Character, 
  Location, 
  Sequence,
  StageInsight,
  ProjectMetadata,
  HydrationState,
} from '../types';
import { StageAnalysis } from '../types/stageContract';


type CanvasErrorBoundaryProps = {
  children: React.ReactNode;
};

type CharacterUpdate = Partial<Character>;
type LocationUpdate = Partial<Location>;
type SequenceUpdate = Partial<Sequence>;

import { getBrainstormStory, getStageInsight } from '../lib/stageUtils';

// Lazy-loaded stage components
const BrainstormingStage = React.lazy(() =>
  import("./stages/BrainstormingStage").then((m) => ({
    default: m.BrainstormingStage,
  })),
);
const LoglineStage = React.lazy(() =>
  import("./stages/LoglineStage").then((m) => ({
    default: m.LoglineStage,
  })),
);
const WorkflowStageComponent = React.lazy(() =>
  import("./stages/WorkflowStage").then((m) => ({
    default: m.WorkflowStage,
  })),
);
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
  const {
    activeStage,
    currentProject,
    pitchPrimitives,
    draftPrimitives,
    loglinePrimitives,
    structurePrimitives,
    beatPrimitives,
    synopsisPrimitives,
    doctoringPrimitives,
    breakdownPrimitives,
    assetPrimitives,
    previsPrimitives,
    exportPrimitives,
    treatmentSequences,
    scriptScenes,
    sequences,
    characters,
    locations,
    isTyping,
    hydrationState,
    refiningBlockId,
    lastUpdatedPrimitiveId,
    
    // Handlers
    handleStoryChange,
    onLoglineChange,
    onContentChange3Act: onContentChange3ActFromContext,
    onValidateBrainstorming,
    onValidateInitialDraft,
    onValidateProjectMetadata,
    onValidateLogline,
    onValidate3Act,
    onValidate8Beat,
    onValidateSynopsis,
    onValidateCharacterBible,
    onValidateLocationBible,
    onValidateTreatment,
    onValidateStepOutline,
    onValidateScript,
    onValidateGlobalDoctoring,
    onValidateTechnicalBreakdown,
    onValidateVisualAssets,
    onValidateAiPrevis,
    onValidateProductionExport,
    
    handleSubcollectionUpdate,
    handleContentUpdate,
    handleStageAnalyze: onAnalyzeStage,
    handleSequenceUpdate,
    handleSequenceAdd,
    handleGenerateViews,
    handleCharacterAdd,
    handleCharacterUpdate,
    handleCharacterDelete,
    handleCharacterDeepDevelop,
    handleLocationAdd,
    handleLocationUpdate,
    handleLocationDelete,
    handleLocationDeepDevelop,
    handleStageRefine,
    handleRegenerate,
    onApplyFix,
    handleMetadataUpdate,
    handleToggleDoctor,
    handleFocusMode,
    handleAiMagic,
  } = project;

  const { t } = useTranslation();
  const { isHydrating, hydratingStage, hydratingLabel } = hydrationState;
  const isHydratingCurrent = isHydrating && hydratingStage === activeStage;

  switch (activeStage) {
    case "Project Metadata":
      return (
        <ProjectMetadataStage
          metadata={currentProject.metadata}
          onUpdate={handleMetadataUpdate}
          onValidate={onValidateProjectMetadata}
          insight={getStageInsight("Project Metadata", currentProject, [])}
        />
      );
    case "Initial Draft":
      return (
        <WorkflowStageComponent
          stage="Initial Draft"
          step={2}
          title={t("stages.Initial Draft.title")}
          subtitle={t("stages.Initial Draft.subtitle")}
          content={draftPrimitives.find(p => p.order !== 0)?.content || ""}
          primitiveId={draftPrimitives.find(p => p.order !== 0)?.id}
          onContentChange={(c) => {
            const id = draftPrimitives.find(p => p.order !== 0)?.id;
            if (id) handleSubcollectionUpdate("draft_primitives", id, c);
          }}
          onValidate={onValidateInitialDraft}
          onRefine={(f, id) => onAnalyzeStage("Initial Draft")}
          onAnalyze={() => onAnalyzeStage("Initial Draft")}
          isGenerating={isTyping}
          validateLabel={t("stages.Initial Draft.validateLabel")}
          insight={getStageInsight("Initial Draft", currentProject, draftPrimitives)}
        />
      );
    case "Brainstorming": {
      return (
        <BrainstormingStage
          story={getBrainstormStory(pitchPrimitives)}
          onStoryChange={handleStoryChange}
          onValidate={onValidateBrainstorming}
          onDoctorToggle={handleToggleDoctor}
          onAnalyze={() => onAnalyzeStage("Brainstorming")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          insight={getStageInsight("Brainstorming", currentProject, pitchPrimitives)}
        />
      );
    }
    case "Logline": {
      const filteredLogline = loglinePrimitives.filter(p => p.order !== 0);
      const loglinePrim = filteredLogline[0];
      return (
        <LoglineStage
          content={loglinePrim?.content || ""}
          primitiveId={loglinePrim?.id}
          onContentChange={onLoglineChange}
          onValidate={onValidateLogline}
          onRefine={onRefineLogline}
          onAnalyze={() => onAnalyzeStage("Logline")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          insight={getStageInsight("Logline", currentProject, loglinePrimitives)}
        />
      );
    }
    case "3-Act Structure": {
      const structureContentItems = structurePrimitives.filter(p => p.order !== 0);
      return (
        <WorkflowStageComponent
          stage="3-Act Structure"
          step={5}
          title={t("stages.3-Act Structure.title")}
          subtitle={t("stages.3-Act Structure.subtitle")}
          content={structureContentItems.length === 1 ? structureContentItems[0].content : ""}
          items={structureContentItems.length > 1 ? structureContentItems : undefined}
          primitiveId={structureContentItems.length === 1 ? structureContentItems[0].id : undefined}
          onContentChange={onContentChange3Act}
          onItemChange={(id, content) => handleSubcollectionUpdate("structure_primitives", id, content)}
          onValidate={onValidate3Act}
          onRefine={onRefine3Act}
          onRegenerate={onRegenerate3Act}
          onAnalyze={() => onAnalyzeStage("3-Act Structure")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === "3-Act Structure")}
          isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === "3-Act Structure"}
          hydrationLabel={hydrationState.hydratingStage === "3-Act Structure" ? hydrationState.hydratingLabel : undefined}
          refiningBlockId={refiningBlockId}
          validateLabel={t("stages.3-Act Structure.validateLabel")}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={getStageInsight("3-Act Structure", currentProject, structurePrimitives)}
        />
      );
    }
    case "8-Beat Structure": {
      const beatContentItems = beatPrimitives.filter(p => p.order !== 0);
      return (
        <WorkflowStageComponent
          stage="8-Beat Structure"
          step={6}
          title={t("stages.8-Beat Structure.title")}
          subtitle={t("stages.8-Beat Structure.subtitle")}
          content={beatContentItems.length === 1 ? beatContentItems[0].content : ""}
          items={beatContentItems.length > 1 ? beatContentItems : undefined}
          primitiveId={beatContentItems.length === 1 ? beatContentItems[0].id : undefined}
          onContentChange={(c) => {
            const id = beatPrimitives.find(p => p.order !== 0)?.id;
            if (id) handleSubcollectionUpdate("beat_primitives", id, c);
          }}
          onItemChange={(id, content) => handleSubcollectionUpdate("beat_primitives", id, content)}
          onValidate={onValidate8Beat}
          onRefine={(f, id) => onAnalyzeStage("8-Beat Structure")}
          onAnalyze={() => onAnalyzeStage("8-Beat Structure")}
          isGenerating={isTyping}
          validateLabel={t("stages.8-Beat Structure.validateLabel")}
          insight={getStageInsight("8-Beat Structure", currentProject, beatPrimitives)}
        />
      );
    }
    case "Synopsis":
      return (
        <WorkflowStageComponent
          stage="Synopsis"
          step={7}
          title={t("stages.Synopsis.title")}
          subtitle={t("stages.Synopsis.subtitle")}
          content={synopsisPrimitives.find(p => p.order !== 0)?.content || ""}
          primitiveId={synopsisPrimitives.find(p => p.order !== 0)?.id}
          onContentChange={onContentChangeSynopsis}
          onValidate={onValidateSynopsis}
          onRefine={onRefineSynopsis}
          onRegenerate={onRegenerateSynopsis}
          onAnalyze={() => onAnalyzeStage("Synopsis")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === "Synopsis")}
          isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === "Synopsis"}
          hydrationLabel={hydrationState.hydratingStage === "Synopsis" ? hydrationState.hydratingLabel : undefined}
          refiningBlockId={refiningBlockId}
          validateLabel={t("stages.Synopsis.validateLabel")}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={getStageInsight("Synopsis", currentProject, synopsisPrimitives)}
        />
      );
    case "Character Bible": {
      const filteredCharacters = characters.filter(p => p.order !== 0);
      return (
        <CharacterBible
          characters={filteredCharacters}
          onCharacterAdd={handleCharacterAdd}
          onCharacterUpdate={handleCharacterUpdate}
          onCharacterDelete={handleCharacterDelete}
          onRefine={onRefineCharacter}
          onGenerateViews={handleGenerateViews}
          onDeepDevelop={(id) => handleCharacterDeepDevelop(id, "Character Bible")}
          isGenerating={isTyping}
          refiningBlockId={refiningBlockId}
          onValidate={onValidateCharacterBible}
          onAnalyze={() => onAnalyzeStage("Character Bible")}
          onApplyFix={onApplyFix}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={getStageInsight("Character Bible", currentProject, (characters as unknown as Sequence[]))}
        />
      );
    }
    case "Location Bible": {
      const filteredLocations = locations.filter(p => p.order !== 0);
      return (
        <LocationBible
          locations={filteredLocations}
          onLocationAdd={handleLocationAdd}
          onLocationUpdate={handleLocationUpdate}
          onLocationDelete={handleLocationDelete}
          onRefine={onRefineLocation}
          onGenerateViews={handleGenerateViews}
          onDeepDevelop={(id) => handleLocationDeepDevelop(id, "Location Bible")}
          isGenerating={isTyping}
          refiningBlockId={refiningBlockId}
          onValidate={onValidateLocationBible}
          onAnalyze={() => onAnalyzeStage("Location Bible")}
          onApplyFix={onApplyFix}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={getStageInsight("Location Bible", currentProject, (locations as unknown as Sequence[]))}
        />
      );
    }
    case "Treatment":
      return (
        <WorkflowStageComponent
          stage="Treatment"
          step={10}
          title={t("stages.Treatment.title")}
          subtitle={t("stages.Treatment.subtitle")}
          content={treatmentSequences[0]?.content || ""}
          items={treatmentSequences}
          onContentChange={onContentChangeTreatment}
          onItemChange={onItemChangeTreatment}
          onValidate={onValidateTreatment}
          onRefine={onRefineTreatment}
          onRegenerate={onRegenerateTreatment}
          onAnalyze={() => onAnalyzeStage("Treatment")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === "Treatment")}
          isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === "Treatment"}
          hydrationLabel={hydrationState.hydratingStage === "Treatment" ? hydrationState.hydratingLabel : undefined}
          refiningBlockId={refiningBlockId}
          validateLabel={t("stages.Treatment.validateLabel")}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={getStageInsight("Treatment", currentProject, treatmentSequences)}
        />
      );
    case "Step Outline":
      return (
        <CanvasErrorBoundary>
          <MainCanvas
            sequences={sequences}
            onSequenceUpdate={handleSequenceUpdate}
            onSequenceAdd={handleSequenceAdd}
            onFocusMode={handleFocusMode}
            onAiMagic={handleAiMagic}
            onValidate={onValidateStepOutline}
            onAnalyze={() => onAnalyzeStage("Step Outline")}
            onApplyFix={onApplyFix}
            isGenerating={isTyping}
            refiningBlockId={refiningBlockId}
            insight={getStageInsight("Step Outline", currentProject, sequences)}
          />
        </CanvasErrorBoundary>
      );
    case "Script":
      return (
        <WorkflowStageComponent
          stage="Script"
          step={12}
          title={t("stages.Script.title")}
          subtitle={t("stages.Script.subtitle")}
          content={scriptScenes[0]?.content || ""}
          items={scriptScenes}
          onContentChange={onContentChangeScript}
          onItemChange={onItemChangeScript}
          onValidate={onValidateScript}
          onRefine={onRefineScript}
          onRegenerate={onRegenerateScript}
          onAnalyze={() => onAnalyzeStage("Script")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping || (hydrationState.isHydrating && hydrationState.hydratingStage === "Script")}
          isHydrating={hydrationState.isHydrating && hydrationState.hydratingStage === "Script"}
          hydrationLabel={hydrationState.hydratingStage === "Script" ? hydrationState.hydratingLabel : undefined}
          refiningBlockId={refiningBlockId}
          validateLabel={t("stages.Script.validateLabel")}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={getStageInsight("Script", currentProject, scriptScenes)}
        />
      );
    case "Global Script Doctoring":
      return (
        <WorkflowStageComponent
          stage="Global Script Doctoring"
          step={13}
          title={t("stages.Global Script Doctoring.title")}
          subtitle={t("stages.Global Script Doctoring.subtitle")}
          content={doctoringPrimitives.find(p => p.order !== 0)?.content || ""}
          items={doctoringPrimitives}
          onContentChange={(c) => {
            const id = doctoringPrimitives.find(p => p.order !== 0)?.id;
            if (id) handleSubcollectionUpdate("doctoring_primitives", id, c);
          }}
          onItemChange={(id, content) => handleSubcollectionUpdate("doctoring_primitives", id, content)}
          onValidate={onValidateGlobalDoctoring}
          onRefine={(f, id) => onAnalyzeStage("Global Script Doctoring")}
          onAnalyze={() => onAnalyzeStage("Global Script Doctoring")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          validateLabel={t("stages.Global Script Doctoring.validateLabel")}
          insight={getStageInsight("Global Script Doctoring", currentProject, doctoringPrimitives)}
        />
      );
    case "Technical Breakdown":
      return (
        <WorkflowStageComponent
          stage="Technical Breakdown"
          step={14}
          title={t("stages.Technical Breakdown.title")}
          subtitle={t("stages.Technical Breakdown.subtitle")}
          content={breakdownPrimitives.find(p => p.order !== 0)?.content || ""}
          items={breakdownPrimitives}
          onContentChange={(c) => {
            const id = breakdownPrimitives.find(p => p.order !== 0)?.id;
            if (id) handleSubcollectionUpdate("breakdown_primitives", id, c);
          }}
          onItemChange={(id, content) => handleSubcollectionUpdate("breakdown_primitives", id, content)}
          onValidate={onValidateTechnicalBreakdown}
          onRefine={(f, id) => onAnalyzeStage("Technical Breakdown")}
          onAnalyze={() => onAnalyzeStage("Technical Breakdown")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          validateLabel={t("stages.Technical Breakdown.validateLabel")}
          insight={getStageInsight("Technical Breakdown", currentProject, breakdownPrimitives)}
        />
      );
    case "Visual Assets":
      return (
        <WorkflowStageComponent
          stage="Visual Assets"
          step={15}
          title={t("stages.Visual Assets.title")}
          subtitle={t("stages.Visual Assets.subtitle")}
          content={assetPrimitives.find(p => p.order !== 0)?.content || ""}
          items={assetPrimitives}
          onContentChange={(c) => {
            const id = assetPrimitives.find(p => p.order !== 0)?.id;
            if (id) handleSubcollectionUpdate("asset_primitives", id, c);
          }}
          onItemChange={(id, content) => handleSubcollectionUpdate("asset_primitives", id, content)}
          onValidate={onValidateVisualAssets}
          onRefine={(f, id) => onAnalyzeStage("Visual Assets")}
          onAnalyze={() => onAnalyzeStage("Visual Assets")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          validateLabel={t("stages.Visual Assets.validateLabel")}
          insight={getStageInsight("Visual Assets", currentProject, assetPrimitives)}
        />
      );
    case "AI Previs":
      return (
        <WorkflowStageComponent
          stage="AI Previs"
          step={16}
          title={t("stages.AI Previs.title")}
          subtitle={t("stages.AI Previs.subtitle")}
          content={previsPrimitives.find(p => p.order !== 0)?.content || ""}
          items={previsPrimitives}
          onContentChange={(c) => {
            const id = previsPrimitives.find(p => p.order !== 0)?.id;
            if (id) handleSubcollectionUpdate("previs_primitives", id, c);
          }}
          onItemChange={(id, content) => handleSubcollectionUpdate("previs_primitives", id, content)}
          onValidate={onValidateAiPrevis}
          onRefine={(f, id) => onAnalyzeStage("AI Previs")}
          onAnalyze={() => onAnalyzeStage("AI Previs")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          validateLabel={t("stages.AI Previs.validateLabel")}
          insight={getStageInsight("AI Previs", currentProject, previsPrimitives)}
        />
      );
    case "Production Export":
      return (
        <WorkflowStageComponent
          stage="Production Export"
          step={17}
          title={t("stages.Production Export.title")}
          subtitle={t("stages.Production Export.subtitle")}
          content={exportPrimitives.find(p => p.order !== 0)?.content || ""}
          items={exportPrimitives}
          onContentChange={(c) => {
            const id = exportPrimitives.find(p => p.order !== 0)?.id;
            if (id) handleSubcollectionUpdate("export_primitives", id, c);
          }}
          onItemChange={(id, content) => handleSubcollectionUpdate("export_primitives", id, content)}
          onValidate={onValidateProductionExport}
          onRefine={(f, id) => onAnalyzeStage("Production Export")}
          onAnalyze={() => onAnalyzeStage("Production Export")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          validateLabel={t("stages.Production Export.validateLabel")}
          insight={getStageInsight("Production Export", currentProject, exportPrimitives)}
        />
      );
    default:
      return (
        <div className="flex-1 flex items-center justify-center text-white/20">
          {t("common.selectStage")}
        </div>
      );
  }
};

export const StageRenderer = React.memo(StageRendererComponent);
