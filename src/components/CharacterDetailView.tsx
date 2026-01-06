import type { CharacterDetail, ContentType } from "../App";
import { useState } from "react";

interface CharacterDetailViewProps {
  data: CharacterDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onNavigate: (type: ContentType, id: number) => void;
}

export default function CharacterDetailView({ 
  data, 
  loading, 
  error, 
  onBack,
  onNavigate
}: CharacterDetailViewProps) {
  const [descExpanded, setDescExpanded] = useState(false);

  if (loading || !data) {
    return (
      <div className="detail-view">
        <button className="detail-back-btn" onClick={onBack}>
          ← Назад к списку
        </button>
        <div className="detail-loading">
          <div className="loading-spinner" />
          <p>Загрузка деталей персонажа...</p>
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

  return (
    <div className="detail-view">
      <button className="detail-back-btn" onClick={onBack}>
        ← Назад к списку
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
              <h1 className="detail-title">{data.russian || data.name}</h1>
              {data.russian && data.russian !== data.name && (
                <h2 className="detail-russian">{data.name}</h2>
              )}
              {data.japanese && (
                <div className="detail-english">{data.japanese}</div>
              )}
            </div>
          </div>

          <div className="detail-meta">
            <span className="detail-badge">Персонаж</span>
            {data.url && (
              <a href={data.url} target="_blank" rel="noopener noreferrer" className="anime-link">
                Открыть на Shikimori
                <svg className="anime-link-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2H14V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 10L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 9V14H2V2H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
                {(data.description_html || data.description).length > 300 && (
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
            <h3 className="detail-section-title">Участие в произведениях</h3>
            <div className="roles-grid">
              {data.character_roles.map((role) => {
                const item = role.anime || role.manga;
                if (!item) return null;
                const type = role.anime ? "anime" : "manga";
                
                return (
                  <div 
                    key={`${type}-${item.id}`} 
                    className="role-item clickable"
                    onClick={() => onNavigate(type, item.id)}
                  >
                    <div className="role-poster-wrapper">
                      {item.poster_url ? (
                        <img src={item.poster_url} alt={item.russian || item.title} className="role-poster" />
                      ) : (
                        <div className="role-poster-placeholder">Нет фото</div>
                      )}
                    </div>
                    <div className="role-info">
                      <div className="role-title">{item.russian || item.title}</div>
                      <div className="role-name">{role.roles_ru.join(", ")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
