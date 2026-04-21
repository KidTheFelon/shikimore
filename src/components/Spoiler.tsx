import { useState } from "react";
import styles from "./Spoiler.module.css";

interface SpoilerProps {
  children: React.ReactNode;
  label?: string;
}

const Spoiler = ({ children, label = "Спойлер" }: SpoilerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`${styles.spoiler} ${isExpanded ? styles.expanded : ""}`}>
      <button
        className={styles.spoilerLabel}
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        {label}
        <svg
          className={styles.chevron}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d={isExpanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>
      <div className={styles.spoilerContent}>{children}</div>
    </div>
  );
};

export default Spoiler;
