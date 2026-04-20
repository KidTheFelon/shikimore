import type { ContentType } from "../types";
import { AnimeIcon, MangaIcon } from "./Icons";
import styles from "./BottomBar.module.css";

interface BottomBarProps {
  contentType: ContentType;
  onContentTypeChange: (type: ContentType) => void;
}

export default function BottomBar({ contentType, onContentTypeChange }: BottomBarProps) {
  return (
    <>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="glass-distortion">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <div className={styles.bottomBar}>
        <button
          className={`${styles.barBtn} ${contentType === "anime" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("anime")}
        >
          <AnimeIcon size={40} />
          <span>Аниме</span>
        </button>
        <button
          className={`${styles.barBtn} ${contentType === "manga" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("manga")}
        >
          <MangaIcon size={40} />
          <span>Манга</span>
        </button>
      </div>
    </>
  );
}
