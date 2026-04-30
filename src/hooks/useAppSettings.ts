import { useState, useEffect, useCallback } from 'react';
import i18n from '../i18n';

export type ThemeMode = 'dark' | 'light' | 'system';

export type AccessibilitySettings = {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
};

export function useAppSettings(addToast: (msg: string, type: 'success' | 'error' | 'info') => void) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const savedTheme = localStorage.getItem('scenaria_theme');
    return savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system' ? savedTheme : 'dark';
  });

  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'fr';
    return localStorage.getItem('scenaria_language') || i18n.resolvedLanguage || 'fr';
  });

  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(() => {
    if (typeof window === 'undefined') return { highContrast: false, largeText: false, reducedMotion: false };
    const saved = localStorage.getItem('scenaria_accessibility');
    if (!saved) return { highContrast: false, largeText: false, reducedMotion: false };
    try {
      return JSON.parse(saved) as AccessibilitySettings;
    } catch {
      return { highContrast: false, largeText: false, reducedMotion: false };
    }
  });

  // Apply Theme
  useEffect(() => {
    localStorage.setItem('scenaria_theme', theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (mediaQuery.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolvedTheme;
    };
    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  // Apply Language
  useEffect(() => {
    localStorage.setItem('scenaria_language', language);
    void i18n.changeLanguage(language);
  }, [language]);

  // Apply Accessibility
  useEffect(() => {
    localStorage.setItem('scenaria_accessibility', JSON.stringify(accessibilitySettings));
    document.body.classList.toggle('accessibility-high-contrast', accessibilitySettings.highContrast);
    document.body.classList.toggle('accessibility-large-text', accessibilitySettings.largeText);
    document.body.classList.toggle('accessibility-reduced-motion', accessibilitySettings.reducedMotion);
  }, [accessibilitySettings]);

  const handleLanguageChange = useCallback((nextLanguage: string) => {
    setLanguage(nextLanguage);
    addToast(nextLanguage === 'fr' ? 'Langue définie sur français' : 'Language changed to English', 'success');
  }, [addToast]);

  const handleThemeChange = useCallback((nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    addToast('Thème mis à jour', 'success');
  }, [addToast]);

  return {
    theme,
    setTheme,
    language,
    setLanguage,
    accessibilitySettings,
    setAccessibilitySettings,
    handleLanguageChange,
    handleThemeChange,
  };
}
