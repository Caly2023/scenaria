export type HapticPattern = 'light' | 'medium' | 'success' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [12, 28, 12],
  warning: [24, 40, 24],
};

export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  navigator.vibrate(PATTERNS[pattern]);
}
