import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./HorizontalScroll.module.css";

// Constants
const SCROLL_AMOUNT = 600;
const ARROW_THRESHOLD = 10;
const CACHE_UPDATE_DELAY = 1000;
const SEPARATOR_CLASS = 'relatedSeparator';

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

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      
      // Handle edge case: no content or content fits entirely
      if (scrollWidth <= clientWidth + 1) {
        setShowLeftArrow(false);
        setShowRightArrow(false);
        return;
      }
      
      // Show arrows with proper thresholds
      setShowLeftArrow(scrollLeft > ARROW_THRESHOLD);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - ARROW_THRESHOLD);
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
        behavior: "smooth",
      });
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
          
          setTimeout(resetScrolling, 100);
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

          // Better scrolling state management
          const resetScrolling = () => {
            cacheRef.current.isScrolling = false;
          };
          
          // Use both timeout and RAF for more reliable reset
          const timeoutId = setTimeout(resetScrolling, 500);
          requestAnimationFrame(() => {
            clearTimeout(timeoutId);
            resetScrolling();
          });
        }
      }
    };

    // Initialize cache
    updateScrollCache();

    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      clearTimeout(resizeTimeout);
      clearTimeout(mutationTimeout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", handleResize);
      el.removeEventListener("wheel", handleWheelNative);
    };
  }, [children, checkScroll, updateScrollCache]);

  return (
    <div className={styles.scrollContainerWrapper}>
      {showLeftArrow && (
        <button className={`${styles.scrollBtn} ${styles.scrollBtnLeft}`} onClick={() => scroll("left")} aria-label="Nazad">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <div 
        className={`${styles.horizontalScrollContainer} ${className}`} 
        ref={scrollRef}
      >
        {children}
      </div>
      {showRightArrow && (
        <button className={`${styles.scrollBtn} ${styles.scrollBtnRight}`} onClick={() => scroll("right")} aria-label="Vpered">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default HorizontalScroll;
