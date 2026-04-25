import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { OAuthTokenResponse, UserInfo } from '../types';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    setupDeepLinkListener();
  }, []);

  const setupDeepLinkListener = useCallback(async () => {
    try {
      // Слушаем события deep-link
      const unlisten = await listen<string>('deep-link://new-url', (event) => {
        const url = event.payload;
        
        // Парсим URL для извлечения code
        if (url.includes('oauth/callback')) {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          
          if (code) {
            handleOAuthCallback(code);
          }
        }
      });

      return () => {
        unlisten();
      };
    } catch (error) {
      console.error('Failed to setup deep link listener:', error);
    }
  }, []);

  const handleOAuthCallback = useCallback(async (code: string) => {
    try {
      await invoke<OAuthTokenResponse>('oauth_callback', { code });
      await checkAuth();
    } catch (error) {
      console.error('OAuth callback failed:', error);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const auth = await invoke<boolean>('is_authenticated');
      setIsAuthenticated(auth);
      
      if (auth) {
        const userInfo = await invoke<UserInfo>('get_user_info');
        setUser(userInfo);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    try {
      const authUrl = await invoke<string>('oauth_authorize');
      
      // Открываем браузер для авторизации
      await invoke('plugin:shell|open', { 
        path: authUrl 
      });
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await invoke('logout');
      setIsAuthenticated(false);
      setUser(null);
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await invoke<OAuthTokenResponse>('oauth_refresh');
      await checkAuth();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, [checkAuth]);

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    refresh,
    checkAuth,
  };
}
