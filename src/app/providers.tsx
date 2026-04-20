'use client';

import { StrictMode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/i18n';

// Register PWA Service Worker in production
function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // SW registration failed silently — app still works
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
        <ErrorBoundary>
          <ServiceWorkerRegistrar />
          {children}
        </ErrorBoundary>
      </Provider>
    </StrictMode>
  );
}
