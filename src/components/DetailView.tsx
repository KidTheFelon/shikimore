import { useState, useRef, useEffect } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import type { AnimeDetail, MangaDetail, Video } from "../App";

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

const HorizontalScroll = ({ children, className }: { children: React.ReactNode; className: string }) => {
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
        e.preventDefault();
        
        if (isScrolling) return;

        const cards = Array.from(el.children).filter(child => 
          !child.classList.contains('related-separator')
        ) as HTMLElement[];
        
        // Берем ширину обычной карточки, а не разделителя
        const referenceItem = cards[0] || el.firstElementChild as HTMLElement;
        
        if (referenceItem) {
          isScrolling = true;
          const itemWidth = referenceItem.offsetWidth;
          const style = window.getComputedStyle(el);
          const gap = parseInt(style.columnGap || style.gap || "0");
          // Скроллим сразу на 3 карточки или на половину ширины контейнера
          const scrollStep = Math.max(itemWidth + gap, el.clientWidth * 0.4);
          
          const direction = e.deltaY > 0 ? 1 : -1;
          el.scrollBy({
            left: direction * scrollStep,
            behavior: "smooth"
          });

          setTimeout(() => {
            isScrolling = false;
          }, 300); // Чуть уменьшил задержку для отзывчивости
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
      <div className="detail-view">
        <button className="detail-back-btn" onClick={onBack}>
          ← Назад к списку
        </button>
        <div className="detail-loading">
          <div className="loading-spinner" />
          <p>Загрузка деталей...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-view">
        <button className="detail-back-btn" onClick={onBack}>
          ← Назад к списку
        </button>
        <div className="detail-error">
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

  const formatSeason = (season?: string) => {
    if (!season) return null;
    const [q, year] = season.split('_');
    const quarters: Record<string, string> = {
      summer: "Лето",
      winter: "Зима",
      spring: "Весна",
      fall: "Осень",
    };
    return `${quarters[q] || q} ${year || ""}`.trim();
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
    const statuses: Record<string, string> = {
      anons: "Анонсировано",
      ongoing: "Онгоинг",
      released: "Выпущено",
    };
    return status ? statuses[status] || status : null;
  };

  const formatKind = (kind?: string) => {
    const kinds: Record<string, string> = {
      tv: "TV",
      movie: "Фильм",
      ova: "OVA",
      ona: "ONA",
      special: "Спешл",
      music: "Музыка",
      manga: "Манга",
      novel: "Новелла",
      one_shot: "Ваншот",
      doujin: "Додзинси",
      manhwa: "Манхва",
      manhua: "Маньхуа",
    };
    return kind ? kinds[kind] || kind.toUpperCase() : null;
  };

  const formatRelationKind = (kind: string) => {
    const relations: Record<string, string> = {
      sequel: "Сиквел",
      prequel: "Приквел",
      alternative: "Альтернатива",
      side_story: "Побочная история",
      parent_story: "Основная история",
      summary: "Рекап",
      adaptation: "Адаптация",
      spin_off: "Спин-офф",
      character: "Персонаж",
      other: "Другое",
      full_story: "Полная история",
      alternative_setting: "Альтернативный сеттинг",
      alternative_version: "Альтернативная версия",
    };
    return relations[kind] || kind;
  };

  const translateRole = (role: string) => {
    const roles: Record<string, string> = {
      // Персонажи
      Main: "Главный",
      Supporting: "Второстепенный",
      // Персонал
      Producer: "Продюсер",
      Director: "Режиссёр",
      "Original Creator": "Автор оригинала",
      Music: "Композитор",
      "Character Design": "Дизайнер персонажей",
      "Series Composition": "Сценарист",
      "Animation Director": "Режиссёр анимации",
      Script: "Сценарий",
      Editing: "Монтаж",
      "Sound Director": "Звукорежиссёр",
      "Art Director": "Арт-директор",
      "Key Animation": "Ключевая анимация",
      "Background Art": "Художник-постановщик",
      Storyboard: "Раскадровка",
      "Color Design": "Цветовой дизайн",
      "Theme Song Performance": "Исполнение темы",
      "Theme Song Arrangement": "Аранжировка темы",
      "Theme Song Composition": "Композиция темы",
      "Theme Song Lyrics": "Текст темы",
      "Chief Animation Director": "Шеф-режиссёр анимации",
      "Executive Producer": "Исполнительный продюсер",
      "Associate Producer": "Ассоциированный продюсер",
      "Assistant Director": "Помощник режиссёра",
      "Music Producer": "Музыкальный продюсер",
      "Sound Effects": "Звуковые эффекты",
      "Director of Photography": "Оператор-постановщик",
      "Digital Art": "Цифровая графика",
      "3D Director": "3D-режиссёр",
      "In-Between Animation": "Промежуточная анимация",
      "Planning": "Планирование",
      "Color Setting": "Работа с цветом",
    };
    return roles[role] || role;
  };

  const formatExternalLink = (kind: string, url: string) => {
    const names: Record<string, { label: string; icon?: React.ReactNode }> = {
      official_site: { label: "Офиц. сайт", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg> },
      wikipedia: { label: "Википедия" },
      anime_news_network: { label: "ANN" },
      myanimelist: { label: "MyAnimeList" },
      anime_db: { label: "AniDB" },
      world_art: { label: "World Art" },
      kinopoisk: { label: "Кинопоиск" },
      kage_project: { label: "Kage Project" },
      twitter: { label: "Twitter", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg> },
      kinopoisk_hd: { label: "Кинопоиск HD" },
      shikimori: { label: "Shikimori" },
      fandom: { label: "Fandom" },
      youtube: { label: "YouTube", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg> },
      facebook: { label: "Facebook" },
      instagram: { label: "Instagram" },
    };

    const linkInfo = names[kind] || { label: kind };
    let faviconUrl = "";
    try {
      const domain = new URL(url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
      // ignore
    }

    return (
      <>
        <span className="link-icon">
          {linkInfo.icon ? (
            linkInfo.icon
          ) : faviconUrl ? (
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
        <span className="link-label">{linkInfo.label}</span>
      </>
    );
  };

  const isAnime = type === "anime";
  const animeData = isAnime ? (data as AnimeDetail) : null;
  const mangaData = !isAnime ? (data as MangaDetail) : null;

  const getMarqueeParams = (text: string, containerWidth = 130) => {
    const charWidth = 8.5; 
    const textWidth = text.length * charWidth;
    const isLong = textWidth > containerWidth;
    
    if (!isLong) {
      return { isLong: false, style: {} };
    }

    const moveDistance = textWidth + 32; // match gap: 2rem (32px)
    const totalDuration = moveDistance / 25;
    
    return { 
      isLong: true, 
      style: { "--marquee-duration": `${totalDuration}s` } as React.CSSProperties 
    };
  };

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
        className="related-card clickable"
        onClick={handleClick}
      >
        <div className="related-card-poster">
          {item.image?.preview ? (
            <img 
              src={item.image.preview} 
              alt={item.russian || item.name} 
              loading="lazy"
            />
          ) : (
            <div className="related-card-poster-placeholder">
              {isAnimeRel ? "Аниме" : "Манга"}
            </div>
          )}
          <div className="related-card-kind-badge">
            {formatRelationKind(rel.relation_kind)}
          </div>
        </div>
        
        <div className="related-card-content">
          <div className="related-card-type">
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

          <a
            href={`#${isAnimeRel ? 'anime' : 'manga'}-${item.id}`}
            className="related-card-title"
            title={item.russian || item.name}
            onClick={handleClick}
          >
            {item.russian || item.name || `${isAnimeRel ? 'Аниме' : 'Манга'} #${item.id}`}
          </a>
        </div>

        <div className="related-card-footer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="detail-view">
      <button className="detail-back-btn" onClick={onBack}>
        ← Назад к списку
      </button>

      <div className="detail-header">
        <div className="detail-poster-wrapper">
          {data.poster_url ? (
              <img
                src={data.poster_url}
                alt={data.title}
                className="detail-poster"
              />
          ) : (
            <div className="detail-poster-placeholder">Нет изображения</div>
          )}
        </div>
        <div className="detail-header-content">
          <div className="detail-title-row">
            <div className="detail-main-titles">
              <h1 className="detail-title">{data.russian || data.title}</h1>
              {data.russian && data.russian !== data.title && (
                <h2 className="detail-russian">{data.title}</h2>
              )}
              {data.english && data.english !== data.title && data.english !== data.russian && (
                <div className="detail-english">{data.english}</div>
              )}
            </div>

            {data.genres && data.genres.length > 0 && (
              <div className="genre-chips-container">
                {data.genres.map(g => (
                  <button 
                    key={g.id} 
                    className="genre-mini-chip clickable"
                    onClick={() => onSearchGenre(g.id, g.russian || g.name)}
                    title={`Найти всё в жанре ${g.russian || g.name}`}
                  >
                    {g.russian || g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="detail-meta">
            {data.score !== undefined && (
              <div 
                ref={statsRef}
                className={`detail-score clickable ${showStats ? 'active' : ''}`}
                onClick={() => setShowStats(!showStats)}
                title="Показать статистику оценок"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                <span>{data.score.toFixed(1)}</span>

                {showStats && data.scores_stats && data.scores_stats.length > 0 && (
                  <div className="rating-stats-popup" onClick={(e) => e.stopPropagation()}>
                    <div className="rating-stats-header">
                      <h3>Статистика оценок</h3>
                    </div>
                    <div className="detail-stats">
                      {[...data.scores_stats].sort((a, b) => b.score - a.score).map((stat) => (
                        <div key={stat.score} className="stat-item">
                          <span className="stat-score">{stat.score}</span>
                          <div className="stat-bar-wrapper">
                            <div
                              className="stat-bar"
                              style={{
                                width: `${(stat.count / Math.max(...data.scores_stats!.map((s) => s.count))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="stat-count">{stat.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {data.kind && (
              <button 
                className="detail-badge clickable" 
                onClick={() => onSearchGenre(-1, formatKind(data.kind) || "")}
                title={`Показать все ${formatKind(data.kind)}`}
              >
                {formatKind(data.kind)}
              </button>
            )}
            {data.status && (
              <span className="detail-badge">{formatStatus(data.status)}</span>
            )}
            {isAnime && animeData?.rating && (
              <span className="detail-badge">{formatRating(animeData.rating)}</span>
            )}
            {isAnime && (animeData?.episodes_aired !== undefined || animeData?.episodes) && (
              <span className="detail-info">
                {typeof animeData?.episodes_aired === 'number'
                  ? `${animeData.episodes_aired} / ${animeData.episodes || "?"} эп.` 
                  : `${animeData?.episodes || "?"} эп.`}
              </span>
            )}
            {!isAnime && mangaData?.volumes && (
              <span className="detail-info">{mangaData.volumes} том.</span>
            )}
            {!isAnime && mangaData?.chapters && (
              <span className="detail-info">{mangaData.chapters} гл.</span>
            )}
            {isAnime && animeData?.duration && (
              <span className="detail-info">{animeData.duration} мин.</span>
            )}
          </div>

          <div className="detail-info-grid-header">
            <div className="detail-info-chips-group">
              {(data.aired_on || data.released_on || (isAnime && animeData?.season)) && (
                <div className="detail-info-chip">
                  <span className="detail-label">Даты</span>
                  <span className="detail-value">
                    {[
                      data.aired_on && formatDate(data.aired_on),
                      data.released_on && formatDate(data.released_on),
                    ].filter(Boolean).join(" — ") || "ТВА"}
                    {isAnime && animeData?.season && ` (${formatSeason(animeData.season)})`}
                  </span>
                </div>
              )}
              
              {isAnime && animeData?.studios && animeData.studios.length > 0 && (
                <div className="detail-info-chip">
                  <span className="detail-label">Студии</span>
                  <span className="detail-value">
                    {animeData.studios.map((s, idx) => (
                      <span key={s.id}>
                        <button 
                          className="value-link-btn"
                          onClick={() => onSearchStudio?.(s.id, s.name)}
                          title={`Показать все аниме студии ${s.name}`}
                        >
                          {s.name}
                        </button>
                        {idx < animeData.studios!.length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              
              {!isAnime && mangaData?.publishers && mangaData.publishers.length > 0 && (
                <div className="detail-info-chip">
                  <span className="detail-label">Издательства</span>
                  <span className="detail-value">
                    {mangaData.publishers.map((p, idx) => (
                      <span key={p.id}>
                        <button 
                          className="value-link-btn"
                          onClick={() => onSearchPublisher?.(p.id, p.name)}
                          title={`Показать всю мангу издательства ${p.name}`}
                        >
                          {p.name}
                        </button>
                        {idx < mangaData.publishers!.length - 1 && ", "}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {isAnime && animeData?.next_episode_at && (
                <div className="detail-info-chip">
                  <span className="detail-label">Серия</span>
                  <span className="detail-value">{animeData.next_episode_at}</span>
                </div>
              )}
            </div>

            {data.description && (
              <div className="detail-header-description-wrapper">
                <div 
                  className={`detail-header-description ${descExpanded ? 'expanded' : ''}`}
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
                    className="description-more-btn"
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

      <div className="detail-content">
        {data.character_roles && data.character_roles.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Персонажи</h3>
            <HorizontalScroll className="detail-characters">
              {data.character_roles.slice(0, 30).map((role) => (
                <div 
                  key={role.id} 
                  className="character-card clickable"
                  onClick={() => onNavigate("characters", role.character.id)}
                  title={`Открыть ${role.character.russian || role.character.name}`}
                >
                  <div className="character-poster-wrapper">
                    {role.character.poster_url ? (
                      <img
                        src={role.character.poster_url}
                        alt={role.character.russian || role.character.name}
                        className="character-poster"
                      />
                    ) : (
                      <div className="character-poster-placeholder">Нет фото</div>
                    )}
                    {(() => {
                      const allRoles = role.roles_ru && role.roles_ru.length > 0 
                        ? role.roles_ru.map(translateRole)
                        : (role.roles_en ? (role.roles_en as string[]).map(translateRole) : []);
                      
                      if (allRoles.length === 0) return null;
                      const roleText = allRoles[0];
                      const badgeParams = getMarqueeParams(roleText, 100); // Меньше ширина для бейджа

                      return (
                        <div className="role-badge" title={allRoles.join(", ")}>
                          <div className={`role-marquee-container ${badgeParams.isLong ? 'has-marquee' : ''}`}>
                            <div className={`role-marquee-inner ${badgeParams.isLong ? 'is-marquee' : ''}`} style={badgeParams.style}>
                              <div className="role-text">{roleText}</div>
                              {badgeParams.isLong && <div className="role-text spacer">{roleText}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="character-info">
                    {(() => {
                      const name = role.character.russian || role.character.name;
                      const nameParams = getMarqueeParams(name);
                      
                      return (
                        <div className={`character-name-container ${nameParams.isLong ? 'has-marquee' : ''}`}>
                          <div className={`character-marquee-inner ${nameParams.isLong ? 'is-marquee' : ''}`} style={nameParams.style}>
                            <div className="character-name">{name}</div>
                            {nameParams.isLong && <div className="character-name spacer">{name}</div>}
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

        {data.person_roles && data.person_roles.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Люди</h3>
            <HorizontalScroll className="detail-people">
              {data.person_roles.slice(0, 30).map((role) => (
                <div 
                  key={role.id} 
                  className="person-card clickable"
                  onClick={() => role.person.url && openUrl(role.person.url)}
                  title={`Открыть ${role.person.russian || role.person.name} на Shikimori`}
                >
                  <div className="person-poster-wrapper">
                    {role.person.poster_url ? (
                      <img
                        src={role.person.poster_url}
                        alt={role.person.russian || role.person.name}
                        className="person-poster"
                      />
                    ) : (
                      <div className="person-poster-placeholder">Нет фото</div>
                    )}
                    {(() => {
                      const allRoles = role.roles_ru && role.roles_ru.length > 0 
                        ? role.roles_ru.map(translateRole)
                        : (role.roles_en ? (role.roles_en as string[]).map(translateRole) : []);
                      
                      if (allRoles.length === 0) return null;
                      const roleText = allRoles[0];
                      const badgeParams = getMarqueeParams(roleText, 100); // Меньше ширина для бейджа

                      return (
                        <div className="role-badge" title={allRoles.join(", ")}>
                          <div className={`role-marquee-container ${badgeParams.isLong ? 'has-marquee' : ''}`}>
                            <div className={`role-marquee-inner ${badgeParams.isLong ? 'is-marquee' : ''}`} style={badgeParams.style}>
                              <div className="role-text">{roleText}</div>
                              {badgeParams.isLong && <div className="role-text spacer">{roleText}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="person-info">
                    {(() => {
                      const name = role.person.russian || role.person.name;
                      const nameParams = getMarqueeParams(name);
                      
                      return (
                        <div className={`person-name-container ${nameParams.isLong ? 'has-marquee' : ''}`}>
                          <div className={`person-marquee-inner ${nameParams.isLong ? 'is-marquee' : ''}`} style={nameParams.style}>
                            <div className="person-name">{name}</div>
                            {nameParams.isLong && <div className="person-name spacer">{name}</div>}
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
          <div className="detail-section">
            <h3 className="detail-section-title">Связанные произведения</h3>
            <HorizontalScroll className="detail-related-horizontal">
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
                    <div key={firstKey} className="related-separator first-separator">
                      <span className="related-separator-text">{firstLabel}</span>
                    </div>
                  );
                  result.push(...firstGroup.map(rel => renderRelatedCard(rel)));
                }

                if (secondGroup.length > 0) {
                  result.push(
                    <div key={secondKey} className="related-separator">
                      <span className="related-separator-text">{secondLabel}</span>
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
          <div className="detail-section">
            <h3 className="detail-section-title">Видео</h3>
            <HorizontalScroll className="detail-videos">
              {animeData.videos.map((video) => (
                <a 
                  key={video.id} 
                  href={video.player_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="video-card"
                  onClick={(e) => {
                    if (video.player_url) {
                      e.preventDefault();
                      openUrl(video.player_url);
                    }
                  }}
                >
                  <div className="video-thumbnail-container">
                    <img 
                      src={getVideoThumbnail(video)} 
                      alt={video.name || "Видео"} 
                      className="video-thumbnail"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = VIDEO_PLACEHOLDER;
                      }}
                    />
                    <div className="video-overlay">
                      <div className="play-button">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {video.kind && (
                      <div className="video-kind">
                        {(() => {
                          const kinds: Record<string, string> = {
                            pv: "Трейлер",
                            op: "Опенинг",
                            ed: "Эндинг",
                            clip: "Клип",
                            op_ed_clip: "OP/ED Клип",
                            other: "Другое",
                            episode_preview: "Превью",
                          };
                          return kinds[video.kind] || video.kind.toUpperCase();
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="video-info">
                    {video.name && <div className="video-name" title={video.name}>{video.name}</div>}
                  </div>
                </a>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {isAnime && animeData?.screenshots && animeData.screenshots.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Скриншоты</h3>
            <HorizontalScroll className="detail-screenshots">
              {animeData.screenshots.map((screenshot) => (
                <div 
                  key={screenshot.id} 
                  className="screenshot-item clickable"
                  onClick={() => setSelectedScreenshot(screenshot.original_url || screenshot.x332_url || null)}
                >
                  <img
                    src={screenshot.x332_url || screenshot.original_url}
                    alt="Скриншот"
                    className="screenshot-image"
                    loading="lazy"
                  />
                </div>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {selectedScreenshot && (
          <div className="screenshot-modal" onClick={() => setSelectedScreenshot(null)}>
            <div className="screenshot-modal-content" onClick={(e) => e.stopPropagation()}>
              <img src={selectedScreenshot} alt="Скриншот в полном размере" />
              <button className="modal-close" onClick={() => setSelectedScreenshot(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {data.external_links && data.external_links.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Внешние ссылки</h3>
            <div className="detail-external-links">
              {data.external_links.map((link) => (
                <a
                  key={link.id || link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-btn"
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
