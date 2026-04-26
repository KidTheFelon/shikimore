import type { CharacterDetail } from "../../types";
import ImageWithSkeleton from "./ImageWithSkeleton";
import styles from "./CharacterPreviewPopup.module.css";
import { createPortal } from "react-dom";

interface CharacterPreviewPopupProps {
  character: CharacterDetail | null;
  loading: boolean;
  position: { x: number; y: number };
  visible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function CharacterPreviewPopup({
  character,
  loading,
  position,
  visible,
  onMouseEnter,
  onMouseLeave,
}: CharacterPreviewPopupProps) {
  if (!visible) return null;

  const popupContent = (
    <div
      className={styles.popup}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {loading ? (
        <div className={styles.loading}>
          <div className="loadingSpinner" />
          <p>Загрузка...</p>
        </div>
      ) : character ? (
        <div className={styles.content}>
          <div className={styles.posterWrapper}>
            {character.poster_url ? (
              <ImageWithSkeleton
                src={character.poster_url}
                alt={character.russian || character.name}
                className={styles.poster}
                useCache={true}
              />
            ) : (
              <div className={styles.posterPlaceholder}>Нет фото</div>
            )}
          </div>
          <div className={styles.info}>
            <h4 className={styles.name}>
              {character.russian || character.name}
            </h4>
            {character.russian && character.russian !== character.name && (
              <p className={styles.originalName}>{character.name}</p>
            )}
            {character.japanese && (
              <p className={styles.japaneseName}>{character.japanese}</p>
            )}
            {character.description && (
              <p className={styles.description}>
                {character.description.length > 200
                  ? character.description.slice(0, 200) + "..."
                  : character.description}
              </p>
            )}
            {character.url && (
              <a
                href={character.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Открыть на Shikimori
              </a>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(popupContent, document.body);
}
