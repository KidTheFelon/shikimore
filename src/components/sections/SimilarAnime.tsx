import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SimilarAnime as SimilarAnimeType } from "../../types";
import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import HorizontalScroll from "../ui/HorizontalScroll";
import AnimeKindChip from "../chips/AnimeKindChip";
import { getMarqueeParams } from "../../utils/marquee";
import styles from "./SimilarAnime.module.css";

interface SimilarAnimeProps {
  animeId: number;
  onNavigate: (type: "anime" | "manga", id: number) => void;
}

export default function SimilarAnime({ animeId, onNavigate }: SimilarAnimeProps) {
  const [similarList, setSimilarList] = useState<SimilarAnimeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchSimilar = async () => {
      setLoading(true);
      setError(null);

      try {
        // Получаем список похожего аниме из REST API Shikimori
        const similar = await invoke<SimilarAnimeType[]>("get_similar_anime", { id: animeId });

        // Ограничиваем список до 10 тайтлов
        const limitedSimilar = similar.slice(0, 10);

        if (!abortController.signal.aborted) {
          setSimilarList(limitedSimilar);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки похожего аниме");
          console.error("Error fetching similar anime:", err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSimilar();

    return () => {
      abortController.abort();
    };
  }, [animeId]);

  if (loading) {
    return (
      <div className={styles.similarSection}>
        <h3 className={styles.similarTitle}>Похожее аниме</h3>
        <div className={styles.similarLoading}>
          <div className="loadingSpinner" />
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.similarSection}>
        <h3 className={styles.similarTitle}>Похожее аниме</h3>
        <div className={styles.similarError}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const validSimilarList = similarList.filter(anime => anime.id !== undefined);

  if (validSimilarList.length === 0) {
    return null;
  }

  const handleClick = (id: number | undefined) => {
    if (id !== undefined) {
      onNavigate("anime", id);
    }
  };

  return (
    <div className={styles.similarSection}>
      <h3 className={styles.similarTitle}>Похожее аниме</h3>
      <HorizontalScroll className={styles.similarList}>
        {validSimilarList.map((anime) => (
          <div
            key={anime.id}
            className={`${styles.similarCard} ${styles.clickable}`}
            onClick={() => handleClick(anime.id)}
          >
            <div className={styles.similarPoster}>
              {anime.image?.original || anime.image?.preview ? (
                <ImageWithSkeleton
                  src={`https://shikimori.io${anime.image?.original || anime.image?.preview || ""}`}
                  alt={anime.russian || anime.name || "Anime"}
                  loading="lazy"
                />
              ) : (
                <div className={styles.similarPosterPlaceholder}>Нет изображения</div>
              )}
            </div>
            {anime.kind && (
              <div className={styles.similarKindChip}>
                <AnimeKindChip kind={anime.kind} />
              </div>
            )}
            <div className={styles.similarInfo}>
              {(() => {
                const title = anime.russian || anime.name || 'Anime';
                const titleParams = getMarqueeParams(title, 140, 14, undefined, '500');
                return (
                  <div className={`similarTitleContainer ${titleParams.isLong ? 'hasMarquee' : ''}`}>
                    <div className={`${styles.similarTitleText} similarTitleMarqueeInner ${titleParams.isLong ? 'isMarquee' : ''}`} style={titleParams.style} title={title}>
                      {title}
                      {titleParams.isLong && <>&nbsp;{title}</>}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
      </HorizontalScroll>
    </div>
  );
}
