import { useState, useCallback, useMemo, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useIdleTimer } from "react-idle-timer";
import { db } from "./lib/firebase";
import { useAppAuth as useAuth } from "./hooks/useAppAuth";
import { useProjects } from "./hooks/useProjects";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useProjectLifecycle } from "./hooks/useProjectLifecycle";
import { useScriptDoctor } from "./hooks/useScriptDoctor";
import { useAppCallbacks } from "./hooks/useAppCallbacks";
import { contextAssembler } from "./services/contextAssembler";
import { aiQuotaState } from "./services/serviceState";
import { consumeQuotaNotice } from "./services/geminiService";
import { useAutoHydration } from "./hooks/useAutoHydration";
import { WorkflowStage } from "./types";
import { FocusMode } from "./components/FocusMode";
import { LoadingPage } from "./components/LoadingPage";
import { OfflinePage, ConnectionErrorPage, NotFoundPage } from "./components/ErrorPages";
import { HomePage } from "./components/HomePage";
import { MainLayout } from "./components/MainLayout";
import { StageRenderer } from "./components/StageRenderer";
import { ScriptDoctor as ScriptDoctorComponent } from "./components/ScriptDoctor";

const NOOP = () => {};

export default function App() {
  const [toasts, setToasts] = useState<any[]>([]);
  const addToast = useCallback((message: string, type: 'error' | 'info' | 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const { user, isAuthReady, isOffline, connectionError } = useAuth();
  const { 
    projects, currentProject, currentProjectId, isProjectLoading, isProjectNotFound, handleProjectSelect, handleProjectExit, handleProjectCreate, handleProjectDelete, handleStageChange, handleMetadataUpdate, handleContentUpdate, handleSubcollectionUpdate,
    isTyping, setIsTyping, isRegenerating, syncStatus, setSyncStatus, handleRegenerate, handleStageValidate, activeStage, handleStageRefine, handleStageAnalyze,
    pitchPrimitives, loglinePrimitives, structurePrimitives, synopsisPrimitives, characters, locations, treatmentSequences, sequences, scriptScenes,
    isDeleting, setIsDeleting, projectToDelete, setProjectToDelete
  } = useProjects(user, addToast);

  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(!localStorage.getItem("scenaria_onboarded"));
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusedSequenceId, setFocusedSequenceId] = useState<string | null>(null);
  const [accessibilitySettings, setAccessibilitySettings] = useState({ fontSize: "medium", contrast: "normal", motion: "standard" });
  const [refiningBlockId, setRefiningBlockId] = useState<string | null>(null);
  const [lastUpdatedPrimitiveId, setLastUpdatedPrimitiveId] = useState<string | null>(null);

  const getProjectContext = useCallback(async () => {
    if (!currentProject) return "";
    return await contextAssembler.assembleProjectContext(currentProject, {
      pitchPrimitives, loglinePrimitives, structurePrimitives, synopsisPrimitives, characters, locations, treatmentSequences, sequences, scriptScenes
    });
  }, [currentProject, pitchPrimitives, loglinePrimitives, structurePrimitives, synopsisPrimitives, characters, locations, treatmentSequences, sequences, scriptScenes]);

  const hydrationState = useAutoHydration(currentProject, getProjectContext);


  const {
    isDoctorOpen, setIsDoctorOpen, doctorMessages, isDoctorTyping, isHeavyThinking, activeTool, aiStatus, handleDoctorMessage
  } = useScriptDoctor({
    currentProject, activeStage, sequences, treatmentSequences, scriptScenes, pitchPrimitives, characters, locations, addToast, setRefiningBlockId, setLastUpdatedPrimitiveId, handleStageAnalyze
  });

  const handleToggleDoctor = useCallback(() => setIsDoctorOpen(prev => !prev), [setIsDoctorOpen]);
  const handleOpenDoctor = useCallback(() => setIsDoctorOpen(true), [setIsDoctorOpen]);
  const handleCloseDoctor = useCallback(() => setIsDoctorOpen(false), [setIsDoctorOpen]);
  const handleOpenDrawer = useCallback(() => setIsProjectDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsProjectDrawerOpen(false), []);
  const handleCloseFocus = useCallback(() => setIsFocusMode(false), []);
  const handleCancelDelete = useCallback(() => setProjectToDelete(null), []);

  useKeyboardShortcuts({
    onProjectSwitch: handleProjectExit, onDoctorToggle: handleToggleDoctor, onStageChange: handleStageChange, activeStage, stages: ["Brainstorming", "Logline", "3-Act Structure", "Synopsis", "Character Bible", "Location Bible", "Treatment", "Step Outline", "Script", "Storyboard"] as WorkflowStage[], onShowHelp: () => setIsHelpOpen(true)
  });

  const handleFocusMode = useCallback((id: string) => { setFocusedSequenceId(id); setIsFocusMode(true); }, []);
  const handleDeleteCurrentProject = useCallback(() => { if (currentProject) setProjectToDelete(currentProject.id); }, [currentProject]);

  const {
    handleStoryChange, onLoglineChange, handleCharacterAdd, handleCharacterUpdate, handleCharacterDelete, handleLocationAdd, handleLocationUpdate, handleLocationDelete, onValidateBrainstorming, onValidateLogline, onValidate3Act, onValidateSynopsis, onValidateCharacterBible, onValidateLocationBible, onValidateTreatment, onValidateStepOutline, onValidateScript, onValidateStoryboard
  } = useAppCallbacks({
    currentProject, addToast, handleSubcollectionUpdate, handleContentUpdate, handleStageValidate, pitchPrimitives, loglinePrimitives
  });

  const onRefineLogline = useCallback((f?: string) => handleStageRefine("Logline", f), [handleStageRefine]);
  const onContentChange3Act = useCallback((c: string) => {
    const id = structurePrimitives[0]?.id;
    if (id && structurePrimitives.length === 1) handleSubcollectionUpdate("structure_primitives", id, c);
  }, [structurePrimitives, handleSubcollectionUpdate]);
  const onRefine3Act = useCallback((f?: string, id?: string) => handleStageRefine("3-Act Structure", f, id), [handleStageRefine]);
  const onRegenerate3Act = useCallback(() => handleRegenerate("3-Act Structure"), [handleRegenerate]);
  const onContentChangeSynopsis = useCallback((c: string) => {
    const id = synopsisPrimitives[0]?.id;
    if (id) handleSubcollectionUpdate("synopsis_primitives", id, c);
  }, [synopsisPrimitives, handleSubcollectionUpdate]);
  const onRefineSynopsis = useCallback((f?: string, id?: string) => handleStageRefine("Synopsis", f, id), [handleStageRefine]);
  const onRegenerateSynopsis = useCallback(() => handleRegenerate("Synopsis"), [handleRegenerate]);
  const onContentChangeTreatment = useCallback((c: string) => handleContentUpdate("treatmentDraft", c), [handleContentUpdate]);
  const onItemChangeTreatment = useCallback((id: string, content: string) => handleSubcollectionUpdate("treatment_sequences", id, content), [handleSubcollectionUpdate]);
  const onRefineTreatment = useCallback((f?: string, id?: string) => handleStageRefine("Treatment", f, id), [handleStageRefine]);
  const onRegenerateTreatment = useCallback(() => handleRegenerate("Treatment"), [handleRegenerate]);
  const onContentChangeScript = useCallback((c: string) => handleContentUpdate("scriptDraft", c), [handleContentUpdate]);
  const onItemChangeScript = useCallback((id: string, content: string) => handleSubcollectionUpdate("script_scenes", id, content), [handleSubcollectionUpdate]);
  const onRefineScript = useCallback((f?: string, id?: string) => handleStageRefine("Script", f, id), [handleStageRefine]);
  const onRegenerateScript = useCallback(() => handleRegenerate("Script"), [handleRegenerate]);

  if (!isAuthReady) return <LoadingPage />;
  if (isOffline) return <OfflinePage onRetry={() => window.location.reload()} />;
  if (connectionError) return <ConnectionErrorPage onRetry={() => window.location.reload()} />;
  if (isProjectLoading) return <LoadingPage />;
  if (isProjectNotFound) return <NotFoundPage onBackHome={handleProjectExit} />;

  if (!currentProject) {
    return (
      <HomePage
        projects={projects}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={(id) => setProjectToDelete(id)}
      />
    );
  }

  const renderStage = () => (
    <StageRenderer
      activeStage={activeStage}
      currentProject={currentProject}
      isTyping={isTyping}
      refiningBlockId={refiningBlockId}
      pitchPrimitives={pitchPrimitives}
      loglinePrimitives={loglinePrimitives}
      structurePrimitives={structurePrimitives}
      synopsisPrimitives={synopsisPrimitives}
      characters={characters}
      locations={locations}
      treatmentSequences={treatmentSequences}
      sequences={sequences}
      scriptScenes={scriptScenes}
      handleStoryChange={handleStoryChange}
      onLoglineChange={onLoglineChange}
      onRefineLogline={onRefineLogline}
      onContentChange3Act={onContentChange3Act}
      onRefine3Act={onRefine3Act}
      onRegenerate3Act={onRegenerate3Act}
      onContentChangeSynopsis={onContentChangeSynopsis}
      onRefineSynopsis={onRefineSynopsis}
      onRegenerateSynopsis={onRegenerateSynopsis}
      onContentChangeTreatment={onContentChangeTreatment}
      onItemChangeTreatment={onItemChangeTreatment}
      onRefineTreatment={onRefineTreatment}
      onRegenerateTreatment={onRegenerateTreatment}
      onContentChangeScript={onContentChangeScript}
      onItemChangeScript={onItemChangeScript}
      onRefineScript={onRefineScript}
      onRegenerateScript={onRegenerateScript}
      handleCharacterAdd={handleCharacterAdd}
      handleCharacterUpdate={handleCharacterUpdate}
      handleCharacterDelete={handleCharacterDelete}
      handleLocationAdd={handleLocationAdd}
      handleLocationUpdate={handleLocationUpdate}
      handleLocationDelete={handleLocationDelete}
      handleGenerateViews={NOOP}
      handleCharacterDeepDevelop={NOOP}
      handleLocationDeepDevelop={NOOP}
      handleSequenceUpdate={NOOP}
      handleSequenceAdd={NOOP}
      handleFocusMode={handleFocusMode}
      onValidateBrainstorming={onValidateBrainstorming}
      onValidateLogline={onValidateLogline}
      onValidate3Act={onValidate3Act}
      onValidateSynopsis={onValidateSynopsis}
      onValidateCharacterBible={onValidateCharacterBible}
      onValidateLocationBible={onValidateLocationBible}
      onValidateTreatment={onValidateTreatment}
      onValidateStepOutline={onValidateStepOutline}
      onValidateScript={onValidateScript}
      onValidateStoryboard={onValidateStoryboard}
    />
  );

  return (
    <>
      <MainLayout
        currentProject={currentProject}
        activeStage={activeStage}
        isMobile={window.innerWidth < 768}
        isDoctorOpen={isDoctorOpen}
        isFocusMode={isFocusMode}
        isTyping={isTyping}
        isHeavyThinking={isHeavyThinking}
        isProjectDrawerOpen={isProjectDrawerOpen}
        isHelpOpen={isHelpOpen}
        isFirstTime={isFirstTime}
        isDeleting={isDeleting}
        projectToDelete={projectToDelete}
        toasts={toasts}
        syncStatus={syncStatus}
        collaborators={[]}
        accessibilitySettings={accessibilitySettings}
        refiningBlockId={refiningBlockId}
        lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
        hydrationState={hydrationState}
        telemetryStatus={{}}
        doctorMessages={doctorMessages}
        isDoctorTyping={isDoctorTyping}
        aiStatus={aiStatus}
        activeTool={activeTool}
        handleStageChange={handleStageChange}
        handleProjectExit={handleProjectExit}
        handleOpenDoctor={handleOpenDoctor}
        handleCloseDoctor={handleCloseDoctor}
        handleToggleDoctor={handleToggleDoctor}
        handleOpenDrawer={handleOpenDrawer}
        handleCloseDrawer={handleCloseDrawer}
        handleCloseFocus={handleCloseFocus}
        handleCancelDelete={handleCancelDelete}
        handleProjectDelete={handleProjectDelete}
        setAccessibilitySettings={setAccessibilitySettings}
        setIsHelpOpen={setIsHelpOpen}
        setIsFirstTime={setIsFirstTime}
        setToasts={setToasts}
        handleDoctorMessage={handleDoctorMessage}
        handleMetadataUpdate={handleMetadataUpdate}
        handleDeleteCurrentProject={handleDeleteCurrentProject}
        renderStage={renderStage}
        ScriptDoctor={ScriptDoctorComponent}
      />
      
      {isFocusMode && focusedSequenceId && (
        <FocusMode
          content={sequences.find(s => s.id === focusedSequenceId)?.content || ""}
          onClose={handleCloseFocus}
          onSave={(c) => handleSubcollectionUpdate("sequences", focusedSequenceId, c)}
          title={sequences.find(s => s.id === focusedSequenceId)?.title || "Sequence"}
        />
      )}
    </>
  );
}
