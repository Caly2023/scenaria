export type HapticPattern = 'light' | 'medium' | 'success' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [12, 28, 12],
  warning: [24, 40, 24],
};

const TELEGRAM_IMPACT_STYLE: Record<HapticPattern, 'light' | 'medium' | 'heavy'> = {
  light: 'light',
  medium: 'medium',
  success: 'medium',
  warning: 'heavy',
};

const IOS_BRIDGE_EVENT: Record<HapticPattern, string> = {
  light: 'selection',
  medium: 'impactMedium',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
};

type TelegramHapticFeedback = {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
};

type TelegramWebApp = {
  HapticFeedback?: TelegramHapticFeedback;
};

type IOSHapticBridge = {
  postMessage: (message: { type: 'haptic'; pattern: HapticPattern; event: string }) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        haptic?: IOSHapticBridge;
        haptics?: IOSHapticBridge;
      };
    };
  }
}

function triggerTelegramHaptic(pattern: HapticPattern): boolean {
  const haptic = window.Telegram?.WebApp?.HapticFeedback;
  if (!haptic) {
    return false;
  }

  if (pattern === 'success') {
    haptic.notificationOccurred('success');
  } else if (pattern === 'warning') {
    haptic.notificationOccurred('warning');
  } else if (pattern === 'light') {
    haptic.selectionChanged();
  } else {
    haptic.impactOccurred(TELEGRAM_IMPACT_STYLE[pattern]);
  }

  return true;
}

function triggerIosBridgeHaptic(pattern: HapticPattern): boolean {
  const payload = { type: 'haptic' as const, pattern, event: IOS_BRIDGE_EVENT[pattern] };

  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    return true;
  }

  const webkitBridge = window.webkit?.messageHandlers?.haptics ?? window.webkit?.messageHandlers?.haptic;
  if (webkitBridge?.postMessage) {
    webkitBridge.postMessage(payload);
    return true;
  }

  return false;
}

export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  // iOS Safari does not support navigator.vibrate; prefer native bridges when present.
  if (triggerTelegramHaptic(pattern)) {
    return;
  }

  if (triggerIosBridgeHaptic(pattern)) {
    return;
  }

  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(PATTERNS[pattern]);
  }
}
