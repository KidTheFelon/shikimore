import { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  onClose?: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme();
  const [searchHistorySize, setSearchHistorySize] = useState(0);

  useEffect(() => {
    // Calculate search history size
    try {
      const history = localStorage.getItem('shikimore_search_history');
      setSearchHistorySize(history ? JSON.parse(history).length : 0);
    } catch {
      setSearchHistorySize(0);
    }
  }, []);

  const handleClearSearchHistory = () => {
    localStorage.removeItem('shikimore_search_history');
    localStorage.removeItem('shikimore_last_search');
    setSearchHistorySize(0);
  };

  const handleClearAllCache = () => {
    // Clear all shikimore cache
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('shikimore_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setSearchHistorySize(0);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Настройки</h2>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Внешний вид</h3>
        <div className={styles.setting}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Тема</span>
            <span className={styles.settingDescription}>Выберите цветовую схему</span>
          </div>
          <div className={styles.themeToggle}>
            <button
              className={`${styles.themeButton} ${theme === 'dark' ? styles.themeButtonActive : ''}`}
              onClick={() => setTheme('dark')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
              </svg>
              Тёмная
            </button>
            <button
              className={`${styles.themeButton} ${theme === 'light' ? styles.themeButtonActive : ''}`}
              onClick={() => setTheme('light')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M6.995 12c0 2.761 2.246 5.007 5.007 5.007s5.007-2.246 5.007-5.007S14.761 6.993 12 6.993 6.995 9.239 6.995 12zM11 19h2v3h-2zm0-17h2v3h-2zm-9 9h3v2H2zm17 0h3v2h-3zM5.637 19.778l-1.414-1.414 2.121-2.121 1.414 1.414zM16.242 6.344l2.122-2.122 1.414 1.414-2.122 2.122zM6.344 7.759 4.223 5.637l1.415-1.414 2.12 2.122zm13.434 10.605-1.414 1.414-2.122-2.122 1.414-1.414z"/>
              </svg>
              Светлая
            </button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Данные</h3>
        <div className={styles.setting}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>История поиска</span>
            <span className={styles.settingDescription}>{searchHistorySize} запросов</span>
          </div>
          <button
            className={styles.clearButton}
            onClick={handleClearSearchHistory}
            disabled={searchHistorySize === 0}
          >
            Очистить
          </button>
        </div>
        <div className={styles.setting}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Весь кэш</span>
            <span className={styles.settingDescription}>Кэш изображений и данные</span>
          </div>
          <button className={styles.clearButton} onClick={handleClearAllCache}>
            Очистить
          </button>
        </div>
      </div>
    </div>
  );
}
