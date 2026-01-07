import { useState, useRef, useEffect } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import type { 
  AnimeDetail, 
  MangaDetail, 
  Video, 
  ContentType,
  AppSettings,
  Genre
} from "../types";
import { HorizontalScroll } from "./HorizontalScroll";
import { BackIcon } from "./icons";
import { Badge } from "./common/Badge";
import { ScoreBadge } from "./common/ScoreBadge";
import { LoadingSpinner } from "./common/LoadingSpinner";
import { RelatedCard } from "./RelatedCard";
import { PersonCard } from "./PersonCard";
import { RatingStats } from "./RatingStats";
import { ExternalLinks } from "./ExternalLinks";
import { 
  formatStatus, 
  formatKind, 
  formatRating,
  formatDate
} from "../utils/formatters";

interface DetailViewProps {
  data: AnimeDetail | MangaDetail | null;
  type: "anime" | "manga";
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onNavigate: (type: ContentType, id: number) => void;
  onSearchGenre: (genreId: number) => void;
  onSearchStudio?: (studioId: number, studioName: string) => void;
  onSearchPublisher?: (publisherId: number, publisherName: string) => void;
  settings: AppSettings | null;
}

const VIDEO_PLACEHOLDER = 'https://avatars.mds.yandex.net/i?id=b8e25ffd85e46dd0f06d3535996da216_l-8193383-images-thumbs&n=13';

const getYoutubeId = (url: string) => {
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
};

const getVideoThumbnail = (video: Video) => {
  if (video.image_url) return video.image_url;
  const videoUrl = video.player_url || video.url;
  if (videoUrl) {
    const youtubeId = getYoutubeId(videoUrl);
    if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  }
  return VIDEO_PLACEHOLDER;
};

export default function DetailView({ 
  data, type, loading, error, onBack, onNavigate, onSearchGenre, onSearchStudio, onSearchPublisher, settings
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
    if (showStats) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStats]);

  if (loading || !data) {
    return (
      <div className="detail-view">
        <button className="detail-back-btn" onClick={onBack} title="Назад к списку"><BackIcon /></button>
        <div className="detail-loading"><LoadingSpinner /><p>Загрузка деталей...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-view">
        <button className="detail-back-btn" onClick={onBack} title="Назад к списку"><BackIcon /></button>
        <div className="detail-error"><p>Ошибка: {error}</p><button onClick={onBack}>Назад</button></div>
      </div>
    );
  }

  const isAnime = type === "anime";
  const animeData = isAnime ? (data as AnimeDetail) : null;
  const mangaData = !isAnime ? (data as MangaDetail) : null;

  const prefLang = settings?.preferred_language || "russian";
  const displayTitle = (prefLang === "russian" 
    ? (data.russian || (data as any).title || (data as any).name) 
    : ((data as any).title || (data as any).name || data.russian)) || "";
  
  const subTitle = (displayTitle === data.russian ? ((data as any).title || (data as any).name) : data.russian) || "";

  const formatSeason = (season: string) => {
    const seasons: Record<string, string> = { summer: "Лето", winter: "Зима", spring: "Весна", fall: "Осень" };
    return seasons[season] || season;
  };

  return (
    <div className="detail-view">
      <button className="detail-back-btn" onClick={onBack} title="Назад к списку"><BackIcon /></button>

      <div className="detail-header">
        <div className="detail-poster-wrapper">
          {data.poster_url ? <img src={data.poster_url} alt={data.title} className="detail-poster" /> : <div className="detail-poster-placeholder">Нет изображения</div>}
        </div>
        <div className="detail-header-content">
          <div className="detail-title-row">
            <div className="detail-main-titles">
              <h1 className="detail-title">{displayTitle}</h1>
              {subTitle && <h2 className="detail-russian">{subTitle}</h2>}
              {data.english && data.english !== displayTitle && data.english !== subTitle && <div className="detail-english">{data.english}</div>}
            </div>

            {data.genres && data.genres.length > 0 && (
              <div className="genre-chips-container">
                {data.genres.map((g: Genre) => (
                  <Badge key={g.id} variant="genre" clickable onClick={() => onSearchGenre(g.id)} title={`Найти всё в жанре ${g.russian || g.name}`}>
                    {g.russian || g.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="detail-meta">
            {data.score !== undefined && (
              <ScoreBadge score={data.score} variant="detail" clickable active={showStats} onClick={() => setShowStats(!showStats)} forwardRef={statsRef} />
            )}
            {showStats && data.scores_stats && data.scores_stats.length > 0 && (
              <RatingStats stats={data.scores_stats} onClose={() => setShowStats(false)} />
            )}
            {data.kind && <Badge variant="kind" clickable onClick={() => onSearchGenre(-1)} title={`Показать все ${formatKind(data.kind)}`}>{formatKind(data.kind)}</Badge>}
            {data.status && <Badge variant="status">{formatStatus(data.status)}</Badge>}
            {isAnime && animeData?.rating && <Badge variant="rating">{formatRating(animeData.rating)}</Badge>}
            {isAnime && (animeData?.episodes_aired !== undefined || animeData?.episodes) && (
              <span className="detail-info">
                {typeof animeData?.episodes_aired === 'number' ? `${animeData.episodes_aired} / ${animeData.episodes || "?"} эп.` : `${animeData?.episodes || "?"} эп.`}
              </span>
            )}
            {!isAnime && mangaData?.volumes && <span className="detail-info">{mangaData.volumes} том.</span>}
            {!isAnime && mangaData?.chapters && <span className="detail-info">{mangaData.chapters} гл.</span>}
            {isAnime && animeData?.duration && <span className="detail-info">{animeData.duration} мин.</span>}
          </div>

          <div className="detail-info-grid-header">
            <div className="detail-info-chips-group">
              {(data.aired_on || data.released_on || (isAnime && animeData?.season)) && (
                <div className="detail-info-chip"><span className="detail-label">Даты</span><span className="detail-value">{[data.aired_on && formatDate(data.aired_on), data.released_on && formatDate(data.released_on)].filter(Boolean).join(" — ") || "ТВА"}{isAnime && animeData?.season && ` (${formatSeason(animeData.season)})`}</span></div>
              )}
              {isAnime && animeData?.studios && animeData.studios.length > 0 && (
                <div className="detail-info-chip"><span className="detail-label">Студии</span><span className="detail-value">{animeData.studios?.map((s: any, idx: number) => <span key={s.id}><button className="value-link-btn" onClick={() => onSearchStudio?.(s.id, s.name)} title={`Показать все аниме студии ${s.name}`}>{s.name}</button>{idx < (animeData.studios?.length || 0) - 1 && ", "}</span>)}</span></div>
              )}
              {!isAnime && mangaData?.publishers && mangaData.publishers.length > 0 && (
                <div className="detail-info-chip"><span className="detail-label">Издательства</span><span className="detail-value">{mangaData.publishers?.map((p: any, idx: number) => <span key={p.id}><button className="value-link-btn" onClick={() => onSearchPublisher?.(p.id, p.name)} title={`Показать всю мангу издательства ${p.name}`}>{p.name}</button>{idx < (mangaData.publishers?.length || 0) - 1 && ", "}</span>)}</span></div>
              )}
              {isAnime && animeData?.next_episode_at && <div className="detail-info-chip"><span className="detail-label">Серия</span><span className="detail-value">{animeData.next_episode_at}</span></div>}
            </div>

            {data.description && (
              <div className="detail-header-description-wrapper">
                <div className={`detail-header-description ${descExpanded ? 'expanded' : ''}`} dangerouslySetInnerHTML={{ __html: data.description_html || data.description }} onClick={(e) => {
                  const target = e.target as HTMLElement;
                  const link = target.closest('a');
                  if (link && link.getAttribute('href')) {
                    const href = link.getAttribute('href') || "";
                    const charMatch = href.match(/\/characters\/(\d+)/);
                    const animeMatch = href.match(/\/animes\/(\d+)/);
                    const mangaMatch = href.match(/\/mangas\/(\d+)/);
                    const personMatch = href.match(/\/people\/(\d+)/);
                    if (charMatch) { e.preventDefault(); onNavigate("characters", parseInt(charMatch[1])); return; }
                    if (animeMatch) { e.preventDefault(); onNavigate("anime", parseInt(animeMatch[1])); return; }
                    if (mangaMatch) { e.preventDefault(); onNavigate("manga", parseInt(mangaMatch[1])); return; }
                    if (personMatch) { e.preventDefault(); onNavigate("people", parseInt(personMatch[1])); return; }
                  }
                  const spoiler = target.closest('.b-spoiler, .b-spoiler_block, .b-spoiler_inline');
                  if (spoiler && (target.classList.contains('b-spoiler_label') || target.tagName === 'LABEL' || spoiler.firstElementChild === target || spoiler.firstElementChild?.contains(target))) {
                    spoiler.classList.toggle('is-expanded'); e.preventDefault(); e.stopPropagation();
                  }
                }} />
                {data.description.length > 300 && <button className="description-more-btn" onClick={() => setDescExpanded(!descExpanded)}>{descExpanded ? "Свернуть" : "Читать полностью..."}</button>}
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
              {data.character_roles.slice(0, 30).map((role: any) => (
                <PersonCard key={role.id} id={role.character.id} name={role.character.name} russian={role.character.russian} poster_url={role.character.poster_url} role={role.roles_ru?.[0] || role.roles_en?.[0]} onClick={() => onNavigate("characters", role.character.id)} />
              ))}
            </HorizontalScroll>
          </div>
        )}

        {data.person_roles && data.person_roles.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Люди</h3>
            <HorizontalScroll className="detail-people">
              {data.person_roles.slice(0, 30).map((role: any) => (
                <PersonCard key={role.id} id={role.person.id} name={role.person.name} russian={role.person.russian} poster_url={role.person.poster_url} role={role.roles_ru?.[0] || role.roles_en?.[0]} onClick={() => role.person.url && openUrl(role.person.url)} />
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
                const isAnimeView = type === "anime";
                const firstGroup = isAnimeView ? manga : anime;
                const secondGroup = isAnimeView ? anime : manga;
                const result = [];
                if (firstGroup.length > 0) {
                  result.push(<div key="first-sep" className="related-separator first-separator"><span className="related-separator-text">{isAnimeView ? "Манга" : "Аниме"}</span></div>);
                  result.push(...firstGroup.map((rel: any) => {
                    const item = rel.anime || rel.manga;
                    if (!item || !item.id) return null;
                    return (
                      <RelatedCard 
                        key={rel.id} 
                        item={item as any} 
                        type={rel.anime ? "anime" : "manga"} 
                        relation={rel.relation_kind} 
                        onClick={() => onNavigate(rel.anime ? "anime" : "manga", item.id!)} 
                      />
                    );
                  }));
                }
                if (secondGroup.length > 0) {
                  result.push(<div key="second-sep" className="related-separator"><span className="related-separator-text">{isAnimeView ? "Аниме" : "Манга"}</span></div>);
                  result.push(...secondGroup.map((rel: any) => {
                    const item = rel.anime || rel.manga;
                    if (!item || !item.id) return null;
                    return (
                      <RelatedCard 
                        key={rel.id} 
                        item={item as any} 
                        type={rel.anime ? "anime" : "manga"} 
                        relation={rel.relation_kind} 
                        onClick={() => onNavigate(rel.anime ? "anime" : "manga", item.id!)} 
                      />
                    );
                  }));
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
              {animeData.videos.map((video: any) => (
                <a key={video.id} href={video.player_url || "#"} target="_blank" rel="noopener noreferrer" className="video-card" onClick={(e) => { if (video.player_url) { e.preventDefault(); openUrl(video.player_url); } }}>
                  <div className="video-thumbnail-container"><img src={getVideoThumbnail(video)} alt={video.name || "Видео"} className="video-thumbnail" onError={(e) => { (e.target as HTMLImageElement).src = VIDEO_PLACEHOLDER; }} /><div className="video-overlay"><div className="play-button"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></div></div>{video.kind && <div className="video-kind">{(() => { const kinds: Record<string, string> = { pv: "Трейлер", op: "Опенинг", ed: "Эндинг", clip: "Клип", op_ed_clip: "OP/ED Клип", other: "Другое", episode_preview: "Превью" }; return kinds[video.kind] || video.kind.toUpperCase(); })()}</div>}</div>
                  <div className="video-info">{video.name && <div className="video-name" title={video.name}>{video.name}</div>}</div>
                </a>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {isAnime && animeData?.screenshots && animeData.screenshots.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Скриншоты</h3>
            <HorizontalScroll className="detail-screenshots">
              {animeData.screenshots.map((screenshot: any) => (
                <div key={screenshot.id} className="screenshot-item clickable" onClick={() => setSelectedScreenshot(screenshot.original_url || screenshot.x332_url || null)}><img src={screenshot.x332_url || screenshot.original_url} alt="Скриншот" className="screenshot-image" loading="lazy" /></div>
              ))}
            </HorizontalScroll>
          </div>
        )}

        {selectedScreenshot && (
          <div className="screenshot-modal" onClick={() => setSelectedScreenshot(null)}><div className="screenshot-modal-content" onClick={(e) => e.stopPropagation()}><img src={selectedScreenshot} alt="Скриншот" /><button className="modal-close" onClick={() => setSelectedScreenshot(null)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button></div></div>
        )}

        {data.external_links && data.external_links.length > 0 && (
          <ExternalLinks links={data.external_links} />
        )}
      </div>
    </div>
  );
}
