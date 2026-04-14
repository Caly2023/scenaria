import { useState, useEffect } from 'react';

/**
 * Reusable hook to detect mobile screen size based on window width.
 * Uses 768px as the breakpoint (matching existing Scenaria logic).
 * 
 * This implementation avoids the 'Call setState synchronously within an effect' 
 * error by only triggering an update if the value actually changes.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
