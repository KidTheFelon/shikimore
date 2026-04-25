import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import type { UserInfo } from '../../types';
import { clearImageCache } from '../../utils/imageCache';
import { STATUS_LABELS, STATUS_COLORS } from '../../utils/constants';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import ReleaseCalendar from '../sections/ReleaseCalendar';
import SettingsPanel from './SettingsPanel';
import styles from './ProfileScreen.module.css';

interface ProfileScreenProps {
  user: UserInfo;
  onLogout: () => void;
  onNavigateToRates: (status: string, type: 'anime' | 'manga') => void;
  onContentClick?: (item: any) => void;
}

export default function ProfileScreen({ user, onLogout, onNavigateToRates, onContentClick }: ProfileScreenProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hoveredAnimeStatus, setHoveredAnimeStatus] = useState<string | null>(null);
  const [hoveredMangaStatus, setHoveredMangaStatus] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleReleaseClick = (item: any) => {
    setShowSettings(false);
    onContentClick?.(item);
  };

  useEffect(() => {
    if (user.image?.x160) {
      setAvatarUrl(user.image.x160);
    } else if (user.avatar) {
      setAvatarUrl(user.avatar);
    }
  }, [user]);

  const handleOpenProfile = async () => {
    if (user.url) {
      await open(user.url);
    }
  };

  const handleClearCache = () => {
    clearImageCache();
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerBackground} />
          <div className={styles.headerContent}>
            <div className={styles.avatarContainer}>
              {avatarUrl ? (
                <ImageWithSkeleton
                  src={avatarUrl}
                  alt={user.nickname}
                  className={styles.avatar}
                  onError={() => setAvatarUrl(null)}
                  loading="eager"
                  useCache={true}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {user.nickname?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            
            <div className={styles.userInfo}>
              <h2 className={styles.nickname}>{user.nickname || 'Пользователь'}</h2>
              <p className={styles.userId}>@{user.id}</p>
              <div className={styles.userDetails}>
                {user.gender && <span className={styles.userDetail}>{user.gender}</span>}
                {user.age && <span className={styles.userDetail}>{user.age} лет</span>}
              </div>
            </div>

            <button
              className={styles.settingsButton}
              onClick={toggleSettings}
              aria-label="Настройки"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
          </div>
        </div>

        {user.about && (
          <div className={styles.about}>
            <h3 className={styles.aboutTitle}>О себе</h3>
            <p className={styles.aboutText}>{user.about}</p>
          </div>
        )}

        {user.website && (
          <div className={styles.website}>
            <a href={user.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              {user.website}
            </a>
          </div>
        )}

        <ReleaseCalendar userId={user.id} onContentClick={handleReleaseClick} />

        {showSettings && (
          <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </div>
          </div>
        )}

        <div className={styles.contentGrid}>
          <div className={styles.contentColumn}>
            <div className={styles.stats}>
              <div className={styles.statsHeader}>
                <h3 className={styles.statsTitle}>Аниме</h3>
                {user.rates_anime_stats && (
                  <div className={styles.totalStats}>
                    <span className={styles.totalLabel}>Всего:</span>
                    <span className={styles.totalValue}>
                      {user.rates_anime_stats.watching + user.rates_anime_stats.completed + user.rates_anime_stats.planned + user.rates_anime_stats.on_hold + user.rates_anime_stats.dropped}
                    </span>
                  </div>
                )}
              </div>
              {user.rates_anime_stats && (
                <div className={styles.totalProgressBar}>
                  {['watching', 'completed', 'planned', 'on_hold', 'dropped'].map((status) => {
                    const value = user.rates_anime_stats![status as keyof typeof user.rates_anime_stats] as number;
                    const total = user.rates_anime_stats!.watching + user.rates_anime_stats!.completed + user.rates_anime_stats!.planned + user.rates_anime_stats!.on_hold + user.rates_anime_stats!.dropped;
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    if (percentage === 0) return null;
                    const isHovered = hoveredAnimeStatus === status;
                    return (
                      <div
                        key={status}
                        className={`${styles.totalProgressSegment} ${isHovered ? styles.totalProgressSegmentHovered : ''}`}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: STATUS_COLORS[status],
                          opacity: hoveredAnimeStatus ? (isHovered ? 1 : 0.3) : 1
                        }}
                      />
                    );
                  })}
                </div>
              )}
              {user.rates_anime_stats ? (
                <div className={styles.statsGrid}>
                  {['watching', 'completed', 'planned', 'on_hold', 'dropped'].map((status) => {
                    const value = user.rates_anime_stats![status as keyof typeof user.rates_anime_stats] as number;
                    const total = user.rates_anime_stats!.watching + user.rates_anime_stats!.completed + user.rates_anime_stats!.planned + user.rates_anime_stats!.on_hold + user.rates_anime_stats!.dropped;
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <div
                        key={status}
                        className={styles.statItem}
                        onClick={() => onNavigateToRates(status, 'anime')}
                        onMouseEnter={() => setHoveredAnimeStatus(status)}
                        onMouseLeave={() => setHoveredAnimeStatus(null)}
                      >
                        <div className={styles.statInfo}>
                          <span className={styles.statLabel}>{STATUS_LABELS[status]}</span>
                          <span className={styles.statValue}>{value}</span>
                        </div>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: STATUS_COLORS[status]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.noStats}>Нет данных</p>
              )}
            </div>

          </div>

          <div className={styles.contentColumn}>
            <div className={styles.stats}>
              <div className={styles.statsHeader}>
                <h3 className={styles.statsTitle}>Манга</h3>
                {user.rates_manga_stats && (
                  <div className={styles.totalStats}>
                    <span className={styles.totalLabel}>Всего:</span>
                    <span className={styles.totalValue}>
                      {user.rates_manga_stats.watching + user.rates_manga_stats.completed + user.rates_manga_stats.planned + user.rates_manga_stats.on_hold + user.rates_manga_stats.dropped}
                    </span>
                  </div>
                )}
              </div>
              {user.rates_manga_stats && (
                <div className={styles.totalProgressBar}>
                  {['watching', 'completed', 'planned', 'on_hold', 'dropped'].map((status) => {
                    const value = user.rates_manga_stats![status as keyof typeof user.rates_manga_stats] as number;
                    const total = user.rates_manga_stats!.watching + user.rates_manga_stats!.completed + user.rates_manga_stats!.planned + user.rates_manga_stats!.on_hold + user.rates_manga_stats!.dropped;
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    if (percentage === 0) return null;
                    const isHovered = hoveredMangaStatus === status;
                    return (
                      <div
                        key={status}
                        className={`${styles.totalProgressSegment} ${isHovered ? styles.totalProgressSegmentHovered : ''}`}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: STATUS_COLORS[status],
                          opacity: hoveredMangaStatus ? (isHovered ? 1 : 0.3) : 1
                        }}
                      />
                    );
                  })}
                </div>
              )}
              {user.rates_manga_stats ? (
                <div className={styles.statsGrid}>
                  {['watching', 'completed', 'planned', 'on_hold', 'dropped'].map((status) => {
                    const value = user.rates_manga_stats![status as keyof typeof user.rates_manga_stats] as number;
                    const total = user.rates_manga_stats!.watching + user.rates_manga_stats!.completed + user.rates_manga_stats!.planned + user.rates_manga_stats!.on_hold + user.rates_manga_stats!.dropped;
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <div
                        key={status}
                        className={styles.statItem}
                        onClick={() => onNavigateToRates(status, 'manga')}
                        onMouseEnter={() => setHoveredMangaStatus(status)}
                        onMouseLeave={() => setHoveredMangaStatus(null)}
                      >
                        <div className={styles.statInfo}>
                          <span className={styles.statLabel}>{status === 'watching' ? 'Читаю' : STATUS_LABELS[status]}</span>
                          <span className={styles.statValue}>{value}</span>
                        </div>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: STATUS_COLORS[status]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.noStats}>Нет данных</p>
              )}
            </div>

          </div>
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.actionButton}
            onClick={handleOpenProfile}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            Shikimori
          </button>


          <button 
            className={styles.actionButton}
            onClick={handleClearCache}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            Очистить кэш
          </button>

          <button 
            className={`${styles.actionButton} ${styles.logoutButton}`}
            onClick={onLogout}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
