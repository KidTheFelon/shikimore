import { useReleases } from '../../hooks/useReleases';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import HorizontalScroll from '../ui/HorizontalScroll';
import AnimeKindChip from '../chips/AnimeKindChip';
import styles from './ReleaseCalendar.module.css';

interface ReleaseCalendarProps {
  userId?: number;
  onContentClick?: (item: any) => void;
}

export default function ReleaseCalendar({ onContentClick }: ReleaseCalendarProps) {
  const { releases, loading, error, viewMode, setViewMode } = useReleases();

  // Форматируем дату для отображения
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Завтра';
    }

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'short',
    });
  };

  if (loading && releases.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Предстоящие релизы</h3>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleButton} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Неделя
            </button>
            <button
              className={`${styles.toggleButton} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Месяц
            </button>
          </div>
        </div>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Предстоящие релизы</h3>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleButton} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Неделя
            </button>
            <button
              className={`${styles.toggleButton} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Месяц
            </button>
          </div>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Предстоящие релизы</h3>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleButton} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Неделя
            </button>
            <button
              className={`${styles.toggleButton} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Месяц
            </button>
          </div>
        </div>
        <div className={styles.empty}>Нет предстоящих релизов</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Предстоящие релизы</h3>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'week' ? styles.active : ''}`}
            onClick={() => setViewMode('week')}
          >
            Неделя
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'month' ? styles.active : ''}`}
            onClick={() => setViewMode('month')}
          >
            Месяц
          </button>
        </div>
      </div>

      <HorizontalScroll>
        {releases.map((release) => (
          <div
            key={release.id}
            className={styles.releaseCard}
            onClick={() => onContentClick?.(release)}
            style={{ cursor: onContentClick ? 'pointer' : 'default' }}
          >
            <div className={styles.releasePoster}>
              <ImageWithSkeleton
                src={release.poster_url || ''}
                alt={release.title}
                className={styles.posterImage}
                useCache={true}
              />
              {release.kind && (
                <div className={styles.kindChip}>
                  <AnimeKindChip kind={release.kind} />
                </div>
              )}
            </div>
            <div className={styles.releaseInfo}>
              {release.aired_on?.date && (
                <span className={styles.releaseDate}>{formatDate(release.aired_on.date)}</span>
              )}
              <h4 className={styles.releaseTitle} title={release.russian || release.title}>
                {release.russian || release.title}
              </h4>
            </div>
          </div>
        ))}
      </HorizontalScroll>
    </div>
  );
}
