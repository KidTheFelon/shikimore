import type { CharacterDetail, ContentType, AppSettings } from "../App";
import { useState } from "react";
import { HorizontalScroll } from "./HorizontalScroll";
import { BackIcon, ExternalLinkIcon } from "./icons";
import { Badge } from "./common/Badge";
import { LoadingSpinner } from "./common/LoadingSpinner";
import { MarqueeText } from "./common/MarqueeText";
import { RelatedCard } from "./RelatedCard";
import { PersonCard } from "./PersonCard";
import { translateRole } from "../utils/formatters";

interface CharacterDetailViewProps {
  data: CharacterDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onNavigate: (type: ContentType, id: number) => void;
  settings: AppSettings | null;
}

export default function CharacterDetailView({ 
  data, 
  loading, 
  error, 
  onBack,
  onNavigate,
  settings
}: CharacterDetailViewProps) {
  const [descExpanded, setDescExpanded] = useState(false);

  if (loading || !data) {
    return (
      <div className="detail-view">
        <button className="detail-back-btn" onClick={onBack} title="Назад к списку">
          <BackIcon />
        </button>
        <div className="detail-loading">
          <LoadingSpinner />
          <p>Загрузка деталей персонажа...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-view">
        <button className="detail-back-btn" onClick={onBack} title="Назад к списку">
          <BackIcon />
        </button>
        <div className="detail-error">
          <p>Ошибка загрузки: {error}</p>
        </div>
      </div>
    );
  }

  const prefLang = settings?.preferred_language || "russian";
  const displayTitle = (prefLang === "russian" 
    ? (data.russian || data.name) 
    : (data.name || data.russian)) || "";
  
  const subTitle = (displayTitle === data.russian ? data.name : data.russian) || "";

  return (
    <div className="detail-view">
      <button className="detail-back-btn" onClick={onBack} title="Назад к списку">
        <BackIcon />
      </button>

      <div className="detail-header">
        <div className="detail-poster-wrapper">
          {data.poster_url ? (
            <img src={data.poster_url} alt={data.russian || data.name} className="detail-poster" />
          ) : (
            <div className="detail-poster-placeholder">Нет изображения</div>
          )}
        </div>

        <div className="detail-header-content">
          <div className="detail-title-row">
            <div className="detail-main-titles">
              <h1 className="detail-title">{displayTitle}</h1>
              {subTitle && (
                <h2 className="detail-russian">{subTitle}</h2>
              )}
              {data.japanese && (
                <div className="detail-english">{data.japanese}</div>
              )}
            </div>
          </div>

          <div className="detail-meta">
            <Badge variant="status">Персонаж</Badge>
            {data.url && (
              <a href={data.url} target="_blank" rel="noopener noreferrer" className="anime-link">
                Открыть на Shikimori
                <ExternalLinkIcon size={14} />
              </a>
            )}
          </div>

          <div className="detail-info-grid-header">
            {data.synonyms && data.synonyms.length > 0 && (
              <div className="detail-info-chips-group">
                <div className="detail-info-chip">
                  <span className="detail-label">Синонимы</span>
                  <span className="detail-value">{data.synonyms.join(", ")}</span>
                </div>
              </div>
            )}

            {data.description && (
              <div className="detail-header-description-wrapper">
                <div 
                  className={`detail-header-description ${descExpanded ? 'expanded' : ''}`}
                  dangerouslySetInnerHTML={{ __html: data.description_html || data.description }}
                  onClick={(e) => {
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
                      spoiler.classList.toggle('is-expanded');
                      e.preventDefault(); e.stopPropagation();
                    }
                  }}
                />
                {(data.description_html || data.description).length > 300 && (
                  <button className="description-more-btn" onClick={() => setDescExpanded(!descExpanded)}>
                    {descExpanded ? "Свернуть" : "Читать полностью..."}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="detail-content">
        {data.seyus && data.seyus.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Сейю</h3>
            <HorizontalScroll className="detail-people">
              {data.seyus.map((person) => (
                <PersonCard 
                  key={person.id}
                  id={person.id}
                  name={person.name}
                  russian={person.russian}
                  poster_url={person.poster_url}
                  role="Сейю"
                  onClick={() => onNavigate("people", person.id)}
                />
              ))}
            </HorizontalScroll>
          </div>
        )}

        {data.character_roles && data.character_roles.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Участие в произведениях</h3>
            <HorizontalScroll className="detail-related-horizontal">
              {(() => {
                const animeRoles = data.character_roles.filter(r => !!r.anime);
                const mangaRoles = data.character_roles.filter(r => !!r.manga);
                const result = [];

                if (animeRoles.length > 0) {
                  result.push(
                    <div key="sep-anime" className="related-separator first-separator">
                      <span className="related-separator-text">Аниме</span>
                    </div>
                  );
                  result.push(...animeRoles.map(role => (
                    <RelatedCard 
                      key={`anime-${role.id}`}
                      item={role.anime!}
                      type="anime"
                      roles={role.roles_ru.map(translateRole)}
                      onClick={() => onNavigate("anime", role.anime!.id)}
                    />
                  )));
                }

                if (mangaRoles.length > 0) {
                  result.push(
                    <div key="sep-manga" className="related-separator">
                      <span className="related-separator-text">Манга</span>
                    </div>
                  );
                  result.push(...mangaRoles.map(role => (
                    <RelatedCard 
                      key={`manga-${role.id}`}
                      item={role.manga!}
                      type="manga"
                      roles={role.roles_ru.map(translateRole)}
                      onClick={() => onNavigate("manga", role.manga!.id)}
                    />
                  )));
                }

                return result;
              })()}
            </HorizontalScroll>
          </div>
        )}
      </div>
    </div>
  );
}
