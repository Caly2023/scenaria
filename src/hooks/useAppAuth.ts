import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, testConnection } from '../lib/firebase';
import { classifyError, ClassifiedError } from '../lib/errorClassifier';

export function useAppAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);
  const [connectionErrorInfo, setConnectionErrorInfo] = useState<ClassifiedError | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    testConnection().catch((e) => setConnectionErrorInfo(classifyError(e)));
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { user, isAuthReady, isOffline, connectionError: !!connectionErrorInfo, connectionErrorInfo };
}
