import { useState, useEffect } from 'react';
import { applyTheme, getSavedTheme, saveTheme, type Theme } from '../utils/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load saved theme on mount
    const savedTheme = getSavedTheme();
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
    setIsInitialized(true);
  }, []);

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    saveTheme(newTheme);
    applyTheme(newTheme);
  };

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    applyTheme(newTheme);
  };

  return {
    theme,
    setTheme: changeTheme,
    toggleTheme,
    isInitialized,
  };
}
