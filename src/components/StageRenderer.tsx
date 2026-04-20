import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Image as ImageIcon } from 'lucide-react';
import { 
  Project, 
  WorkflowStage, 
  Character, 
  Location, 
  Sequence,
} from '../types';

type BrainstormPrimitive = Sequence & { primitiveType?: string };
type HydrationState = {
  isHydrating: boolean;
  hydratingStage: WorkflowStage | null;
  hydratingLabel: string | null;
  resetHydration?: (stage: WorkflowStage) => void;
};

type CanvasErrorBoundaryProps = {
  children: React.ReactNode;
};

type CharacterUpdate = Partial<Character>;
type LocationUpdate = Partial<Location>;
type SequenceUpdate = Partial<Sequence>;

function getBrainstormStory(primitives: Sequence[]): string {
  const typedPrimitives = primitives as BrainstormPrimitive[];
  return typedPrimitives.find((p) => p.primitiveType === 'brainstorming_result')?.content
    // Backward compatibility for older projects
    || typedPrimitives.find((p) => p.primitiveType === 'pitch_result')?.content
    || primitives.find((p) => /pitch|story|input/i.test(p.title || ''))?.content
    || primitives.find((p) => p.order === 1)?.content
    || primitives[0]?.content
    || "";
}

// Lazy-loaded stage components
const BrainstormingStage = React.lazy(() =>
  import("./BrainstormingStage").then((m) => ({
    default: m.BrainstormingStage,
  })),
);
const LoglineStage = React.lazy(() =>
  import("./LoglineStage").then((m) => ({
    default: m.LoglineStage,
  })),
);
const WorkflowStageComponent = React.lazy(() =>
  import("./WorkflowStage").then((m) => ({
    default: m.WorkflowStage,
  })),
);
const CharacterBible = React.lazy(() =>
  import("./CharacterBible").then((m) => ({
    default: m.CharacterBible,
  })),
);
const LocationBible = React.lazy(() =>
  import("./LocationBible").then((m) => ({
    default: m.LocationBible,
  })),
);
const MainCanvas = React.lazy(() =>
  import("./MainCanvas").then((m) => ({ default: m.MainCanvas })),
);

interface StageRendererProps {
  activeStage: WorkflowStage;
  currentProject: Project;
  pitchPrimitives: Sequence[];
  loglinePrimitives: Sequence[];
  structurePrimitives: Sequence[];
  synopsisPrimitives: Sequence[];
  treatmentSequences: Sequence[];
  scriptScenes: Sequence[];
  sequences: Sequence[];
  characters: Character[];
  locations: Location[];
  isTyping: boolean;
  hydrationState: HydrationState;
  refiningBlockId: string | null;
  lastUpdatedPrimitiveId: string | null;
  
  // Callbacks
  handleStoryChange: (c: string) => void;
  onLoglineChange: (c: string) => void;
  onRefineLogline: (f?: string) => void;
  onContentChange3Act: (c: string) => void;
  onRefine3Act: (f?: string, blockId?: string) => void;
  onRegenerate3Act: () => void;
  onContentChangeSynopsis: (c: string) => void;
  onRefineSynopsis: (f?: string, blockId?: string) => void;
  onRegenerateSynopsis: () => void;
  onContentChangeTreatment: (c: string) => void;
  onItemChangeTreatment: (id: string, content: string) => void;
  onRefineTreatment: (f?: string, blockId?: string) => void;
  onRegenerateTreatment: () => void;
  onContentChangeScript: (c: string) => void;
  onItemChangeScript: (id: string, content: string) => void;
  onRefineScript: (f?: string, blockId?: string) => void;
  onRegenerateScript: () => void;
  handleCharacterAdd: (name: string, description: string, tier: Character['tier']) => void;
  handleCharacterUpdate: (id: string, updates: CharacterUpdate) => void;
  handleCharacterDelete: (id: string) => void;
  handleLocationAdd: (name: string, description: string) => void;
  handleLocationUpdate: (id: string, updates: LocationUpdate) => void;
  handleLocationDelete: (id: string) => void;
  handleGenerateViews: (id: string) => void;
  handleCharacterDeepDevelop: (id: string, stage: WorkflowStage) => void;
  handleLocationDeepDevelop: (id: string, stage: WorkflowStage) => void;
  handleSequenceUpdate: (id: string, updates: SequenceUpdate) => void;
  handleSequenceAdd: () => void;
  handleFocusMode: (id: string) => void;
  handleAiMagic: (id: string) => void;
  handleToggleDoctor: () => void;
  handleSubcollectionUpdate: (coll: string, id: string, content: string) => void;
  
  // Validation Callbacks
  onValidateBrainstorming: () => void;
  onValidateLogline: () => void;
  onValidate3Act: () => void;
  onValidateSynopsis: () => void;
  onValidateCharacterBible: () => void;
  onValidateLocationBible: () => void;
  onValidateTreatment: () => void;
  onValidateStepOutline: () => void;
  onValidateScript: () => void;
  onValidateStoryboard: () => void;
  
  onAnalyzeStage: (stage: WorkflowStage) => Promise<void>;
  onApplyFix: (prompt: string) => void;
  
  // Error Boundary Wrapper
  CanvasErrorBoundary: React.ComponentType<CanvasErrorBoundaryProps>;
}

const StageRendererComponent = ({
  activeStage,
  currentProject,
  pitchPrimitives,
  loglinePrimitives,
  structurePrimitives,
  synopsisPrimitives,
  treatmentSequences,
  scriptScenes,
  sequences,
  characters,
  locations,
  isTyping,
  hydrationState,
  refiningBlockId,
  lastUpdatedPrimitiveId,
  
  handleStoryChange,
  onLoglineChange,
  onRefineLogline,
  onContentChange3Act,
  onRefine3Act,
  onRegenerate3Act,
  onContentChangeSynopsis,
  onRefineSynopsis,
  onRegenerateSynopsis,
  onContentChangeTreatment,
  onItemChangeTreatment,
  onRefineTreatment,
  onRegenerateTreatment,
  onContentChangeScript,
  onItemChangeScript,
  onRefineScript,
  onRegenerateScript,
  handleCharacterAdd,
  handleCharacterUpdate,
  handleCharacterDelete,
  handleLocationAdd,
  handleLocationUpdate,
  handleLocationDelete,
  handleGenerateViews,
  handleCharacterDeepDevelop,
  handleLocationDeepDevelop,
  handleSequenceUpdate,
  handleSequenceAdd,
  handleFocusMode,
  handleAiMagic,
  handleToggleDoctor,
  handleSubcollectionUpdate,
  
  onValidateBrainstorming,
  onValidateLogline,
  onValidate3Act,
  onValidateSynopsis,
  onValidateCharacterBible,
  onValidateLocationBible,
  onValidateTreatment,
  onValidateStepOutline,
  onValidateScript,
  onValidateStoryboard,
  
  onAnalyzeStage,
  onApplyFix,

  CanvasErrorBoundary
}: StageRendererProps) => {
  const { t } = useTranslation();

  switch (activeStage) {
    case "Brainstorming":
      return (
        <BrainstormingStage
          story={getBrainstormStory(pitchPrimitives)}
          onStoryChange={handleStoryChange}
          onValidate={onValidateBrainstorming}
          onDoctorToggle={handleToggleDoctor}
          onAnalyze={() => onAnalyzeStage("Brainstorming")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          insight={currentProject.stageAnalyses?.["Brainstorming"]}
        />
      );
    case "Logline":
      return (
        <LoglineStage
          content={loglinePrimitives[0]?.content || ""}
          onContentChange={onLoglineChange}
          onValidate={onValidateLogline}
          onRefine={onRefineLogline}
          onAnalyze={() => onAnalyzeStage("Logline")}
          onApplyFix={onApplyFix}
          isGenerating={isTyping}
          insight={currentProject.stageAnalyses?.["Logline"]}
        />
      );
    case "3-Act Structure":
      return (
        <WorkflowStageComponent
          stage="3-Act Structure"
          step={3}
          title={t("stages.3-Act Structure.title")}
          subtitle={t("stages.3-Act Structure.subtitle")}
          content={structurePrimitives.length === 1 ? structurePrimitives[0].content : ""}
          items={structurePrimitives.length > 1 ? structurePrimitives : undefined}
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
          insight={currentProject.stageAnalyses?.["3-Act Structure"]}
        />
      );
    case "Synopsis":
      return (
        <WorkflowStageComponent
          stage="Synopsis"
          step={4}
          title={t("stages.Synopsis.title")}
          subtitle={t("stages.Synopsis.subtitle")}
          content={synopsisPrimitives[0]?.content || ""}
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
          insight={currentProject.stageAnalyses?.["Synopsis"]}
        />
      );
    case "Character Bible":
      return (
        <CharacterBible
          characters={characters}
          onCharacterAdd={handleCharacterAdd}
          onCharacterUpdate={handleCharacterUpdate}
          onCharacterDelete={handleCharacterDelete}
          onGenerateViews={handleGenerateViews}
          onDeepDevelop={(id) => handleCharacterDeepDevelop(id, "Character Bible")}
          isGenerating={isTyping}
          refiningBlockId={refiningBlockId}
          onValidate={onValidateCharacterBible}
          onAnalyze={() => onAnalyzeStage("Character Bible")}
          onApplyFix={onApplyFix}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={currentProject.stageAnalyses?.["Character Bible"]}
        />
      );
    case "Location Bible":
      return (
        <LocationBible
          locations={locations}
          onLocationAdd={handleLocationAdd}
          onLocationUpdate={handleLocationUpdate}
          onLocationDelete={handleLocationDelete}
          onGenerateViews={handleGenerateViews}
          onDeepDevelop={(id) => handleLocationDeepDevelop(id, "Location Bible")}
          isGenerating={isTyping}
          refiningBlockId={refiningBlockId}
          onValidate={onValidateLocationBible}
          onAnalyze={() => onAnalyzeStage("Location Bible")}
          onApplyFix={onApplyFix}
          lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
          insight={currentProject.stageAnalyses?.["Location Bible"]}
        />
      );
    case "Treatment":
      return (
        <WorkflowStageComponent
          stage="Treatment"
          step={7}
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
          insight={currentProject.stageAnalyses?.["Treatment"]}
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
            insight={currentProject.stageAnalyses?.["Step Outline"]}
          />
        </CanvasErrorBoundary>
      );
    case "Script":
      return (
        <WorkflowStageComponent
          stage="Script"
          step={9}
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
          insight={currentProject.stageAnalyses?.["Script"]}
        />
      );
    case "Storyboard":
      return (
        <div className="w-full space-y-12 py-24 flex flex-col items-center justify-center text-center">
          <div className="max-w-2xl space-y-8">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8">
              <ImageIcon className="w-12 h-12 text-white/20" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tighter text-white">
              {t("stages.Storyboard.title")}
            </h2>
            <p className="text-secondary text-lg">
              {t("stages.Storyboard.subtitle")}
            </p>
            <div className="bg-surface p-8 rounded-[32px] border border-white/5">
              <p className="text-white/40 font-medium">
                {t("stages.Storyboard.comingSoon")}
              </p>
            </div>
            <button
              onClick={onValidateStoryboard}
              className="px-12 py-5 rounded-2xl bg-[#2a2a2a] text-white border border-[#444444] font-semibold tracking-tight hover:bg-[#333333] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-2xl mx-auto"
            >
              <Check className="w-5 h-5" />
              {t("common.completeProject")}
            </button>
          </div>
        </div>
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
