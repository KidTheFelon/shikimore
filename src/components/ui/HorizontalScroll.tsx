import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./HorizontalScroll.module.css";
import { BASE_SCROLL_AMOUNT, ARROW_THRESHOLD, CACHE_UPDATE_DELAY, SEPARATOR_CLASS } from "../../utils/constants";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

const HorizontalScroll = ({ children, className = "" }: HorizontalScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  // Cache refs to prevent re-renders
  const cacheRef = useRef({
    itemWidth: 0,
    gap: 0,
    scrollStep: 0,
    lastWidthCheck: 0,
    isScrolling: false
  });

  const wheelTimerRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      // Handle edge case: no content or content fits entirely
      if (scrollWidth <= clientWidth + 1) {
        setShowLeftArrow(false);
        setShowRightArrow(false);
        scrollRef.current.parentElement?.classList.remove('hasContentLeft', 'hasContentRight');
        return;
      }

      // Show arrows with proper thresholds
      const hasLeft = scrollLeft > ARROW_THRESHOLD;
      const hasRight = scrollLeft + clientWidth < scrollWidth - ARROW_THRESHOLD;
      setShowLeftArrow(hasLeft);
      setShowRightArrow(hasRight);

      // Update fade classes on wrapper
      const wrapper = scrollRef.current.parentElement;
      if (wrapper) {
        if (hasLeft) {
          wrapper.classList.add('hasContentLeft');
        } else {
          wrapper.classList.remove('hasContentLeft');
        }

        if (hasRight) {
          wrapper.classList.add('hasContentRight');
        } else {
          wrapper.classList.remove('hasContentRight');
        }
      }
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      const scrollAmount = Math.max(BASE_SCROLL_AMOUNT, containerWidth * 0.8);
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scroll("left");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      scroll("right");
    }
  };

  const updateScrollCache = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    try {
      const cards = Array.from(el.children).filter(child => 
        child && !child.classList.contains(SEPARATOR_CLASS)
      ) as HTMLElement[];
      
      // Handle edge case: no children or only separators
      if (cards.length === 0) {
        cacheRef.current.scrollStep = 0;
        return;
      }
      
      const referenceItem = cards[0] || el.firstElementChild as HTMLElement;
      if (referenceItem) {
        cacheRef.current.itemWidth = referenceItem.offsetWidth;
        const style = window.getComputedStyle(el);
        cacheRef.current.gap = parseInt(style.columnGap || style.gap || "0");
        cacheRef.current.scrollStep = Math.max(
          cacheRef.current.itemWidth + cacheRef.current.gap, 
          el.clientWidth * 0.4
        );
        cacheRef.current.lastWidthCheck = Date.now();
      }
    } catch (error) {
      console.warn('Error updating scroll cache:', error);
      cacheRef.current.scrollStep = 0;
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    
    // Debounced resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        checkScroll();
        updateScrollCache();
      }, 100);
    };
    
    // Debounced mutation handler
    let mutationTimeout: number;
    const handleMutation = () => {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        checkScroll();
        updateScrollCache();
      }, 100);
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(el);
    
    // Add MutationObserver to handle dynamic content changes
    const mutationObserver = new MutationObserver(handleMutation);
    mutationObserver.observe(el, { childList: true, subtree: true });
    
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", handleResize);

    const handleWheelNative = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        
        if (cacheRef.current.isScrolling) return;

        // Update cache only if container size might have changed (debounced)
        if (Date.now() - cacheRef.current.lastWidthCheck > CACHE_UPDATE_DELAY) {
          updateScrollCache();
        }

        const direction = e.deltaY > 0 ? 1 : -1;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const isAtStart = scrollLeft <= ARROW_THRESHOLD;
        const isAtEnd = scrollLeft + clientWidth >= scrollWidth - ARROW_THRESHOLD;
        const contentFitsInWindow = scrollWidth <= clientWidth + ARROW_THRESHOLD;
        
        // Check if we should scroll through to page
        const shouldScrollThrough = 
          contentFitsInWindow || // All content fits - always scroll page
          (direction > 0 && isAtEnd && scrollWidth > clientWidth) || 
          (direction < 0 && isAtStart && scrollWidth > clientWidth);
        
        if (shouldScrollThrough) {
          // Let the page scroll normally - don't prevent default
          cacheRef.current.isScrolling = true;

          const resetScrolling = () => {
            cacheRef.current.isScrolling = false;
          };

          if (wheelTimerRef.current) {
            clearTimeout(wheelTimerRef.current);
          }
          wheelTimerRef.current = window.setTimeout(resetScrolling, 100);
          return;
        }

        // Normal horizontal scroll behavior
        if (cacheRef.current.scrollStep > 0) {
          e.preventDefault();
          cacheRef.current.isScrolling = true;
          
          el.scrollBy({
            left: direction * cacheRef.current.scrollStep,
            behavior: "smooth"
          });

          const resetScrolling = () => {
            cacheRef.current.isScrolling = false;
          };

          if (wheelTimerRef.current) {
            clearTimeout(wheelTimerRef.current);
          }
          wheelTimerRef.current = window.setTimeout(resetScrolling, 100);
        }
      }
    };

    // Initialize cache
    updateScrollCache();

    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      clearTimeout(resizeTimeout);
      clearTimeout(mutationTimeout);
      if (wheelTimerRef.current) {
        clearTimeout(wheelTimerRef.current);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", handleResize);
      el.removeEventListener("wheel", handleWheelNative);
    };
  }, [checkScroll, updateScrollCache]);

  return (
    <div className={`${styles.scrollContainerWrapper} ${showLeftArrow ? styles.hasLeftFade : ''} ${showRightArrow ? styles.hasRightFade : ''}`}>
      {showLeftArrow && (
        <button className={`${styles.scrollBtn} ${styles.scrollBtnLeft}`} onClick={() => scroll("left")} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <div
        className={`${styles.horizontalScrollContainer} ${className}`}
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="region"
        aria-label="Горизонтальная прокрутка"
      >
        {children}
      </div>
      {showRightArrow && (
        <button className={`${styles.scrollBtn} ${styles.scrollBtnRight}`} onClick={() => scroll("right")} aria-label="Forward">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default HorizontalScroll;
