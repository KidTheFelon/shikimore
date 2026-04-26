import type { AnimeDetail, MangaDetail } from "../../types";
import ImageWithSkeleton from "./ImageWithSkeleton";
import styles from "./AnimePreviewPopup.module.css";
import { createPortal } from "react-dom";

interface AnimePreviewPopupProps {
  data: AnimeDetail | MangaDetail | null;
  loading: boolean;
  position: { x: number; y: number };
  visible: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function AnimePreviewPopup({
  data,
  loading,
  position,
  visible,
  onMouseEnter,
  onMouseLeave,
}: AnimePreviewPopupProps) {
  if (!visible) return null;

  const isAnime = data && "episodes" in data;
  const title = data ? (data as any).title || (data as any).name : "";
  const russian = data ? (data as any).russian : undefined;
  const posterUrl = data ? (data as any).poster_url : undefined;
  const description = data ? (data as any).description : undefined;
  const url = data ? (data as any).url : undefined;

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
      ) : data ? (
        <div className={styles.content}>
          <div className={styles.posterWrapper}>
            {posterUrl ? (
              <ImageWithSkeleton
                src={posterUrl}
                alt={russian || title}
                className={styles.poster}
                useCache={true}
              />
            ) : (
              <div className={styles.posterPlaceholder}>Нет фото</div>
            )}
          </div>
          <div className={styles.info}>
            <h4 className={styles.name}>{russian || title}</h4>
            {russian && russian !== title && (
              <p className={styles.originalName}>{title}</p>
            )}
            {isAnime && (data as AnimeDetail).kind && (
              <p className={styles.kind}>{(data as AnimeDetail).kind}</p>
            )}
            {!isAnime && (data as MangaDetail).kind && (
              <p className={styles.kind}>{(data as MangaDetail).kind}</p>
            )}
            {description && (
              <p className={styles.description}>
                {description.length > 200
                  ? description.slice(0, 200) + "..."
                  : description}
              </p>
            )}
            {url && (
              <a
                href={url}
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
