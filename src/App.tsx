import { useState, useCallback, useEffect } from "react";
import { useAppAuth as useAuth } from "./hooks/useAppAuth";
import { useProjects } from "./hooks/useProjects";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useScriptDoctor } from "./hooks/useScriptDoctor";
import { useAppCallbacks } from "./hooks/useAppCallbacks";
import { useAutoHydration } from "./hooks/useAutoHydration";
import { useTelemetry } from "./hooks/useTelemetry";
import { WorkflowStage } from "./types";
import { FocusMode } from "./components/FocusMode";
import { LoadingPage } from "./components/LoadingPage";
import { OfflinePage, ConnectionErrorPage, NotFoundPage } from "./components/ErrorPages";
import { HomePage } from "./components/HomePage";
import { MainLayout } from "./components/MainLayout";
import { StageRenderer } from "./components/StageRenderer";
import { ScriptDoctor as ScriptDoctorComponent } from "./components/ScriptDoctor";
import { ttsService } from "./services/ttsService";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { LoginPage } from "./components/LoginPage";
import i18n from "./i18n";
import { signOutUser, updateCurrentUserProfile } from "./lib/firebase";

type ThemeMode = "dark" | "light" | "system";
type AccessibilitySettings = {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
};


export default function App() {
  const [toasts, setToasts] = useState<any[]>([]);
  const addToast = useCallback((message: string, type: 'error' | 'info' | 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const { user, isAuthReady, isOffline, connectionError } = useAuth();
  const { 
    projects, currentProject, isProjectLoading, isProjectNotFound, handleProjectSelect, handleProjectExit, handleProjectCreate, handleProjectDelete, handleStageChange, handleMetadataUpdate, handleContentUpdate, handleSubcollectionUpdate,
    isTyping, syncStatus, handleRegenerate, handleStageValidate, activeStage, handleStageRefine, handleStageAnalyze,
    pitchPrimitives, loglinePrimitives, structurePrimitives, synopsisPrimitives, characters, locations, treatmentSequences, sequences, scriptScenes,
    isDeleting, projectToDelete, setProjectToDelete, refiningBlockId, setRefiningBlockId, lastUpdatedPrimitiveId, setLastUpdatedPrimitiveId,
    handleAiMagic, handleGenerateViews, handleCharacterDeepDevelop, handleLocationDeepDevelop, handleSequenceUpdate, handleSequenceAdd
  } = useProjects(user, addToast);

  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(!localStorage.getItem("scenaria_onboarded"));
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusedSequenceId, setFocusedSequenceId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("scenaria_theme");
    return savedTheme === "dark" || savedTheme === "light" || savedTheme === "system" ? savedTheme : "dark";
  });
  const [language, setLanguage] = useState(() => localStorage.getItem("scenaria_language") || i18n.resolvedLanguage || "fr");
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem("scenaria_accessibility");
    if (!saved) {
      return { highContrast: false, largeText: false, reducedMotion: false };
    }

    try {
      return JSON.parse(saved) as AccessibilitySettings;
    } catch {
      return { highContrast: false, largeText: false, reducedMotion: false };
    }
  });

  // Sync Status Effect (Log changes if needed)
  // useMemo and other logic around setSyncStatus could go here if specialized handling is needed
  

  const hydrationState = useAutoHydration({
    activeStage,
    currentProject,
    pitchPrimitives,
    loglinePrimitives,
    structurePrimitives,
    synopsisPrimitives,
    characters,
    locations,
    sequences,
    treatmentSequences,
    scriptScenes,
    addToast,
    onStageAnalyze: handleStageAnalyze
  });

  const telemetryStatus = useTelemetry();


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
  const handleOpenSettings = useCallback(() => setIsSettingsDrawerOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsDrawerOpen(false), []);
  const handleCloseFocus = useCallback(() => setIsFocusMode(false), []);
  const handleCancelDelete = useCallback(() => setProjectToDelete(null), [setProjectToDelete]);

  useEffect(() => {
    localStorage.setItem("scenaria_theme", theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      const resolvedTheme = theme === "system" ? (mediaQuery.matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = resolvedTheme;
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("scenaria_language", language);
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("scenaria_accessibility", JSON.stringify(accessibilitySettings));

    document.body.classList.toggle("accessibility-high-contrast", accessibilitySettings.highContrast);
    document.body.classList.toggle("accessibility-large-text", accessibilitySettings.largeText);
    document.body.classList.toggle("accessibility-reduced-motion", accessibilitySettings.reducedMotion);
  }, [accessibilitySettings]);

  useKeyboardShortcuts({
    onProjectSwitch: handleProjectExit, onDoctorToggle: handleToggleDoctor, onStageChange: handleStageChange, activeStage, stages: ["Brainstorming", "Logline", "3-Act Structure", "Synopsis", "Character Bible", "Location Bible", "Treatment", "Step Outline", "Script", "Storyboard"] as WorkflowStage[], onShowHelp: () => setIsHelpOpen(true)
  });

  const handleFocusMode = useCallback((id: string) => { setFocusedSequenceId(id); setIsFocusMode(true); }, [setFocusedSequenceId, setIsFocusMode]);
  const handleDeleteCurrentProject = useCallback(() => { if (currentProject) setProjectToDelete(currentProject.id); }, [currentProject, setProjectToDelete]);
  const handleLanguageChange = useCallback((nextLanguage: string) => {
    setLanguage(nextLanguage);
    addToast(nextLanguage === "fr" ? "Langue definie sur francais" : "Language changed to English", "success");
  }, [addToast]);
  const handleThemeChange = useCallback((nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    addToast("Theme mis a jour", "success");
  }, [addToast]);
  const handleProfileSave = useCallback(async (profile: { displayName: string; photoURL: string }) => {
    await updateCurrentUserProfile(profile);
    addToast("Profil mis a jour", "success");
  }, [addToast]);
  const handleLogout = useCallback(async () => {
    await signOutUser();
    setIsSettingsDrawerOpen(false);
    addToast("Deconnexion effectuee", "success");
  }, [addToast]);

  const {
    handleStoryChange, onLoglineChange, handleCharacterAdd, handleCharacterUpdate, handleCharacterDelete, handleLocationAdd, handleLocationUpdate, handleLocationDelete, onValidateBrainstorming, onValidateLogline, onValidate3Act, onValidateSynopsis, onValidateCharacterBible, onValidateLocationBible, onValidateTreatment, onValidateStepOutline, onValidateScript, onValidateStoryboard
  } = useAppCallbacks({
    currentProject, addToast, handleSubcollectionUpdate, handleContentUpdate, handleStageValidate, pitchPrimitives, loglinePrimitives
  });

  const onRefineLogline = useCallback((f?: string) => handleStageRefine("Logline", f || "Refine Logline"), [handleStageRefine]);
  const onContentChange3Act = useCallback((c: string) => {
    const id = structurePrimitives[0]?.id;
    if (id && structurePrimitives.length === 1) handleSubcollectionUpdate("structure_primitives", id, c);
  }, [structurePrimitives, handleSubcollectionUpdate]);
  const onRefine3Act = useCallback((f?: string, id?: string) => handleStageRefine("3-Act Structure", f || "Refine Structure", id), [handleStageRefine]);
  const onRegenerate3Act = useCallback(() => handleRegenerate("3-Act Structure"), [handleRegenerate]);
  const onContentChangeSynopsis = useCallback((c: string) => {
    const id = synopsisPrimitives[0]?.id;
    if (id) handleSubcollectionUpdate("synopsis_primitives", id, c);
  }, [synopsisPrimitives, handleSubcollectionUpdate]);
  const onRefineSynopsis = useCallback((f?: string, id?: string) => handleStageRefine("Synopsis", f || "Refine Synopsis", id), [handleStageRefine]);
  const onRegenerateSynopsis = useCallback(() => handleRegenerate("Synopsis"), [handleRegenerate]);
  const onContentChangeTreatment = useCallback((c: string) => handleContentUpdate("treatmentDraft", c), [handleContentUpdate]);
  const onItemChangeTreatment = useCallback((id: string, content: string) => handleSubcollectionUpdate("treatment_sequences", id, content), [handleSubcollectionUpdate]);
  const onRefineTreatment = useCallback((f?: string, id?: string) => handleStageRefine("Treatment", f || "Refine Treatment", id), [handleStageRefine]);
  const onRegenerateTreatment = useCallback(() => handleRegenerate("Treatment"), [handleRegenerate]);
  const onContentChangeScript = useCallback((c: string) => handleContentUpdate("scriptDraft", c), [handleContentUpdate]);
  const onItemChangeScript = useCallback((id: string, content: string) => handleSubcollectionUpdate("script_scenes", id, content), [handleSubcollectionUpdate]);
  const onRefineScript = useCallback((f?: string, id?: string) => handleStageRefine("Script", f || "Refine Script", id), [handleStageRefine]);
  const onRegenerateScript = useCallback(() => handleRegenerate("Script"), [handleRegenerate]);
  const onApplyFix = useCallback((prompt: string) => {
    handleOpenDoctor();
    handleDoctorMessage(prompt);
  }, [handleOpenDoctor, handleDoctorMessage]);

  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const handleTts = useCallback((id: string, text: string) => {
    if (isTtsPlaying) {
      ttsService.cancel();
      setIsTtsPlaying(false);
    } else {
      setIsTtsPlaying(true);
      ttsService.speak(text, id, currentProject?.metadata?.languages || [], () => setIsTtsPlaying(false));
    }
  }, [isTtsPlaying, currentProject]);

  if (!isAuthReady) return <LoadingPage />;
  if (isOffline) return <OfflinePage onRetry={() => window.location.reload()} />;
  if (connectionError) return <ConnectionErrorPage onRetry={() => window.location.reload()} />;
  if (!user) return <LoginPage />;
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
      hydrationState={hydrationState}
      refiningBlockId={refiningBlockId}
      lastUpdatedPrimitiveId={lastUpdatedPrimitiveId}
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
      handleGenerateViews={handleGenerateViews}
      handleCharacterDeepDevelop={handleCharacterDeepDevelop}
      handleLocationDeepDevelop={handleLocationDeepDevelop}
      handleSequenceUpdate={handleSequenceUpdate}
      handleSequenceAdd={handleSequenceAdd}
      handleFocusMode={handleFocusMode}
      handleAiMagic={handleAiMagic}
      handleToggleDoctor={handleToggleDoctor}
      handleSubcollectionUpdate={handleSubcollectionUpdate}
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
      onAnalyzeStage={handleStageAnalyze}
      onApplyFix={onApplyFix}
      CanvasErrorBoundary={({ children }: any) => <>{children}</>}
    />
  );

  return (
    <>
      <MainLayout
        currentProject={currentProject}
        user={{
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          providerId: user.providerData[0]?.providerId,
        }}
        activeStage={activeStage}
        isMobile={window.innerWidth < 768}
        isDoctorOpen={isDoctorOpen}
        isFocusMode={isFocusMode}
        isTyping={isTyping}
        isHeavyThinking={isHeavyThinking}
        isProjectDrawerOpen={isProjectDrawerOpen}
        isSettingsDrawerOpen={isSettingsDrawerOpen}
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
        telemetryStatus={telemetryStatus || {}}
        doctorMessages={doctorMessages}
        isDoctorTyping={isDoctorTyping}
        aiStatus={aiStatus}
        activeTool={activeTool}
        handleStageChange={handleStageChange}
        handleProjectExit={handleProjectExit}
        handleOpenDoctor={handleOpenDoctor}
        handleCloseDoctor={handleCloseDoctor}
        handleOpenDrawer={handleOpenDrawer}
        handleCloseDrawer={handleCloseDrawer}
        handleOpenSettings={handleOpenSettings}
        handleCloseSettings={handleCloseSettings}
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
        handleLanguageChange={handleLanguageChange}
        handleThemeChange={handleThemeChange}
        handleProfileSave={handleProfileSave}
        handleLogout={handleLogout}
        theme={theme}
        language={language}
        renderStage={renderStage}
        ScriptDoctor={ScriptDoctorComponent}
      />
      
      {isFocusMode && focusedSequenceId && (
        <FocusMode
          isOpen={isFocusMode}
          onClose={handleCloseFocus}
          onContentChange={(c) => handleSubcollectionUpdate("sequences", focusedSequenceId, c)}
          onAiMagic={() => handleAiMagic(focusedSequenceId)}
          onTts={() => handleTts(focusedSequenceId, sequences.find(s => s.id === focusedSequenceId)?.content || "")}
          title={sequences.find(s => s.id === focusedSequenceId)?.title || "Sequence"}
          content={sequences.find(s => s.id === focusedSequenceId)?.content || ""}
        />
      )}

      <PWAInstallPrompt />
    </>
  );
}
