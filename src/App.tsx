import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useAppAuth as useAuth } from "./hooks/useAppAuth";
import { useWindowSize } from "./hooks/useWindowSize";
import { WorkflowStage, Project } from "./types";
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

type Toast = {
  id: string;
  message: string;
  type: 'error' | 'info' | 'success';
};

type ErrorBoundaryProps = {
  children: ReactNode;
};


export default function App() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: 'error' | 'info' | 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const { user, isAuthReady, isOffline, connectionError } = useAuth();
  
  return (
    <ProjectProvider user={user} addToast={addToast}>
      <AppContent 
        user={user} 
        isAuthReady={isAuthReady} 
        isOffline={isOffline} 
        connectionError={connectionError} 
        toasts={toasts}
        addToast={addToast}
      />
    </ProjectProvider>
  );
}

function AppContent({ user, isAuthReady, isOffline, connectionError, toasts, addToast }: { user: any, isAuthReady: boolean, isOffline: boolean, connectionError: any, toasts: Toast[], addToast: any }) {
  const project = useProject();
  const { 
    currentProject, activeStage, projects, isProjectLoading, isProjectNotFound,
    handleProjectSelect, handleProjectExit, handleProjectCreate, handleProjectDelete, handleDeleteCurrentProject,
    handleStageChange, handleMetadataUpdate, handleContentUpdate, handleSubcollectionUpdate,
    isTyping, syncStatus, handleRegenerate, handleStageValidate, handleStageRefine, handleStageAnalyze,
    pitchPrimitives, draftPrimitives, loglinePrimitives, structurePrimitives, beatPrimitives, synopsisPrimitives, doctoringPrimitives, breakdownPrimitives, assetPrimitives, previsPrimitives, exportPrimitives, characters, locations, treatmentSequences, sequences, scriptScenes,
    isDeleting, projectToDelete, setProjectToDelete, refiningBlockId, setRefiningBlockId, lastUpdatedPrimitiveId, setLastUpdatedPrimitiveId,
    handleAiMagic, handleGenerateViews, handleCharacterDeepDevelop, handleLocationDeepDevelop, handleSequenceUpdate, handleSequenceAdd,
    handleToggleDoctor, handleOpenDoctor, handleCloseDoctor,
    hydrationState,
    isDoctorOpen, doctorMessages, isDoctorTyping, isHeavyThinking, activeTool, aiStatus, handleDoctorMessage,
    pendingToolCall, handleConfirmTool, handleCancelTool,
    isFocusMode, handleCloseFocus, focusedSequenceId, handleFocusMode,
    telemetryStatus
  } = project;

  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(!localStorage.getItem("scenaria_onboarded"));
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

  const { isMobile } = useWindowSize();

  const handleOpenDrawer = useCallback(() => setIsProjectDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsProjectDrawerOpen(false), []);
  const handleOpenSettings = useCallback(() => setIsSettingsDrawerOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsDrawerOpen(false), []);
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
    onProjectSwitch: handleProjectExit, onDoctorToggle: handleToggleDoctor, onStageChange: handleStageChange, activeStage, stages: ["Project Metadata", "Initial Draft", "Brainstorming", "Logline", "3-Act Structure", "8-Beat Structure", "Synopsis", "Character Bible", "Location Bible", "Treatment", "Step Outline", "Script", "Global Script Doctoring", "Technical Breakdown", "Visual Assets", "AI Previs", "Production Export"] as WorkflowStage[], onShowHelp: () => setIsHelpOpen(true)
  });

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
        onProjectSelect={(project: Project) => handleProjectSelect(project.id, project)}
        onProjectCreate={handleProjectCreate}
        onProjectDelete={(id: string) => setProjectToDelete(id)}
      />
    );
  }

  const renderStage = () => (
    <StageRenderer />
  );

  return (
    <>
      <MainLayout
        user={{
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          providerId: user.providerData[0]?.providerId,
        }}
        isMobile={isMobile}
        isProjectDrawerOpen={isProjectDrawerOpen}
        isSettingsDrawerOpen={isSettingsDrawerOpen}
        isHelpOpen={isHelpOpen}
        isFirstTime={isFirstTime}
        toasts={toasts}
        accessibilitySettings={accessibilitySettings}
        
        handleOpenDrawer={handleOpenDrawer}
        handleCloseDrawer={handleCloseDrawer}
        handleOpenSettings={handleOpenSettings}
        handleCloseSettings={handleCloseSettings}
        setAccessibilitySettings={setAccessibilitySettings}
        setIsHelpOpen={setIsHelpOpen}
        setIsFirstTime={setIsFirstTime}
        setToasts={setToasts}
        
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
