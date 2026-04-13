import React, { Suspense } from 'react';
import { Bot, Check, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Project, 
  WorkflowStage, 
  Toast,
} from '../types';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ProjectDrawer } from './ProjectDrawer';
import { HelpModal } from './HelpModal';
import { OnboardingWizard } from './OnboardingWizard';
import { OrbitingLoader } from './OrbitingLoader';
import { FormErrorBoundary } from './ErrorBoundary/FormErrorBoundary';
import { StageSkeleton } from './StageSkeleton';

// Props for MainLayout
interface MainLayoutProps {
  currentProject: Project;
  activeStage: WorkflowStage;
  isMobile: boolean;
  isDoctorOpen: boolean;
  isFocusMode: boolean;
  isTyping: boolean;
  isHeavyThinking: boolean;
  isProjectDrawerOpen: boolean;
  isHelpOpen: boolean;
  isFirstTime: boolean;
  isDeleting: boolean;
  projectToDelete: string | null;
  toasts: any[];
  syncStatus: 'synced' | 'syncing' | 'error';
  collaborators: any[];
  accessibilitySettings: any;
  refiningBlockId: string | null;
  lastUpdatedPrimitiveId: string | null;
  hydrationState: any;
  telemetryStatus: any;
  doctorMessages: any[];
  isDoctorTyping: boolean;
  aiStatus: any;
  activeTool: any;
  
  // Callbacks
  handleStageChange: (stage: WorkflowStage) => void;
  handleProjectExit: () => void;
  handleOpenDoctor: () => void;
  handleCloseDoctor: () => void;
  handleToggleDoctor: () => void;
  handleOpenDrawer: () => void;
  handleCloseDrawer: () => void;
  handleCloseFocus: () => void;
  handleCancelDelete: () => void;
  handleProjectDelete: (id: string) => void;
  setAccessibilitySettings: (s: any) => void;
  setIsHelpOpen: (v: boolean) => void;
  setIsFirstTime: (v: boolean) => void;
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  
  // Logic callbacks
  handleDoctorMessage: (msg: string) => void;
  handleMetadataUpdate: (metadata: any) => void;
  handleDeleteCurrentProject: () => void;
  
  // Stage Content Children
  renderStage: () => React.ReactNode;
  
  // Components from App.tsx
  ScriptDoctor: React.ComponentType<any>;
}

export function MainLayout({
  currentProject,
  activeStage,
  isMobile,
  isDoctorOpen,
  isFocusMode,
  isTyping,
  isHeavyThinking,
  isProjectDrawerOpen,
  isHelpOpen,
  isFirstTime,
  isDeleting,
  projectToDelete,
  toasts,
  syncStatus,
  collaborators,
  accessibilitySettings,
  refiningBlockId,
  // lastUpdatedPrimitiveId, // Unused
  hydrationState,
  telemetryStatus,
  doctorMessages,
  isDoctorTyping,
  aiStatus,
  activeTool,
  
  handleStageChange,
  handleProjectExit,
  handleOpenDoctor,
  handleCloseDoctor,
  handleToggleDoctor,
  handleOpenDrawer,
  handleCloseDrawer,
  // handleCloseFocus, // Unused
  handleCancelDelete,
  handleProjectDelete,
  setAccessibilitySettings,
  setIsHelpOpen,
  setIsFirstTime,
  setToasts,
  
  handleDoctorMessage,
  handleMetadataUpdate,
  handleDeleteCurrentProject,
  
  renderStage,
  ScriptDoctor
}: MainLayoutProps) {
  
  const EMPTY_ARRAY: any[] = [];
  const DEFAULT_METADATA = {};
  const NOOP = () => {};

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-background overflow-hidden relative font-sans">
      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      {!isMobile && (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
          <div className="pointer-events-auto absolute left-6 top-1/2 -translate-y-1/2 h-[85vh] w-20 hover:w-64 group bg-[#111]/90 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-300 z-[60]">
            <Sidebar
              activeStage={activeStage}
              onStageChange={handleStageChange}
              validatedStages={currentProject.validatedStages || EMPTY_ARRAY}
            />
          </div>
        </div>
      )}

      {/* ── Script Doctor Floating Action Button (Universal) ──────────────── */}
      {!isFocusMode && (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
          <div
            className={cn(
              "pointer-events-auto absolute transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-[60]",
              isMobile
                ? "bottom-[calc(112px+env(safe-area-inset-bottom,0px))] right-6"
                : "bottom-6 right-6",
              isDoctorOpen
                ? "opacity-0 scale-50 pointer-events-none translate-x-12"
                : "opacity-100 scale-100",
            )}
          >
            <button
              onClick={handleOpenDoctor}
              className="w-14 h-14 rounded-full bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border-none"
            >
              <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main content column ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full relative transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10 min-w-0">
        <Header
          projectName={currentProject?.metadata?.title || "Untitled"}
          onProjectSwitch={handleProjectExit}
          onCallStart={NOOP}
          onInfoClick={() => setIsHelpOpen(true)}
          onDoctorToggle={handleToggleDoctor}
          isDoctorOpen={isDoctorOpen}
          syncStatus={syncStatus}
          collaborators={collaborators}
          isCompact={isDoctorOpen}
          accessibilitySettings={accessibilitySettings}
          onAccessibilityChange={setAccessibilitySettings}
          onTitleClick={handleOpenDrawer}
          isTitleOpen={isProjectDrawerOpen}
        />

        <FormErrorBoundary>
          <ProjectDrawer
            isOpen={isProjectDrawerOpen}
            onClose={handleCloseDrawer}
            metadata={currentProject.metadata || DEFAULT_METADATA}
            onUpdate={handleMetadataUpdate}
            onDelete={handleDeleteCurrentProject}
          />
        </FormErrorBoundary>

        <div className="flex-1 flex flex-col relative overflow-hidden items-center justify-center w-full">
          <div
            className={cn(
              "w-full flex-1 overflow-y-auto no-scrollbar scroll-smooth relative",
              isMobile && "pb-safe-nav",
            )}
          >
            <div
              className={cn(
                "w-full max-w-4xl mx-auto min-h-full flex flex-col justify-start relative",
                isMobile ? "px-4 py-6" : "px-6 py-12 md:px-12",
              )}
            >
              <Suspense fallback={<StageSkeleton />}>
                {renderStage()}
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: Script Doctor side panel ─────────────────────────────── */}
      {!isMobile && (
        <div
          className={cn(
            "h-full border-l border-white/5 bg-background z-40 flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden relative",
            isDoctorOpen
              ? "w-[30%] min-w-[350px] max-w-[450px]"
              : "w-0 min-w-0 border-none",
          )}
        >
          <div className="absolute right-0 top-0 w-[30vw] min-w-[350px] max-w-[450px] h-full">
            <Suspense
              fallback={
                <div className="h-full flex flex-col items-center justify-center p-12 space-y-4">
                  <OrbitingLoader size="small" showText={false} />
                  <span className="text-white/20 text-xs font-bold uppercase tracking-widest">
                    Initialisation du Docteur...
                  </span>
                </div>
              }
            >
              <ScriptDoctor
                isOpen={isDoctorOpen}
                onClose={handleCloseDoctor}
                messages={doctorMessages}
                onSendMessage={handleDoctorMessage}
                isTyping={isDoctorTyping}
                isHeavyThinking={isHeavyThinking}
                aiStatus={aiStatus}
                activeStage={activeStage}
                activeTool={activeTool}
                projectLanguages={currentProject.metadata?.languages}
                telemetryStatus={telemetryStatus}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* ── MOBILE: Script Doctor as bottom sheet ─────────────────────────── */}
      {isMobile && (
        <Suspense fallback={null}>
          <ScriptDoctor
            isOpen={isDoctorOpen}
            onClose={handleCloseDoctor}
            messages={doctorMessages}
            onSendMessage={handleDoctorMessage}
            isTyping={isDoctorTyping}
            isHeavyThinking={isHeavyThinking}
            aiStatus={aiStatus}
            activeStage={activeStage}
            activeTool={activeTool}
            projectLanguages={currentProject.metadata?.languages}
            telemetryStatus={telemetryStatus}
          />
        </Suspense>
      )}

      {isMobile && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5 flex flex-col pt-2"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Stage tabs */}
          <div className="h-20 flex items-center">
            <Sidebar
              activeStage={activeStage}
              onStageChange={handleStageChange}
              validatedStages={currentProject.validatedStages || EMPTY_ARRAY}
              variant="bottom-nav"
            />
          </div>
        </div>
      )}

      {/* Global Modals & Overlays */}
      <AnimatePresence>
        {projectToDelete && (
          <DeleteProjectModal
            projectId={projectToDelete}
            isDeleting={isDeleting}
            onCancel={handleCancelDelete}
            onConfirm={handleProjectDelete}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-32 right-8 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[300px]",
                toast.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : toast.type === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-400"
                    : "bg-white/5 border-white/10 text-white",
              )}
            >
              {toast.type === "success" ? (
                <Check className="w-5 h-5" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
              <div className="flex flex-col gap-1 items-start">
                <p className="text-sm font-medium tracking-tight">
                  {toast.message}
                </p>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      setToasts((p) => p.filter((t) => t.id !== toast.id));
                    }}
                    className="text-xs font-bold underline opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {((isTyping && !refiningBlockId) ||
          (hydrationState.isHydrating && !refiningBlockId)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0f0f0f]/80 backdrop-blur-sm z-[90] flex flex-col items-center justify-center gap-6"
          >
            <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold tracking-tight text-white">
                {hydrationState.isHydrating
                  ? hydrationState.hydratingLabel || "Auto-generating content..."
                  : isHeavyThinking
                    ? activeStage === "Treatment"
                      ? "Structuring narrative primitives..."
                      : "The AI Architect is crafting your project using the Pro engine."
                    : "AI is working..."}
              </h3>
              <p className="text-secondary text-sm">
                {hydrationState.isHydrating
                  ? "The AI Architect is analyzing validated stages and generating content..."
                  : isHeavyThinking
                    ? "This may take a moment..."
                    : "Analysing your script and preparing next steps."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <AnimatePresence>
        {isFirstTime && (
          <OnboardingWizard
            onComplete={() => {
              setIsFirstTime(false);
              localStorage.setItem("scenaria_onboarded", "true");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Missing component from layout
function DeleteProjectModal({ projectId, isDeleting, onCancel, onConfirm }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
    >
      <div className="glass p-12 rounded-[40px] max-w-md w-full text-center space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Supprimer le projet ?</h2>
        <p className="text-secondary">Cette action est irréversible. Toutes les données associées seront perdues.</p>
        <div className="flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-bold"
          >
            Annuler
          </button>
          <button 
            onClick={() => onConfirm(projectId)}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-all font-bold disabled:opacity-50"
          >
            {isDeleting ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
