import { useState, useCallback } from "react";
import type { User } from "firebase/auth";
import { useWindowSize } from "./hooks/useWindowSize";
import { WorkflowStage, Project, Toast } from "./types";
import { FocusMode } from "./components/ui/FocusMode";
import { LoadingPage } from "./components/ui/LoadingPage";
import { OfflinePage, ConnectionErrorPage, NotFoundPage } from "./components/ui/ErrorPages";
import { HomePage } from "./components/home/HomePage";
import { MainLayout } from "./components/layout/MainLayout";
import { StageRenderer } from "./components/stages/StageRenderer";
import { ScriptDoctor as ScriptDoctorComponent } from "./components/script-doctor/ScriptDoctor";
import { ttsService } from "./services/ttsService";
import { PWAInstallPrompt } from "./components/ui/PWAInstallPrompt";
import { LoginPage } from "./components/auth/LoginPage";
import { signOutUser, updateCurrentUserProfile } from "./lib/firebase";
import { useProject } from "./contexts/ProjectContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ContentPrimitive } from "./types/stageContract";
import { stageRegistry } from "./config/stageRegistry";
import { useAppSettings } from "./hooks/useAppSettings";

type AppContentProps = {
  user: User | null;
  isAuthReady: boolean;
  isOffline: boolean;
  connectionError: boolean;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  addToast: (message: string, type: 'error' | 'info' | 'success') => void;
};

export function AppContent({ user, isAuthReady, isOffline, connectionError, toasts, setToasts, addToast }: AppContentProps) {
  const project = useProject();
  const { 
    currentProject, activeStage, projects, isProjectLoading, isProjectNotFound,
    handleProjectSelect, handleProjectExit, handleProjectCreate,
    handleStageChange, handleSubcollectionUpdate,
    stageContents,
    setProjectToDelete,
    handleAiMagic,
    handleToggleDoctor,
    isFocusMode, handleCloseFocus, focusedPrimitiveId, focusedStageId
  } = project;

  const {
    theme, language, accessibilitySettings, setAccessibilitySettings,
    handleLanguageChange, handleThemeChange
  } = useAppSettings(addToast);

  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(!localStorage.getItem("scenaria_onboarded"));

  const { isMobile } = useWindowSize();

  const handleOpenDrawer = useCallback(() => setIsProjectDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsProjectDrawerOpen(false), []);
  const handleOpenSettings = useCallback(() => setIsSettingsDrawerOpen(true), []);
  const handleCloseSettings = useCallback(() => setIsSettingsDrawerOpen(false), []);

  useKeyboardShortcuts({
    onProjectSwitch: handleProjectExit, 
    onDoctorToggle: handleToggleDoctor, 
    onStageChange: handleStageChange, 
    activeStage, 
    stages: stageRegistry.getAllIds(), 
    onShowHelp: () => setIsHelpOpen(true)
  });

  const handleProfileSave = useCallback(async (profile: { displayName: string; photoURL: string }) => {
    await updateCurrentUserProfile(profile);
    addToast("Profil mis à jour", "success");
  }, [addToast]);

  const handleLogout = useCallback(async () => {
    await signOutUser();
    setIsSettingsDrawerOpen(false);
    addToast("Déconnexion effectuée", "success");
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
      
      {isFocusMode && focusedPrimitiveId && focusedStageId && (
        <FocusMode
          isOpen={isFocusMode}
          onClose={handleCloseFocus}
          onContentChange={(c) => handleSubcollectionUpdate(stageRegistry.getCollectionName(focusedStageId), focusedPrimitiveId, { content: c })}
          onAiMagic={() => handleAiMagic(focusedPrimitiveId)}
          onTts={() => handleTts(focusedPrimitiveId, (stageContents[focusedStageId] || []).find((s: ContentPrimitive) => s.id === focusedPrimitiveId)?.content || "")}
          title={(stageContents[focusedStageId] || []).find((s: ContentPrimitive) => s.id === focusedPrimitiveId)?.title || "Element"}
          content={(stageContents[focusedStageId] || []).find((s: ContentPrimitive) => s.id === focusedPrimitiveId)?.content || ""}
        />
      )}

      <PWAInstallPrompt />
    </>
  );
}
