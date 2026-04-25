import { useState, useRef, useEffect, useCallback } from "react";
import type { AnimeDetail, MangaDetail, UserInfo } from "../../types";
import styles from "./DetailView.module.css";
import GenreChip from "../chips/GenreChip";
import InfoChip from "../chips/InfoChip";
import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import ReadMoreButton from "../ui/ReadMoreButton";
import SimilarAnime from "../sections/SimilarAnime";
import DescriptionWithLinks from "../utils/DescriptionWithLinks";
import CharactersSection from "../sections/CharactersSection";
import RelatedSection from "../sections/RelatedSection";
import VideosSection from "../sections/VideosSection";
import ScreenshotsSection from "../sections/ScreenshotsSection";
import ExternalLinksSection from "../sections/ExternalLinksSection";
import UserRateEditor from "./UserRateEditor";
import StarRating from "../ui/StarRating";
import ConfirmDialog from "../ui/ConfirmDialog";
import { getInfoChipLabel, STATUS_TEXTS, KIND_TEXTS } from "../../utils/badgeTexts";
import { getMarqueeParams } from "../../utils/marquee";

interface DetailViewProps {
  data: AnimeDetail | MangaDetail | null;
  type: "anime" | "manga";
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onNavigate: (type: "anime" | "manga" | "characters", id: number) => void;
  onSearchGenre: (genreId: number, genreName: string) => void;
  onSearchStudio?: (studioId: number, studioName: string) => void;
  onSearchPublisher?: (publisherId: number, publisherName: string) => void;
  user: UserInfo | null;
}

export default function DetailView({
  data,
  type,
  loading,
  error,
  onBack,
  onNavigate,
  onSearchGenre,
  onSearchStudio,
  onSearchPublisher,
  user
}: DetailViewProps) {
  const [showStats, setShowStats] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsHoverTimeoutRef = useRef<number | null>(null);
  const [titleContainerWidth, setTitleContainerWidth] = useState(600);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const [hasUnsavedRateChanges, setHasUnsavedRateChanges] = useState(false);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);

  useEffect(() => {
    if (!titleContainerRef.current) return;

    const updateWidth = () => {
      if (titleContainerRef.current) {
        setTitleContainerWidth(titleContainerRef.current.offsetWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(titleContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Move all useCallback before early returns to avoid hooks order issues
  const handleBack = useCallback(() => {
    if (hasUnsavedRateChanges) {
      setBackConfirmOpen(true);
    } else {
      onBack();
    }
  }, [hasUnsavedRateChanges, onBack]);

  const handleBackConfirmed = useCallback(() => {
    setBackConfirmOpen(false);
    onBack();
  }, [onBack]);

  const handleBackCancelled = useCallback(() => {
    setBackConfirmOpen(false);
  }, []);

  const handleUnsavedChangesChange = useCallback((hasChanges: boolean) => {
    setHasUnsavedRateChanges(hasChanges);
  }, []);

  const formatDate = useCallback((date?: { year?: number; month?: number; day?: number; date?: string }) => {
    if (!date) return null;
    if (date.date) {
      const parts = date.date.split("-");
      if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
      return date.date;
    }
    const parts: string[] = [];
    if (date.day) parts.push(date.day.toString().padStart(2, "0"));
    if (date.month) parts.push(date.month.toString().padStart(2, "0"));
    if (date.year) parts.push(date.year.toString());
    return parts.length > 0 ? parts.join(".") : null;
  }, []);

  const formatRating = useCallback((rating?: string) => {
    const ratings: Record<string, string> = {
      g: "G",
      pg: "PG",
      pg_13: "PG-13",
      r: "R",
      r_plus: "R+",
      rx: "RX",
    };
    return rating ? ratings[rating] || rating.toUpperCase() : null;
  }, []);

  const formatStatus = useCallback((status?: string) => {
    return status ? STATUS_TEXTS[status] || status : null;
  }, []);

  const formatKind = useCallback((kind?: string) => {
    return kind ? KIND_TEXTS[kind] || kind : null;
  }, []);

  const getKindColor = useCallback((kind?: string, episodes?: number, episodesAired?: number) => {
    const colors: Record<string, string> = {
      movie: "rgba(239, 68, 68, 1)",
      ova: "rgba(139, 92, 246, 1)",
      ona: "rgba(34, 197, 94, 1)",
      special: "rgba(251, 146, 60, 1)",
      tv_13: "rgba(59, 130, 246, 1)",
      tv_24: "rgba(59, 130, 246, 1)",
      tv_48: "rgba(59, 130, 246, 1)",
      music: "rgba(236, 72, 153, 1)",
      doujin: "rgba(168, 85, 247, 1)",
      manga: "rgba(245, 158, 11, 1)",
      manhwa: "rgba(245, 158, 11, 1)",
      manhua: "rgba(245, 158, 11, 1)",
      light_novel: "rgba(168, 85, 247, 1)",
      novel: "rgba(168, 85, 247, 1)",
      one_shot: "rgba(239, 68, 68, 1)",
    };

    if (kind === "tv" && episodes && episodesAired && episodes > 0) {
      const progress = Math.min(episodesAired / episodes, 1) * 100;
      const gradient = `linear-gradient(to right, rgba(59, 130, 246, 1) 0%, rgba(59, 130, 246, 1) ${progress}%, rgba(59, 130, 246, 0.3) ${progress}%, rgba(59, 130, 246, 0.3) 100%)`;
      return gradient;
    }

    const color = kind ? colors[kind] || "var(--primary)" : "var(--primary)";
    return color;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statsRef.current && !statsRef.current.contains(event.target as Node)) {
        setShowStats(false);
      }
    };

    if (showStats) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStats]);

  useEffect(() => {
    return () => {
      if (statsHoverTimeoutRef.current) {
        clearTimeout(statsHoverTimeoutRef.current);
      }
    };
  }, []);

  const handleStatsMouseEnter = () => {
    if (statsHoverTimeoutRef.current) {
      clearTimeout(statsHoverTimeoutRef.current);
    }
    statsHoverTimeoutRef.current = window.setTimeout(() => {
      setShowStats(true);
    }, 300);
  };

  const handleStatsMouseLeave = () => {
    if (statsHoverTimeoutRef.current) {
      clearTimeout(statsHoverTimeoutRef.current);
      statsHoverTimeoutRef.current = null;
    }
    // Не скрываем сразу при mouse leave - даем пользователю время переместить мышь в popup
  };


  if (loading || !data) {
    return (
      <div className={styles.detailView}>
        <button className={styles.detailBackBtn} onClick={handleBack}>
          <span className={styles.backArrow}>{"<"} </span>
          <span>Назад к списку</span>
        </button>
        <div className={styles.detailLoading}>
          <div className="loadingSpinner" />
          <p>Загрузка деталей...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.detailView}>
        <button className={styles.detailBackBtn} onClick={handleBack}>
          <span className={styles.backArrow}>{"<"} </span>
          <span>Назад к списку</span>
        </button>
        <div className={styles.detailError}>
          <p>Ошибка загрузки: {error}</p>
        </div>
      </div>
    );
  }

  const isAnime = type === "anime";
  const animeData = isAnime ? (data as AnimeDetail) : null;
  const mangaData = !isAnime ? (data as MangaDetail) : null;


  return (
    <div className={styles.detailView}>
      <button className={styles.detailBackBtn} onClick={handleBack}>
        ← Назад к списку
      </button>

      {data.poster_url && (
        <div className={styles.heroHeader}>
          <div 
            className={styles.heroBackground}
            style={{ backgroundImage: `url(${data.poster_url})` }}
          />
          <div className={styles.heroOverlay} />
        </div>
      )}

      <div className={styles.detailHeader}>
        <div className={styles.detailPosterContainer}>
          <div className={styles.detailPosterWrapper}>
            {data.poster_url ? (
              <ImageWithSkeleton
                src={data.poster_url}
                alt={data.title}
                className={styles.detailPoster}
                useCache={true}
              />
            ) : (
              <div className={styles.detailPosterPlaceholder}>Нет изображения</div>
            )}
          </div>
          <div className={styles.posterOverlay} style={{ background: getKindColor(data.kind, isAnime ? animeData?.episodes : undefined, isAnime ? (animeData?.status === "released" ? animeData?.episodes : (animeData?.episodes_aired ?? animeData?.episodes)) : undefined) || 'var(--primary)' }}>
            {data.kind && (
              <div className={styles.posterOverlayItem}>
                {formatKind(data.kind)}
              </div>
            )}
            {isAnime && animeData?.episodes && (
              <div className={styles.posterOverlayItem}>
                {(() => {
                  const aired = animeData?.status === "released" ? animeData.episodes : (animeData?.episodes_aired ?? animeData?.episodes);
                  return aired ? `${aired} / ${animeData.episodes} эп.` : `${animeData.episodes} эп.`;
                })()}
              </div>
            )}
            {!isAnime && mangaData?.volumes && (
              <div className={styles.posterOverlayItem}>{mangaData.volumes} том.</div>
            )}
            {!isAnime && mangaData?.chapters && (
              <div className={styles.posterOverlayItem}>{mangaData.chapters} гл.</div>
            )}
          </div>
        </div>
        <div className={styles.detailInfo}>
          <div className={styles.detailTitleRow}>
            <div className={styles.detailMainTitles} ref={titleContainerRef}>
              {(() => {
                const mainTitle = data.russian || data.title;
                const isLong = mainTitle.length > 20;
                const textWidth = mainTitle.length * 6;
                const duration = (textWidth + 32) / 5;
                return (
                  <div className={`detailTitleContainer ${isLong ? 'hasMarquee' : ''}`}>
                    <h1 className={`${styles.detailTitle} detailTitleMarqueeInner ${isLong ? 'isMarquee' : ''}`} style={isLong ? { "--marquee-duration": `${duration}s` } as React.CSSProperties : {}}>
                      {mainTitle}
                      {isLong && <>&nbsp;{mainTitle}</>}
                    </h1>
                  </div>
                );
              })()}
              {data.russian && data.russian !== data.title && (() => {
                const isLong = data.title.length > 30;
                const textWidth = data.title.length * 8;
                const duration = (textWidth + 32) / 5;
                return (
                  <div className={`detailTitleContainer ${isLong ? 'hasMarquee' : ''}`}>
                    <h2 className={`${styles.detailRussian} detailTitleMarqueeInner ${isLong ? 'isMarquee' : ''}`} style={isLong ? { "--marquee-duration": `${duration}s` } as React.CSSProperties : {}}>
                      {data.title}
                      {isLong && <>&nbsp;{data.title}</>}
                    </h2>
                  </div>
                );
              })()}
              {data.english && 
               data.english !== data.title && 
               data.english !== data.russian &&
               !data.title.toLowerCase().includes(data.english.toLowerCase()) &&
               !(data.russian && data.russian.toLowerCase().includes(data.english.toLowerCase())) &&
               !data.english.toLowerCase().includes(data.title.toLowerCase()) &&
               !(data.russian && data.english.toLowerCase().includes(data.russian.toLowerCase())) && (() => {
                const englishParams = getMarqueeParams(data.english, titleContainerWidth, 7, undefined, undefined, undefined, 5);
                return (
                  <div className={`detailTitleContainer ${englishParams.isLong ? 'hasMarquee' : ''}`}>
                    <div className={`${styles.detailEnglish} detailTitleMarqueeInner ${englishParams.isLong ? 'isMarquee' : ''}`} style={englishParams.style}>
                      {data.english}
                      {englishParams.isLong && <>&nbsp;{data.english}</>}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className={styles.genreAndEditorContainer}>
              {data.genres && data.genres.length > 0 && (
                <div className={styles.genreChipsContainer}>
                  {data.genres.map(g => (
                    <GenreChip
                      key={g.id}
                      id={g.id}
                      name={g.russian || g.name}
                      onClick={onSearchGenre}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.detailMetaContainer}>
            <div className={styles.detailMetaLeft}>
              <div className={styles.detailMeta}>
                {data.score !== undefined && (
                  <div
                    ref={statsRef}
                    className={`${styles.detailScore} ${styles.clickable} ${showStats ? styles.active : ''} ${typeof data.score === 'number' && data.score >= 9 ? styles.highScore : ''}`}
                    onClick={() => setShowStats(!showStats)}
                    onMouseEnter={handleStatsMouseEnter}
                    onMouseLeave={handleStatsMouseLeave}
                    title="Показать статистику оценок"
                  >
                    <StarRating score={data.score} size={20} />
                    <span>{typeof data.score === 'number' ? data.score.toFixed(1) : data.score}</span>

                    {showStats && data.scores_stats && data.scores_stats.length > 0 && (
                      <div className={styles.ratingStatsPopup} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.ratingStatsHeader}>
                          <h3>Статистика оценок</h3>
                        </div>
                        <div className={styles.detailStats}>
                          {[...data.scores_stats].sort((a, b) => b.score - a.score).map((stat) => (
                            <div key={stat.score} className={styles.statItem}>
                              <span className={styles.statScore}>{stat.score}</span>
                              <div className={styles.statBarWrapper}>
                                <div
                                  className={styles.statBar}
                                  style={{
                                    width: `${(stat.count / Math.max(...data.scores_stats!.map((s) => s.count))) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className={styles.statCount}>{stat.count.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {data.status && (
                  <span className={styles.detailBadge}>{formatStatus(data.status)}</span>
                )}
                {isAnime && animeData?.rating && (
                  <span className={styles.detailBadge}>{formatRating(animeData.rating)}</span>
                )}
                {isAnime && animeData?.duration && (
                  <span className={styles.detailInfo}>{animeData.duration} мин.</span>
                )}
              </div>

              <div className={styles.detailInfoChipsGroup}>
                {(data.aired_on || data.released_on || (isAnime && animeData?.season)) && (
                  <InfoChip
                    label={getInfoChipLabel("dates")}
                    value={
                      [data.aired_on && formatDate(data.aired_on), data.released_on && formatDate(data.released_on)].filter(Boolean).join(" — ") || getInfoChipLabel("unknown_date")
                    }
                  />
                )}
                
                {isAnime && animeData?.studios && animeData.studios.length > 0 && (
                  <InfoChip
                    label={getInfoChipLabel("studios")}
                    value={
                      animeData.studios.map((s, idx) => (
                        <span key={s.id}>
                          <button 
                            className={styles.valueLinkBtn}
                            onClick={() => onSearchStudio?.(s.id, s.name)}
                            title={`Показать все аниме студии ${s.name}`}
                          >
                            {s.name}
                          </button>
                          {idx < animeData.studios!.length - 1 && ", "}
                        </span>
                      ))
                    }
                  />
                )}
                
                {!isAnime && mangaData?.publishers && mangaData.publishers.length > 0 && (
                  <InfoChip
                    label={getInfoChipLabel("publishers")}
                    value={
                      mangaData.publishers.map((p, idx) => (
                        <span key={p.id}>
                          <button 
                            className={styles.valueLinkBtn}
                            onClick={() => onSearchPublisher?.(p.id, p.name)}
                            title={`Показать всю мангу издательства ${p.name}`}
                          >
                            {p.name}
                          </button>
                          {idx < mangaData.publishers!.length - 1 && ", "}
                        </span>
                      ))
                    }
                  />
                )}

                {isAnime && animeData?.next_episode_at && (
                  <InfoChip
                    label={getInfoChipLabel("episode")}
                    value={animeData.next_episode_at}
                  />
                )}
              </div>
            </div>

            {user && (
              <div className={styles.userRateEditorWrapper}>
                <UserRateEditor
                  targetId={data.id}
                  targetType={type === 'anime' ? 'Anime' : 'Manga'}
                  userId={user.id}
                  isAnime={isAnime}
                  totalEpisodes={isAnime ? animeData?.episodes : undefined}
                  totalChapters={!isAnime ? mangaData?.chapters : undefined}
                  totalVolumes={!isAnime ? mangaData?.volumes : undefined}
                  onUnsavedChangesChange={handleUnsavedChangesChange}
                />
              </div>
            )}
          </div>

          <div className={styles.detailInfoGridHeader}>

            <div className={styles.detailContentGrid}>
              {data.description && (
                <div className={styles.detailHeaderDescriptionWrapper}>
                  <ReadMoreButton className={styles.detailHeaderDescription}>
                    <DescriptionWithLinks
                      description={data.description}
                      descriptionHtml={data.description_html}
                      onNavigate={onNavigate}
                    />
                  </ReadMoreButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.detailContent}>
        <CharactersSection
          characterRoles={data.character_roles || []}
          onNavigate={onNavigate}
        />

        <RelatedSection
          related={data.related || []}
          type={type}
          onNavigate={onNavigate}
        />

        {isAnime && (
          <SimilarAnime
            animeId={data.id}
            onNavigate={onNavigate}
          />
        )}

        {isAnime && animeData?.videos && (
          <VideosSection videos={animeData.videos} />
        )}

        {isAnime && animeData?.screenshots && (
          <ScreenshotsSection screenshots={animeData.screenshots} />
        )}

        <ExternalLinksSection externalLinks={data.external_links || []} />
      </div>

      <ConfirmDialog
        isOpen={backConfirmOpen}
        title="Несохраненные изменения"
        message="Есть несохраненные изменения в оценке. Уйти без сохранения?"
        confirmText="Уйти"
        cancelText="Отмена"
        onConfirm={handleBackConfirmed}
        onCancel={handleBackCancelled}
      />
    </div>
  );
}
