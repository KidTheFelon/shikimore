import { useEffect, useRef, useState } from 'react';
import styles from './YouTubePlayer.module.css';

interface YouTubePlayerProps {
  videoId: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  thumbnails?: Array<{ id: string; src: string }>;
  currentIndex?: number;
  onThumbnailClick?: (index: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function YouTubePlayer({ videoId, onClose, onNext, onPrev, canGoNext = true, canGoPrev = true, thumbnails = [], currentIndex = 0, onThumbnailClick }: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    return () => {
      delete window.onYouTubeIframeAPIReady;
    };
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isApiReady || !containerRef.current || playerRef.current) return;

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {},
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
          },
        },
      });
    } catch (error) {
      console.error('Failed to initialize YouTube player:', error);
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
        playerRef.current = null;
      }
    };
  }, [isApiReady, videoId]);

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
          <div ref={containerRef} className={styles.player} />
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
