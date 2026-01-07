import { useState, useRef, useEffect } from "react";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export const HorizontalScroll = ({ children, className = "" }: HorizontalScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 600;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(el);
    
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    let isScrolling = false;

    const handleWheelNative = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const isAtLeftEdge = scrollLeft <= 0;
        const isAtRightEdge = scrollLeft + clientWidth >= scrollWidth;

        if ((e.deltaY > 0 && !isAtRightEdge) || (e.deltaY < 0 && !isAtLeftEdge)) {
          e.preventDefault();
        } else {
          // Позволяем всплывать событию для скролла страницы
          return;
        }
        
        if (isScrolling) return;

        const cards = Array.from(el.children).filter(child => 
          !child.classList.contains('related-separator')
        ) as HTMLElement[];
        
        const referenceItem = cards[0] || el.firstElementChild as HTMLElement;
        
        if (referenceItem) {
          isScrolling = true;
          // Fallback если ширина 0 (например, элемент еще не отрисован)
          const itemWidth = referenceItem.offsetWidth || 200; 
          const style = window.getComputedStyle(el);
          const gap = parseInt(style.columnGap || style.gap || "0");
          const scrollStep = Math.max(itemWidth + gap, el.clientWidth * 0.4);
          
          const direction = e.deltaY > 0 ? 1 : -1;
          el.scrollBy({
            left: direction * scrollStep,
            behavior: "smooth"
          });

          setTimeout(() => {
            isScrolling = false;
          }, 300);
        }
      }
    };

    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      el.removeEventListener("wheel", handleWheelNative);
    };
  }, [children]);

  return (
    <div className="scroll-container-wrapper">
      {showLeftArrow && (
        <button className="scroll-btn scroll-btn-left" onClick={() => scroll("left")} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <div 
        className={`horizontal-scroll-container ${className}`} 
        ref={scrollRef}
      >
        {children}
      </div>
      {showRightArrow && (
        <button className="scroll-btn scroll-btn-right" onClick={() => scroll("right")} aria-label="Вперед">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
};
