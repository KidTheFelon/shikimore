import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { AppSettings } from "../types";

interface SettingsViewProps {
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

const SettingsView = ({ onClose, onSettingsChange }: SettingsViewProps) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const init = async () => {
      const s = await invoke<AppSettings>("get_settings");
      const autostartEnabled = await isEnabled();
      setSettings({ ...s, autostart: autostartEnabled });
    };
    init();
  }, []);

  const save = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    // Оптимистичное обновление UI
    onSettingsChange(newSettings);
    
    try {
      await invoke("update_settings", { settings: newSettings });
      
      // Handle autostart plugin
      if (newSettings.autostart) {
        await enable();
      } else {
        await disable();
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  if (!settings) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal liquid-glass" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Настройки</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-group">
            <div className="settings-label-group">
              <label>Тема приложения</label>
              <p className="settings-hint">Выберите цветовую схему интерфейса</p>
            </div>
            <select 
              className="kind-filter"
              value={settings.theme} 
              onChange={(e) => save({ ...settings, theme: e.target.value })}
            >
              <option value="dark">Темная</option>
              <option value="light">Светлая</option>
              <option value="system">Системная</option>
            </select>
          </div>

          <div className="settings-group">
            <div className="settings-label-group">
              <label>Язык названий</label>
              <p className="settings-hint">Предпочитаемый язык для заголовков</p>
            </div>
            <select 
              className="kind-filter"
              value={settings.preferred_language} 
              onChange={(e) => save({ ...settings, preferred_language: e.target.value })}
            >
              <option value="russian">Русский</option>
              <option value="original">Оригинальный</option>
            </select>
          </div>

          <div className="settings-group">
            <div className="settings-label-group">
              <label>Вид списка</label>
              <p className="settings-hint">Отображение карточек контента</p>
            </div>
            <select 
              className="kind-filter"
              value={settings.view_mode} 
              onChange={(e) => save({ ...settings, view_mode: e.target.value })}
            >
              <option value="grid">Сетка (Постеры)</option>
              <option value="list">Список (Компактно)</option>
            </select>
          </div>

          <div className="settings-group">
            <div className="settings-label-group">
              <label>Контент 18+ (NSFW)</label>
              <p className="settings-hint">Показывать материалы для взрослых в поиске</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={settings.nsfw} 
                onChange={(e) => save({ ...settings, nsfw: e.target.checked })}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-label-group">
              <label>Сворачивать в трей</label>
              <p className="settings-hint">При закрытии окна прятать в системный трей</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={settings.tray} 
                onChange={(e) => save({ ...settings, tray: e.target.checked })}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-label-group">
              <label>Запуск при старте</label>
              <p className="settings-hint">Запускать приложение при входе в систему</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={settings.autostart} 
                onChange={(e) => save({ ...settings, autostart: e.target.checked })}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="settings-group">
            <div className="settings-label-group">
              <label>Акцентный цвет</label>
              <p className="settings-hint">Цвет кнопок и активных элементов</p>
            </div>
            <div className="color-input-wrapper">
              <input 
                type="color" 
                className="color-input"
                value={settings.accent_color} 
                onChange={(e) => save({ ...settings, accent_color: e.target.value })}
              />
              <span className="color-value">{settings.accent_color.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="retry-btn" onClick={onClose}>Готово</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
