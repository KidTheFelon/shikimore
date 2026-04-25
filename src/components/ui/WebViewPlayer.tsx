import { useState, useEffect, useRef } from 'react';
import styles from './WebViewPlayer.module.css';

interface WebViewPlayerProps {
  url: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  thumbnails?: Array<{ id: string; src: string }>;
  currentIndex?: number;
  onThumbnailClick?: (index: number) => void;
}

export default function WebViewPlayer({ url, onClose, onNext, onPrev, canGoNext = true, canGoPrev = true, thumbnails = [], currentIndex = 0, onThumbnailClick }: WebViewPlayerProps) {
  const [isClosing, setIsClosing] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Scroll carousel to selected thumbnail
  useEffect(() => {
    if (carouselRef.current && thumbnails.length > 0) {
      const thumbs = carouselRef.current.children;
      const activeThumb = thumbs[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    }
  }, [currentIndex, thumbnails.length]);
  // Add protocol if URL is protocol-relative
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;

  return (
    <div className={`${styles.overlay} ${isClosing ? styles.closing : ''}`} onClick={handleClose}>
      {(onPrev || onNext) && (
        <button
          className={`${styles.navButton} ${styles.navPrev}`}
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          disabled={!canGoPrev}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={handleClose}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
        <div className={styles.wrapper}>
          <iframe
            src={fullUrl}
            className={styles.iframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video player"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className={styles.info}>
          <span className={styles.source}>
            {new URL(fullUrl).hostname.replace('www.', '').toUpperCase()}
          </span>
        </div>
      </div>
      {(onPrev || onNext) && (
        <button
          className={`${styles.navButton} ${styles.navNext}`}
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          disabled={!canGoNext}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
      {thumbnails.length > 0 && (
        <div className={styles.thumbnailsCarousel} ref={carouselRef}>
          {thumbnails.map((thumb, index) => (
            <div
              key={thumb.id}
              className={`${styles.thumbnail} ${index === currentIndex ? styles.thumbnailActive : ''}`}
              onClick={(e) => { e.stopPropagation(); onThumbnailClick?.(index); }}
            >
              <img src={thumb.src} alt={`Video ${index + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
