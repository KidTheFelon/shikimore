import { useState, useEffect, useRef, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { UserRate, ContentItem, UserInfo } from '../../types';
import { useAccentColor } from '../../hooks/useAccentColor';
import { handleApiError } from '../../utils/api';
import ContentBadges from './ContentBadges';
import { getMarqueeParams } from '../../utils/marquee';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import StarRating from '../ui/StarRating';
import styles from './UserRatesList.module.css';

interface UserRatesListProps {
  status: string;
  type: 'anime' | 'manga';
  onBack: () => void;
  onContentClick?: (item: ContentItem) => void;
  user?: UserInfo | null;
}

// Memoized component for marquee text
const MarqueeText = memo(({ text, width, fontSize, fontWeight, className }: { text: string; width: number; fontSize: number; fontWeight?: string; className: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(width);
  
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerWidth(rect.width);
    }
  }, []);
  
  const params = getMarqueeParams(text, containerWidth, fontSize, undefined, fontWeight);

  return (
    <div ref={containerRef} className={`animeTitleContainer ${params.isLong ? 'hasMarquee' : ''}`}>
      <div className={`animeMarqueeInner ${params.isLong ? 'isMarquee' : ''}`} style={params.style}>
        <h3 className={className}>{text}</h3>
        {params.isLong && <h3 className={className}>&nbsp;</h3>}
        {params.isLong && <h3 className={className}>{text}</h3>}
      </div>
    </div>
  );
});

export default function UserRatesList({ status, type, onBack, onContentClick, user }: UserRatesListProps) {
  const [rates, setRates] = useState<UserRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { handleImageLoad, getColor } = useAccentColor();
  const contentItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  const loadRates = async (page: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await invoke<{ items: UserRate[]; page: number; limit: number }>(
        type === 'anime' ? 'get_user_anime_rates_paginated' : 'get_user_manga_rates_paginated',
        {
          page,
          limit: 20,
          status
        }
      );

      if (append) {
        setRates(prev => [...prev, ...result.items]);
      } else {
        setRates(result.items);
      }
      // Only hide "load more" if we got 0 items (reached the end)
      setHasMore(result.items.length > 0);
    } catch (err) {
      console.error('Failed to load rates:', err);
      setError(handleApiError(err));
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    loadRates(1, false);
  }, [status, type]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadRates(nextPage, true);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      watching: type === 'anime' ? 'Смотрю' : 'Читаю',
      completed: type === 'anime' ? 'Просмотрено' : 'Прочитано',
      on_hold: 'На паузе',
      dropped: 'Брошено',
      planned: 'В планах',
      rewatching: 'Пересматриваю',
    };
    return labels[status] || status;
  };

  const getTotalCount = () => {
    if (!user) return rates.length;
    const stats = type === 'anime' ? user.rates_anime_stats : user.rates_manga_stats;
    if (!stats) return rates.length;
    return stats[status as keyof typeof stats] as number || rates.length;
  };

  const renderRateCard = (rate: UserRate, index: number) => {
    const content = type === 'anime' ? rate.anime : rate.manga;
    if (!content) return null;
    
    const accentColor = getColor(content.id);
    const title = content.russian || content.title;
    const russian = content.russian;
    const posterUrl = content.poster_url;

    return (
      <div
        key={rate.id}
        className={styles.item}
        tabIndex={0}
        onClick={() => onContentClick && onContentClick(content)}
        ref={(el) => (contentItemsRef.current[index] = el)}
        style={{
          borderLeft: `4px solid ${accentColor}`,
          transition: "border-color 0.3s ease",
        }}
      >
        <div className={styles.posterContainer}>
          {posterUrl ? (
            <ImageWithSkeleton
              src={posterUrl}
              alt={title}
              className={styles.poster}
              onLoad={(e) => handleImageLoad(e, content.id)}
              loading="lazy"
              useCache={true}
            />
          ) : (
            <div className={styles.posterPlaceholder}>
              Нет изображения
            </div>
          )}
          <ContentBadges item={content} accentColor={accentColor} />
        </div>
        
        <div className={styles.itemContent}>
          <div className={styles.itemHeader}>
            <div className={styles.titleContainer}>
              {russian && (
                <MarqueeText
                  text={russian}
                  width={175}
                  fontSize={16}
                  fontWeight="700"
                  className={styles.titleRussian}
                />
              )}
              <MarqueeText
                text={content.title}
                width={273}
                fontSize={13.6}
                fontWeight="500"
                className={styles.titleEnglish}
              />
            </div>
          </div>
          
          <div className={styles.itemMeta}>
            {rate.score && (
              <span className={styles.scoreBadge}>
                <StarRating score={parseFloat(rate.score)} size={14} />
              </span>
            )}
            {type === 'anime' && rate.episodes !== undefined && (
              <span className={styles.metaBadge}>
                {rate.episodes} эпизодов
              </span>
            )}
            {type === 'manga' && rate.chapters !== undefined && (
              <span className={styles.metaBadge}>
                {rate.chapters} глав
              </span>
            )}
            {type === 'manga' && rate.volumes !== undefined && (
              <span className={styles.metaBadge}>
                {rate.volumes} томов
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SkeletonCard = () => (
    <div className={styles.item}>
      <div className={`${styles.skeleton} ${styles.skeletonPoster}`} />
      <div className={styles.itemContent}>
        <div className={`${styles.skeleton} ${styles.skeletonText} ${styles.short}`} />
        <div className={`${styles.skeleton} ${styles.skeletonText} ${styles.medium}`} />
        <div className={styles.skeletonMeta}>
          <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />\n          <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />\n        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <button className={styles.backButton} onClick={onBack}>
          ← Назад
        </button>
        <h2 className={styles.title}>
          {getStatusLabel(status)}
        </h2>
        <div className={styles.list}>
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <button className={styles.backButton} onClick={onBack}>
          ← Назад
        </button>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={onBack}>
        ← Назад
      </button>
      <h2 className={styles.title}>
        {getStatusLabel(status)} ({getTotalCount()})
      </h2>
      {rates.length === 0 ? (
        <div className={styles.empty}>Нет записей</div>
      ) : (
        <>
          <div className={styles.list}>
            {rates.map((rate, index) => renderRateCard(rate, index))}
          </div>
          {hasMore && (
            <>
              {loadingMore && (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              )}
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
