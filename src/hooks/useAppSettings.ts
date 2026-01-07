import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { AppSettings } from '../types';
import { adjustColor } from '../utils/formatters';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const applySettings = useCallback((s: AppSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', s.accent_color);
    root.style.setProperty('--primary-hover', adjustColor(s.accent_color, -20));
    root.style.setProperty('--primary-light', `${s.accent_color}33`);

    const updateTheme = () => {
      if (s.theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', s.theme);
      }
    };

    updateTheme();

    if (s.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, []);

  useEffect(() => {
    const initSettings = async () => {
      try {
        const s = await api.getSettings();
        setSettings(s);
        applySettings(s);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    initSettings();
  }, [applySettings]);

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await api.updateSettings(newSettings);
      setSettings(newSettings);
      applySettings(newSettings);
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  return { settings, setSettings, updateSettings };
}
