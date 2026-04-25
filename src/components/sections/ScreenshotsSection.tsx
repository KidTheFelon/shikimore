import { useState, useEffect, useCallback, useRef } from "react";
import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import HorizontalScroll from "../ui/HorizontalScroll";
import type { Screenshot } from "../../types";
import styles from "./ScreenshotsSection.module.css";

interface ScreenshotsSectionProps {
  screenshots: Screenshot[];
}

export default function ScreenshotsSection({ screenshots }: ScreenshotsSectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const selectedScreenshot = selectedIndex !== null ? screenshots[selectedIndex] : null;

  const closeViewer = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedIndex(null);
      setIsClosing(false);
    }, 200);
  }, []);

  const goToNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < screenshots.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, screenshots.length]);

  const goToPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "Escape") closeViewer();
    };

    const handleWheel = (e: WheelEvent) => {
      if (selectedIndex === null) return;
      e.preventDefault();
      if (e.deltaY > 0) goToNext();
      if (e.deltaY < 0) goToPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [selectedIndex, goToNext, goToPrev, closeViewer]);

  // Scroll carousel to selected thumbnail
  useEffect(() => {
    if (selectedIndex !== null && carouselRef.current) {
      const thumbnails = carouselRef.current.children;
      const activeThumbnail = thumbnails[selectedIndex] as HTMLElement;
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    }
  }, [selectedIndex]);

  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  return (
    <>
      <div className={styles.detailSection}>
        <h3 className={styles.detailSectionTitle}>Скриншоты</h3>
        <HorizontalScroll className={styles.detailScreenshots}>
          {screenshots.map((screenshot) => (
            <div
              key={screenshot.id}
              className={`${styles.screenshotItem} ${styles.clickable}`}
              onClick={() => setSelectedIndex(screenshots.indexOf(screenshot))}
            >
              <ImageWithSkeleton
                src={screenshot.x332_url || screenshot.original_url || ""}
                alt="Скриншот"
                className={styles.screenshotImage}
                loading="lazy"
              />
            </div>
          ))}
        </HorizontalScroll>
      </div>

      {selectedScreenshot && (
        <div className={`${styles.screenshotModal} ${isClosing ? styles.closing : ''}`} onClick={closeViewer}>
          <button
            className={`${styles.navButton} ${styles.navPrev}`}
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            disabled={selectedIndex === 0}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className={styles.screenshotModalContent} onClick={(e) => e.stopPropagation()}>
            <ImageWithSkeleton
              key={selectedScreenshot.id}
              src={selectedScreenshot.original_url || selectedScreenshot.x332_url || ""}
              alt="Скриншот в полном размере"
              loading="eager"
              useCache={true}
            />
            <button className={styles.modalClose} onClick={closeViewer}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            className={`${styles.navButton} ${styles.navNext}`}
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            disabled={selectedIndex === screenshots.length - 1}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <div className={styles.thumbnailsCarousel} ref={carouselRef}>
            {screenshots.map((screenshot, index) => (
              <div
                key={screenshot.id}
                className={`${styles.thumbnail} ${index === selectedIndex ? styles.thumbnailActive : ''}`}
                onClick={(e) => { e.stopPropagation(); setSelectedIndex(index); }}
              >
                <ImageWithSkeleton
                  src={screenshot.x332_url || screenshot.original_url || ""}
                  alt={`Скриншот ${index + 1}`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
