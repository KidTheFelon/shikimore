import { useState, useRef, useEffect } from "react";
import styles from "./ReadMoreButton.module.css";

interface ReadMoreButtonProps {
  className?: string;
  children: React.ReactNode;
  maxLines?: number;
}

export default function ReadMoreButton({ className, children, maxLines = 6 }: ReadMoreButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      const maxHeight = lineHeight * maxLines;
      setIsOverflowing(el.scrollHeight > maxHeight);
    };

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);
    checkOverflow();

    return () => resizeObserver.disconnect();
  }, [maxLines]);

  return (
    <>
      <div
        ref={contentRef}
        className={`${className} ${expanded ? styles.expanded : ''}`}
      >
        {children}
      </div>
      {isOverflowing && (
        <button
          className={styles.readMoreBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Свернуть" : "Читать полностью..."}
        </button>
      )}
    </>
  );
}
