import { useState, useRef, useEffect } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import type { AnimeDetail, MangaDetail, Video } from "../types";
import styles from "./DetailView.module.css";
import GenreChip from "./GenreChip";
import InfoChip from "./InfoChip";
import VideoKindChip from "./VideoKindChip";
import HorizontalScroll from "./HorizontalScroll";
import { getMarqueeParams } from "../utils/marquee";
import { getInfoChipLabel, translateRole, translateRelationKind, translateVideoKind, translateExternalLink, STATUS_TEXTS, KIND_TEXTS } from "../utils/badgeTexts";

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
}

const VIDEO_PLACEHOLDER = 'https://avatars.mds.yandex.net/i?id=b8e25ffd85e46dd0f06d3535996da216_l-8193383-images-thumbs&n=13';

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getVideoThumbnail = (video: Video) => {
  if (video.image_url) return video.image_url;
  
  const videoUrl = video.player_url || video.url;
  if (videoUrl) {
    const youtubeId = getYoutubeId(videoUrl);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }
  }
  
  return VIDEO_PLACEHOLDER;
};

export default function DetailView({ 
  data, 
  type, 
  loading, 
  error, 
  onBack,
  onNavigate,
  onSearchGenre,
  onSearchStudio,
  onSearchPublisher
}: DetailViewProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);

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

  console.log("DetailView: render", { hasData: !!data, type, loading, error });
  
  if (loading || !data) {
    return (
      <div className={styles.detailView}>
        <button className={styles.detailBackBtn} onClick={onBack}>
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
        <button className={styles.detailBackBtn} onClick={onBack}>
          <span className={styles.backArrow}>{"<"} </span>
          <span>Назад к списку</span>
        </button>
        <div className={styles.detailError}>
          <p>Ошибка загрузки: {error}</p>
        </div>
      </div>
    );
  }

  const formatDate = (date?: { year?: number; month?: number; day?: number; date?: string }) => {
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
  };

  const formatRating = (rating?: string) => {
    const ratings: Record<string, string> = {
      g: "G",
      pg: "PG",
      pg_13: "PG-13",
      r: "R",
      r_plus: "R+",
      rx: "RX",
    };
    return rating ? ratings[rating] || rating.toUpperCase() : null;
  };

  const formatStatus = (status?: string) => {
    return status ? STATUS_TEXTS[status] || status : null;
  };

  const formatKind = (kind?: string) => {
    return kind ? KIND_TEXTS[kind] || kind.toUpperCase() : null;
  };

  const formatRelationKind = (kind: string) => {
    return translateRelationKind(kind);
  };


  const formatVideoKind = (kind?: string) => {
    return translateVideoKind(kind);
  };

  const getVideoKindColor = (kind?: string) => {
    const colors: Record<string, { bg: string; border: string }> = {
      pv: { bg: "rgba(139, 92, 246, 0.9)", border: "rgba(139, 92, 246, 0.3)" }, // фиолетовый
      character_trailer: { bg: "rgba(59, 130, 246, 0.9)", border: "rgba(59, 130, 246, 0.3)" }, // синий
      cm: { bg: "rgba(251, 146, 60, 0.9)", border: "rgba(251, 146, 60, 0.3)" }, // оранжевый
      op: { bg: "rgba(34, 197, 94, 0.9)", border: "rgba(34, 197, 94, 0.3)" }, // зеленый
      ed: { bg: "rgba(239, 68, 68, 0.9)", border: "rgba(239, 68, 68, 0.3)" }, // красный
      op_ed_clip: { bg: "rgba(168, 85, 247, 0.9)", border: "rgba(168, 85, 247, 0.3)" }, // пурпурный
      clip: { bg: "rgba(245, 158, 11, 0.9)", border: "rgba(245, 158, 11, 0.3)" }, // желтый
      other: { bg: "rgba(107, 114, 128, 0.9)", border: "rgba(107, 114, 128, 0.3)" }, // серый
      episode_preview: { bg: "rgba(236, 72, 153, 0.9)", border: "rgba(236, 72, 153, 0.3)" }, // розовый
    };
    return kind ? colors[kind] || colors.other : colors.other;
  };

  const getKindColor = (kind?: string, episodes?: number, episodesAired?: number) => {
    const colors: Record<string, string> = {
      movie: "rgba(239, 68, 68, 1)", // красный
      ova: "rgba(139, 92, 246, 1)", // фиолетовый
      ona: "rgba(34, 197, 94, 1)", // зеленый
      special: "rgba(251, 146, 60, 1)", // оранжевый
      tv_13: "rgba(59, 130, 246, 1)", // синий
      tv_24: "rgba(59, 130, 246, 1)", // синий
      tv_48: "rgba(59, 130, 246, 1)", // синий
      music: "rgba(236, 72, 153, 1)", // розовый
      doujin: "rgba(168, 85, 247, 1)", // пурпурный
      manga: "rgba(245, 158, 11, 1)", // желтый
      manhwa: "rgba(245, 158, 11, 1)", // желтый
      manhua: "rgba(245, 158, 11, 1)", // желтый
      light_novel: "rgba(168, 85, 247, 1)", // пурпурный
      novel: "rgba(168, 85, 247, 1)", // пурпурный
      one_shot: "rgba(239, 68, 68, 1)", // красный
    };

    console.log('getKindColor:', { kind, episodes, episodesAired });

    if (kind === "tv" && episodes && episodesAired && episodes > 0) {
      const progress = Math.min(episodesAired / episodes, 1) * 100;
      const gradient = `linear-gradient(to right, rgba(59, 130, 246, 1) 0%, rgba(59, 130, 246, 1) ${progress}%, rgba(59, 130, 246, 0.3) ${progress}%, rgba(59, 130, 246, 0.3) 100%)`;
      console.log('TV gradient:', { progress, gradient });
      return gradient;
    }

    const color = kind ? colors[kind] || "var(--primary)" : "var(--primary)";
    console.log('Regular color:', color);
    return color;
  };

  const formatExternalLink = (kind: string, url: string) => {
    const linkInfo = { label: translateExternalLink(kind) };
    let faviconUrl = "";
    try {
      const domain = new URL(url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
      // ignore
    }

    return (
      <>
        <span className={styles.linkIcon}>
          {faviconUrl ? (
            <img 
              src={faviconUrl} 
              alt="" 
              style={{ width: 14, height: 14, borderRadius: 2, display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : null}
        </span>
        <span className={styles.linkLabel}>{linkInfo.label}</span>
      </>
    );
  };

  const isAnime = type === "anime";
  const animeData = isAnime ? (data as AnimeDetail) : null;
  const mangaData = !isAnime ? (data as MangaDetail) : null;

  
  const renderRelatedCard = (rel: any) => {
    const isAnimeRel = !!rel.anime;
    const item = rel.anime || rel.manga;
    if (!item) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      onNavigate(isAnimeRel ? "anime" : "manga", item.id);
    };

    return (
      <div 
        key={rel.id} 
        className={`${styles.relatedCard} ${styles.clickable}`}
        onClick={handleClick}
      >
        <div className={styles.relatedCardPoster}>
          {item.image?.preview ? (
            <img 
              src={item.image.preview} 
              alt={item.russian || item.name} 
              loading="lazy"
            />
          ) : (
            <div className={styles.relatedCardPosterPlaceholder}>
              {isAnimeRel ? "Аниме" : "Манга"}
            </div>
          )}
          <div className={styles.relatedCardKindBadge}>
            {formatRelationKind(rel.relation_kind)}
          </div>
        </div>
        
        <div className={styles.relatedCardContent}>
          <div className={styles.relatedCardType}>
            {isAnimeRel ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="2" width="20" height="20" rx="2" />
                <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            )}
            <span>{isAnimeRel ? "Аниме" : "Манга"}</span>
          </div>

          {(() => {
            const title = item.russian || item.name || `${isAnimeRel ? 'Аниме' : 'Манга'} #${item.id}`;
            const marqueeParams = getMarqueeParams(title, 150); // Related cards width
            return (
              <div className={`relatedCardTitleContainer ${marqueeParams.isLong ? 'hasMarquee' : ''}`}>
                <a
                  href={`#${isAnimeRel ? 'anime' : 'manga'}-${item.id}`}
                  className={`${styles.relatedCardTitle} relatedCardTitleInner ${marqueeParams.isLong ? 'isMarquee' : ''}`}
                  style={marqueeParams.style}
                  title={title}
                  onClick={handleClick}
                >
                  {title}
                  {marqueeParams.isLong && <>&nbsp;{title}</>}
                </a>
              </div>
            );
          })()}
        </div>

        <div className={styles.relatedCardFooter}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.detailView}>
      <button className={styles.detailBackBtn} onClick={onBack}>
        ← Назад к списку
      </button>

      <div className={styles.detailHeader}>
        <div className={styles.detailPosterContainer}>
          <div className={styles.detailPosterWrapper}>
            {data.poster_url ? (
                <img
                  src={data.poster_url}
                  alt={data.title}
                  className={styles.detailPoster}
                />
            ) : (
              <div className={styles.detailPosterPlaceholder}>Нет изображения</div>
            )}
          </div>
          <div className={styles.posterOverlay} style={{ background: getKindColor(data.kind, isAnime ? animeData?.episodes : undefined, isAnime ? (animeData?.status === "released" ? animeData?.episodes : animeData?.episodes_aired) : undefined) || 'var(--primary)' }}>
            {data.kind && (
              <div className={styles.posterOverlayItem}>
                {formatKind(data.kind)}
              </div>
            )}
            {isAnime && animeData?.episodes && (
              <div className={styles.posterOverlayItem}>
                {(() => {
                  const aired = animeData?.status === "released" ? animeData.episodes : animeData?.episodes_aired;
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
            <div className={styles.detailMainTitles}>
              <h1 className={styles.detailTitle}>{data.russian || data.title}</h1>
              {data.russian && data.russian !== data.title && (
                <h2 className={styles.detailRussian}>{data.title}</h2>
              )}
              {data.english && data.english !== data.title && data.english !== data.russian && (
                <div className={styles.detailEnglish}>{data.english}</div>
              )}
            </div>

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

          <div className={styles.detailMeta}>
            {data.score !== undefined && (
              <div 
                ref={statsRef}
                className={`${styles.detailScore} ${styles.clickable} ${showStats ? styles.active : ''}`}
                onClick={() => setShowStats(!showStats)}
                title="Показать статистику оценок"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                <span>{data.score.toFixed(1)}</span>

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

          <div className={styles.detailInfoGridHeader}>
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

            {data.description && (
              <div className={styles.detailHeaderDescriptionWrapper}>
                <div 
                  className={`${styles.detailHeaderDescription} ${descExpanded ? styles.expanded : ''}`}
                  dangerouslySetInnerHTML={{ __html: data.description_html || data.description }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const spoiler = target.closest('.b-spoiler, .b-spoiler_block, .b-spoiler_inline');
                    if (!spoiler) return;

                    // Если кликнули по заголовку (первый элемент или с классом label)
                    const isLabel = target.classList.contains('b-spoiler_label') || 
                                   target.tagName === 'LABEL' ||
                                   spoiler.firstElementChild === target ||
                                   spoiler.firstElementChild?.contains(target);
                    
                    if (isLabel) {
                      spoiler.classList.toggle('is-expanded');
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
                {data.description.length > 300 && (
                  <button 
                    className={styles.descriptionMoreBtn}
                    onClick={() => setDescExpanded(!descExpanded)}
                  >
                    {descExpanded ? "Свернуть" : "Читать полностью..."}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.detailContent}>
        {data.character_roles && data.character_roles.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Роли</h3>
            <HorizontalScroll className={styles.detailCharacters}>
              {data.character_roles.slice(0, 30).map((role) => (
                <div 
                  key={role.id} 
                  className={`${styles.characterCard} ${styles.clickable}`}
                  onClick={() => onNavigate("characters", role.character.id)}
                  title={`${role.character.russian || role.character.name}`}
                >
                  <div className={styles.characterPosterWrapper}>
                    {role.character.poster_url ? (
                      <img
                        src={role.character.poster_url}
                        alt={role.character.russian || role.character.name}
                        className={styles.characterPoster}
                      />
                    ) : (
                      <div className={styles.characterPosterPlaceholder}>Фото</div>
                    )}
                    {(() => {
                      const allRoles = role.roles_ru && role.roles_ru.length > 0 
                        ? role.roles_ru.map(translateRole)
                        : (role.roles_en ? (role.roles_en as string[]).map(translateRole) : []);
                      
                      if (allRoles.length === 0) return null;
                      const roleText = allRoles[0];
                      const badgeParams = getMarqueeParams(roleText, 120, 6); // Больше ширина и меньше ширина символа для role badge

                      return (
                        <div className={`roleBadge ${styles.roleBadge}`} title={allRoles.join(", ")}>
                          <div className={`roleMarqueeContainer ${badgeParams.isLong ? 'hasMarquee' : ''}`}>
                            <div className={`roleMarqueeInner ${badgeParams.isLong ? 'isMarquee' : ''}`} style={badgeParams.style}>
                              <div className={styles.roleText}>{roleText}</div>
                              {badgeParams.isLong && <div className={styles.roleText}>&nbsp;</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className={styles.characterInfo}>
                    {(() => {
                      const name = role.character.russian || role.character.name;
                      const nameParams = getMarqueeParams(name, 120, 8); // Smaller container width for better scrolling
                      
                      return (
                        <div className={`characterNameContainer ${nameParams.isLong ? 'hasMarquee' : ''}`}>
                          <div className={`characterMarqueeInner ${nameParams.isLong ? 'isMarquee' : ''}`} style={nameParams.style}>
                            <div className={styles.characterName}>{name}</div>
                            {nameParams.isLong && <div className={styles.characterName}>&nbsp;</div>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {data.related && data.related.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Связанные произведения</h3>
            <HorizontalScroll className={styles.detailRelatedHorizontal}>
              {(() => {
                const anime = data.related.filter(r => !!r.anime);
                const manga = data.related.filter(r => !!r.manga);
                const result = [];

                const isAnimeView = type === "anime";
                const firstGroup = isAnimeView ? manga : anime;
                const secondGroup = isAnimeView ? anime : manga;
                const firstLabel = isAnimeView ? "Манга" : "Аниме";
                const secondLabel = isAnimeView ? "Аниме" : "Манга";
                const firstKey = isAnimeView ? "sep-manga" : "sep-anime";
                const secondKey = isAnimeView ? "sep-anime" : "sep-manga";

                if (firstGroup.length > 0) {
                  result.push(
                    <div key={firstKey} className={`${styles.relatedSeparator} ${styles.firstSeparator}`}>
                      <span className={styles.relatedSeparatorText}>{firstLabel}</span>
                    </div>
                  );
                  result.push(...firstGroup.map(rel => renderRelatedCard(rel)));
                }

                if (secondGroup.length > 0) {
                  result.push(
                    <div key={secondKey} className={styles.relatedSeparator}>
                      <span className={styles.relatedSeparatorText}>{secondLabel}</span>
                    </div>
                  );
                  result.push(...secondGroup.map(rel => renderRelatedCard(rel)));
                }

                return result;
              })()}
            </HorizontalScroll>
          </div>
        )}

        {isAnime && animeData?.videos && animeData.videos.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Видео</h3>
            <HorizontalScroll className={styles.detailVideos}>
              {animeData.videos.map((video) => (
                <a 
                  key={video.id} 
                  href={video.player_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.videoCard}
                  onClick={(e) => {
                    if (video.player_url) {
                      e.preventDefault();
                      openUrl(video.player_url);
                    }
                  }}
                >
                  <div className={styles.videoThumbnailContainer}>
                    <img 
                      src={getVideoThumbnail(video)} 
                      alt={video.name || "Видео"} 
                      className={styles.videoThumbnail}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = VIDEO_PLACEHOLDER;
                      }}
                    />
                    {video.kind && (() => {
                      const colors = getVideoKindColor(video.kind);
                      const label = formatVideoKind(video.kind);
                      if (!label) return null;
                      return (
                        <VideoKindChip
                          kind={video.kind}
                          label={label}
                          backgroundColor={colors.bg}
                          borderColor={colors.border}
                        />
                      );
                    })()}
                    <div className={styles.videoOverlay}>
                      <div className={styles.playButton}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                  </div>
                </div>
                <div className={styles.videoInfo}>
                  {video.name && <div className={styles.videoName} title={video.name}>{video.name}</div>}
                </div>
                </a>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {isAnime && animeData?.screenshots && animeData.screenshots.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Скриншоты</h3>
            <HorizontalScroll className={styles.detailScreenshots}>
              {animeData.screenshots.map((screenshot) => (
                <div 
                  key={screenshot.id} 
                  className={`${styles.screenshotItem} ${styles.clickable}`}
                  onClick={() => setSelectedScreenshot(screenshot.original_url || screenshot.x332_url || null)}
                >
                  <img
                    src={screenshot.x332_url || screenshot.original_url}
                    alt="Скриншот"
                    className={styles.screenshotImage}
                    loading="lazy"
                  />
                </div>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {selectedScreenshot && (
          <div className={styles.screenshotModal} onClick={() => setSelectedScreenshot(null)}>
            <div className={styles.screenshotModalContent} onClick={(e) => e.stopPropagation()}>
              <img src={selectedScreenshot} alt="Скриншот в полном размере" />
              <button className={styles.modalClose} onClick={() => setSelectedScreenshot(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {data.external_links && data.external_links.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Внешние ссылки</h3>
            <div className={styles.detailExternalLinks}>
              {data.external_links.map((link) => (
                <a
                  key={link.id || link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLinkBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    openUrl(link.url);
                  }}
                >
                  {formatExternalLink(link.kind, link.url)}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
