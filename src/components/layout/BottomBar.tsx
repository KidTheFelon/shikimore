import type { ContentType } from "../../types";
import { AnimeIcon, MangaIcon } from "../ui/Icons";
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
          <AnimeIcon size={32} />
          <span>Аниме</span>
        </button>
        <button
          className={`${styles.barBtn} ${contentType === "manga" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("manga")}
        >
          <MangaIcon size={32} />
          <span>Манга</span>
        </button>
        <button
          className={`${styles.barBtn} ${contentType === "profile" ? styles.active : ""}`}
          onClick={() => onContentTypeChange("profile")}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>Профиль</span>
        </button>
      </div>
    </>
  );
}
