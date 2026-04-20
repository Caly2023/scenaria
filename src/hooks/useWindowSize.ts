import { useState, useEffect } from 'react';

/**
 * Hook to track window size efficiently.
 * Useful for responsive layouts and avoiding multiple resize listeners.
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    
    // Initial call to catch any immediate changes
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...windowSize,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
  };
}
