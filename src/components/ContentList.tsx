import { useRef } from "react";
import { ErrorIcon, EmptyIcon } from "./Icons";
import type { ContentItem } from "../types";
import styles from "./ContentList.module.css";
import ContentBadges from "./ContentBadges";
import {
  getItemType,
  getItemTitle,
  getItemRussian,
  getItemStatus,
  getItemDescription
} from "../utils/contentHelpers";
import { getStatusText, getPersonRoles } from "../utils/badgeTexts";
import { getMarqueeParams } from "../utils/marquee";

interface ContentListProps {
  items: ContentItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  onContentClick: (item: ContentItem) => void;
  cardColors: Record<number, string>;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => void;
}

export default function ContentList({
  items,
  loading,
  loadingMore,
  error,
  onContentClick,
  cardColors,
  onImageLoad
}: ContentListProps) {
  const contentItemsRef = useRef<(HTMLDivElement | null)[]>([]);


  const renderContentCard = (item: ContentItem, index: number) => {
    const itemType = getItemType(item);
    const accentColor = cardColors[item.id] || "transparent";
    
    
    const status = getStatusText(getItemStatus(item));
    
    return (
      <div
        key={item.id}
        className={styles.animeItem}
        onClick={() => onContentClick(item)}
        tabIndex={0}
        ref={(el) => (contentItemsRef.current[index] = el)}
        style={{
          borderLeft: `4px solid ${accentColor}`,
          transition: "border-color 0.3s ease",
        }}
      >
        <div className={styles.animePosterContainer}>
          {item.poster_url ? (
            <img
              src={item.poster_url}
              alt={getItemTitle(item)}
              className={styles.animePoster}
              onLoad={(e) => onImageLoad(e, item.id)}
              loading="lazy"
            />
          ) : (
            <div className={styles.animePosterPlaceholder}>
              Нет изображения
            </div>
          )}
          
          <ContentBadges item={item} />
        </div>
        
        <div className={styles.animeContent}>
          <div className={styles.animeHeader}>
            <div className={styles.animeTitleContainer}>
              {getItemRussian(item) && (() => {
                const russian = getItemRussian(item)!;
                const params = getMarqueeParams(russian, 210, 7);
                return (
                  <div className={`animeTitleContainer ${params.isLong ? 'hasMarquee' : ''}`}>
                    <div className={`animeMarqueeInner ${params.isLong ? 'isMarquee' : ''}`} style={params.style}>
                      <h3 className={styles.animeTitleRussian}>{russian}</h3>
                      {params.isLong && <h3 className={styles.animeTitleRussian}>&nbsp;</h3>}
                      {params.isLong && <h3 className={styles.animeTitleRussian}>{russian}</h3>}
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const title = getItemTitle(item);
                const params = getMarqueeParams(title, 273, 7);
                return (
                  <div className={`animeTitleContainer ${params.isLong ? 'hasMarquee' : ''}`}>
                    <div className={`animeMarqueeInner ${params.isLong ? 'isMarquee' : ''}`} style={params.style}>
                      <h3 className={styles.animeTitleEnglish}>{title}</h3>
                      {params.isLong && <h3 className={styles.animeTitleEnglish}>&nbsp;</h3>}
                      {params.isLong && <h3 className={styles.animeTitleEnglish}>{title}</h3>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          
          
          {itemType !== "characters" && itemType !== "people" && (
            <>
              <div className={styles.animeMeta}>
                {status && (
                  <span className={styles.animeStatus}>{status}</span>
                )}
              </div>
            </>
          )}
          
          {(itemType === "characters" || itemType === "people") && (
            <>
              {itemType === "people" && (
                <div className={styles.personRoles}>
                  {getPersonRoles(item as any).map((role, index) => (
                    <span key={index} className={styles.roleBadge}>{role}</span>
                  ))}
                </div>
              )}
              
              {getItemDescription(item) && (
                <p className={styles.animeDescription}>
                  {getItemDescription(item)!.length > 200 
                    ? `${getItemDescription(item)!.substring(0, 200)}...` 
                    : getItemDescription(item)}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const SkeletonCard = () => (
    <div className={styles.animeItem}>
      <div className={`${styles.skeleton} ${styles.skeletonPoster}`} />
      <div className={styles.animeContent}>
        <div className={`${styles.skeleton} ${styles.skeletonText} ${styles.short}`} />
        <div className={`${styles.skeleton} ${styles.skeletonText} ${styles.medium}`} />
        <div className={styles.skeletonMeta}>
          <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />
          <div className={`${styles.skeleton} ${styles.skeletonBadge}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`} />
        <div className={`${styles.skeleton} ${styles.skeletonText}`} />
        <div className={`${styles.skeleton} ${styles.skeletonText} ${styles.short}`} />
      </div>
    </div>
  );

  if (loading && items.length === 0) {
    return (
      <div className={styles.animeList}>
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <ErrorIcon />
        <div className={styles.errorContent}>
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <EmptyIcon />
        <div className={styles.emptyContent}>
          <h3>Контент не найден</h3>
          <p>Попробуйте изменить поиск или фильтры</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.animeList}>
      {items.map((item, index) => renderContentCard(item, index))}
      
      {loadingMore && (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}
    </div>
  );
}
