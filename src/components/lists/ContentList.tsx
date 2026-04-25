import { useRef, memo, useMemo, useState, useEffect } from "react";
import { ErrorIcon, EmptyIcon } from "../ui/Icons";
import type { ContentItem } from "../../types";
import styles from "./ContentList.module.css";
import ContentBadges from "./ContentBadges";
import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import {
  getItemType,
  getItemTitle,
  getItemRussian,
  getItemStatus,
  getItemDescription
} from "../../utils/contentHelpers";
import { getStatusText, getPersonRoles } from "../../utils/badgeTexts";
import { getMarqueeParams } from "../../utils/marquee";

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
  
  const params = useMemo(() => getMarqueeParams(text, containerWidth, fontSize, undefined, fontWeight), [text, containerWidth, fontSize, fontWeight]);

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

interface ContentListProps {
  items: ContentItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  onContentClick: (item: ContentItem) => void;
  cardColors: Record<number, string>;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => void;
  blurred?: boolean;
  slideDirection?: 'left' | 'right' | null;
  exitDirection?: 'left' | 'right' | null;
  animationPhase?: 'exiting' | 'entering' | 'none';
  filterAnimationKey?: number;
}

function ContentList({
  items,
  loading,
  loadingMore,
  error,
  onContentClick,
  cardColors,
  onImageLoad,
  blurred,
  slideDirection,
  exitDirection,
  animationPhase,
  filterAnimationKey
}: ContentListProps) {
  const contentItemsRef = useRef<(HTMLDivElement | null)[]>([]);


  const renderContentCard = (item: ContentItem, index: number) => {
    const itemType = getItemType(item);
    const accentColor = cardColors[item.id] || "transparent";
    
    
    const status = getStatusText(getItemStatus(item));
    
    return (
      <div
        key={`${item.id}-${filterAnimationKey ?? 0}`}
        className={`${styles.animeItem} ${(filterAnimationKey ?? 0) > 0 ? styles.liftUp : ''}`}
        onClick={() => onContentClick(item)}
        tabIndex={0}
        ref={(el) => (contentItemsRef.current[index] = el)}
        style={{
          borderLeft: `4px solid ${accentColor}`,
          transition: "border-color 0.3s ease",
          animationDelay: `${index * 50}ms`,
          '--accent-color': accentColor,
        } as React.CSSProperties}
      >
        <div className={styles.animePosterContainer}>
          {item.poster_url ? (
            <ImageWithSkeleton
              src={item.poster_url}
              alt={getItemTitle(item)}
              className={styles.animePoster}
              onLoad={(e) => onImageLoad(e, item.id)}
              loading="lazy"
              useCache={true}
            />
          ) : (
            <div className={styles.animePosterPlaceholder}>
              Нет изображения
            </div>
          )}
          
          <ContentBadges item={item} accentColor={accentColor} />
        </div>
        
        <div className={styles.animeContent}>
          <div className={styles.animeHeader}>
            <div className={styles.animeTitleContainer}>
              {getItemRussian(item) && (
                <MarqueeText
                  text={getItemRussian(item)!}
                  width={300}
                  fontSize={16}
                  fontWeight="700"
                  className={styles.animeTitleRussian}
                />
              )}
              <MarqueeText
                text={getItemTitle(item)}
                width={273}
                fontSize={13.6}
                fontWeight="500"
                className={styles.animeTitleEnglish}
              />
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
      <div className={`${styles.animeList} ${animationPhase === 'entering' && slideDirection ? styles[`slideIn${slideDirection === 'left' ? 'Left' : 'Right'}`] : ''}`}>
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
    <div className={`${styles.animeList} ${blurred ? styles.blurred : ""} ${animationPhase === 'exiting' && exitDirection ? styles[`slideOut${exitDirection === 'left' ? 'Left' : 'Right'}`] : ''} ${animationPhase === 'entering' && slideDirection ? styles[`slideIn${slideDirection === 'left' ? 'Left' : 'Right'}`] : ''}`}>
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

export default memo(ContentList);
