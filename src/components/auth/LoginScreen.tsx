import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import styles from './LoginScreen.module.css';

interface LoginScreenProps {
  onAuthSuccess?: () => void;
  onClose?: () => void;
}

export default function LoginScreen({ onAuthSuccess, onClose }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const authUrl = await invoke<string>('oauth_authorize');
      await open(authUrl);
      setShowCodeInput(true);
    } catch (err) {
      setError('Не удалось открыть страницу авторизации');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!authCode.trim()) {
      setError('Введите код авторизации');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await invoke('oauth_callback', { code: authCode.trim() });
      onAuthSuccess?.();
    } catch (err) {
      setError('Не удалось авторизоваться. Проверьте код.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {onClose && (
        <button className={styles.closeButton} onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        
        <h1 className={styles.title}>Shikimore</h1>
        <p className={styles.subtitle}>
          Авторизуйся через Shikimori для доступа к личному списку и оценкам
        </p>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {!showCodeInput ? (
          <button 
            className={styles.loginButton}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Войти через Shikimori'}
          </button>
        ) : (
          <div className={styles.codeInputContainer}>
            <p className={styles.codeInstruction}>
              После авторизации скопируй код из URL и вставь его ниже
            </p>
            <input
              type="text"
              className={styles.codeInput}
              placeholder="Вставь код авторизации"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              disabled={loading}
            />
            <button 
              className={styles.loginButton}
              onClick={handleCodeSubmit}
              disabled={loading}
            >
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
            <button 
              className={styles.backButton}
              onClick={() => {
                setShowCodeInput(false);
                setAuthCode('');
                setError(null);
              }}
            >
              Назад
            </button>
          </div>
        )}

        <div className={styles.info}>
          <p>После авторизации ты сможешь:</p>
          <ul>
            <li>Синхронизировать список просмотра</li>
            <li>Добавлять оценки и отзывы</li>
            <li>Просматривать статистику</li>
            <li>Отмечать просмотренные эпизоды</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
