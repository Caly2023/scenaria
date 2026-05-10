'use client';

import { StrictMode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store, persistor } from '@/store';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PersistGate } from 'redux-persist/integration/react';
import '@/i18n';

// Register PWA Service Worker
function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW registration failed:', err);
        });
      });
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StrictMode>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ErrorBoundary>
            <ServiceWorkerRegistrar />
            {children}
          </ErrorBoundary>
        </PersistGate>
      </Provider>
    </StrictMode>
  );
}
