import { useState, useCallback } from "react";
import { useAppAuth as useAuth } from "./hooks/useAppAuth";
import { ProjectProvider } from "./contexts/ProjectContext";
import { AppContent } from "./AppContent";
import type { Toast } from "./types";

export default function App() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: 'error' | 'info' | 'success') => {
    const id = Math.random().toString(36).substring(2, 11);
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
        setToasts={setToasts}
        addToast={addToast}
      />
    </ProjectProvider>
  );
}

