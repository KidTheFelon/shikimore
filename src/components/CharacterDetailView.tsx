import type { CharacterDetail, ContentType, VoiceActor } from "../types";
import { useState, useEffect } from "react";
import styles from "./CharacterDetailView.module.css";
import InfoChip from "./InfoChip";
import HorizontalScroll from "./HorizontalScroll";
import ImageWithSkeleton from "./ImageWithSkeleton";
import ReadMoreButton from "./ReadMoreButton";
import { getMarqueeParams } from "../utils/marquee";
import { getInfoChipLabel, translateRole } from "../utils/badgeTexts";
import { fetchVoiceActors, translateLanguage } from "../utils/anilist";

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
  const [voiceActors, setVoiceActors] = useState<VoiceActor[]>([]);

  useEffect(() => {
    const abortController = new AbortController();

    if (data?.name) {
      fetchVoiceActors(data.name)
        .then(actors => {
          if (!abortController.signal.aborted) {
            setVoiceActors(actors);
          }
        })
        .catch(err => {
          if (!abortController.signal.aborted) {
            console.error("Failed to load voice actors:", err);
          }
        });
    }

    return () => {
      abortController.abort();
    };
  }, [data?.name]);

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

  return (
    <div className={styles.detailView}>
      <button className={styles.detailBackBtn} onClick={onBack}>
        <span className={styles.backArrow}>{"<"} </span>
        <span>Назад к списку</span>
      </button>

      <div className={styles.detailHeader}>
        <div className={styles.detailPosterWrapper}>
          {data.poster_url ? (
            <ImageWithSkeleton
              src={data.poster_url}
              alt={data.russian || data.name}
              className={styles.detailPoster}
            />
          ) : (
            <div className={styles.detailPosterPlaceholder}>Нет изображения</div>
          )}
        </div>

        <div className={styles.detailHeaderContent}>
          <div className={styles.detailTitleRow}>
            <div className={styles.detailMainTitles}>
              <h1 className={styles.detailTitle}>{data.russian || data.name}</h1>
              {data.russian && data.russian !== data.name && (
                <h2 className={styles.detailRussian}>{data.name}</h2>
              )}
              {data.japanese && (
                <div className={styles.detailEnglish}>{data.japanese}</div>
              )}
            </div>
          </div>

          <div className={styles.detailMeta}>
            <span className={styles.detailBadge}>Персонаж</span>
            {data.url && (
              <a href={data.url} target="_blank" rel="noopener noreferrer" className={styles.animeLink}>
                Открыть на Shikimori
                <svg className={styles.animeLinkIcon} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2H14V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 10L14 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 9V14H2V2H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
          </div>

          <div className={styles.detailInfoGridHeader}>
            {data.synonyms && data.synonyms.length > 0 && (
              <div className={styles.detailInfoChipsGroup}>
                <InfoChip
                  label={getInfoChipLabel("synonyms")}
                  value={data.synonyms.join(", ")}
                />
              </div>
            )}

            {data.description && (
              <div className={styles.detailHeaderDescriptionWrapper}>
                <ReadMoreButton className={styles.detailHeaderDescription}>
                  <div
                    dangerouslySetInnerHTML={{ __html: data.description_html || data.description }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const spoiler = target.closest('.b-spoiler, .b-spoiler_block, .b-spoiler_inline');
                      if (!spoiler) return;

                      spoiler.classList.toggle('is-expanded');
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                </ReadMoreButton>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.detailContent}>
        {data.character_roles && data.character_roles.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Участие в произведениях</h3>
            <HorizontalScroll className={styles.detailRoles}>
              {(() => {
                const anime = data.character_roles.filter(r => !!r.anime);
                const manga = data.character_roles.filter(r => !!r.manga);
                const result = [];

                if (anime.length > 0) {
                  result.push(
                    <div key="sep-anime" className={`${styles.relatedSeparator} ${styles.firstSeparator}`}>
                      <span className={styles.relatedSeparatorText}>Аниме</span>
                    </div>
                  );
                  result.push(...anime.map((role) => {
                    const item = role.anime!;
                    return (
                      <div 
                        key={`anime-${item.id}`} 
                        className={`${styles.roleCard} ${styles.clickable}`}
                        onClick={() => onNavigate("anime", item.id)}
                        title={item.russian || item.title}
                      >
                        <div className={styles.rolePosterWrapper}>
                          {item.poster_url ? (
                            <ImageWithSkeleton
                              src={item.poster_url}
                              alt={item.russian || item.title}
                              className={styles.rolePoster}
                            />
                          ) : (
                            <div className={styles.rolePosterPlaceholder}>Нет фото</div>
                          )}
                          {(() => {
                            const allRoles = role.roles_ru && role.roles_ru.length > 0 
                              ? role.roles_ru.map(translateRole)
                              : [];
                            
                            if (allRoles.length === 0) return null;
                            const roleText = allRoles[0];
                            const badgeParams = getMarqueeParams(roleText, 100, 7.5);

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
                        <div className={styles.roleInfo}>
                          <div className={styles.roleType}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="2" y="2" width="20" height="20" rx="2" />
                              <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
                            </svg>
                            <span>Аниме</span>
                          </div>
                          {(() => {
                            const name = item.russian || item.title;
                            const nameParams = getMarqueeParams(name, 110, 8.5);
                            
                            return (
                              <div className={`characterNameContainer ${nameParams.isLong ? 'hasMarquee' : ''}`}>
                                <div className={`characterMarqueeInner ${nameParams.isLong ? 'isMarquee' : ''}`} style={nameParams.style}>
                                  <div className={styles.roleTitle}>{name}</div>
                                  {nameParams.isLong && <div className={styles.roleTitle}>&nbsp;</div>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  }));
                }

                if (manga.length > 0) {
                  result.push(
                    <div key="sep-manga" className={styles.relatedSeparator}>
                      <span className={styles.relatedSeparatorText}>Манга</span>
                    </div>
                  );
                  result.push(...manga.map((role) => {
                    const item = role.manga!;
                    return (
                      <div 
                        key={`manga-${item.id}`} 
                        className={`${styles.roleCard} ${styles.clickable}`}
                        onClick={() => onNavigate("manga", item.id)}
                        title={item.russian || item.title}
                      >
                        <div className={styles.rolePosterWrapper}>
                          {item.poster_url ? (
                            <ImageWithSkeleton
                              src={item.poster_url}
                              alt={item.russian || item.title}
                              className={styles.rolePoster}
                            />
                          ) : (
                            <div className={styles.rolePosterPlaceholder}>Нет фото</div>
                          )}
                          {(() => {
                            const allRoles = role.roles_ru && role.roles_ru.length > 0 
                              ? role.roles_ru.map(translateRole)
                              : [];
                            
                            if (allRoles.length === 0) return null;
                            const roleText = allRoles[0];
                            const badgeParams = getMarqueeParams(roleText, 100, 7.5);

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
                        <div className={styles.roleInfo}>
                          <div className={styles.roleType}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            <span>Манга</span>
                          </div>
                          {(() => {
                            const name = item.russian || item.title;
                            const nameParams = getMarqueeParams(name, 110, 8.5);
                            
                            return (
                              <div className={`characterNameContainer ${nameParams.isLong ? 'hasMarquee' : ''}`}>
                                <div className={`characterMarqueeInner ${nameParams.isLong ? 'isMarquee' : ''}`} style={nameParams.style}>
                                  <div className={styles.roleTitle}>{name}</div>
                                  {nameParams.isLong && <div className={styles.roleTitle}>&nbsp;</div>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  }));
                }

                return result;
              })()}
            </HorizontalScroll>
          </div>
        )}

        {voiceActors.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Сэйю</h3>
            <HorizontalScroll className={styles.detailRoles}>
              {voiceActors.map((va) => (
                <div 
                  key={va.id} 
                  className={`${styles.voiceActorCard} ${styles.clickable}`}
                  title={va.name.full}
                >
                  <div className={styles.voiceActorPosterWrapper}>
                    {va.image.large || va.image.medium ? (
                      <ImageWithSkeleton
                        src={va.image.large || va.image.medium || ""}
                        alt={va.name.full}
                        className={styles.voiceActorPoster}
                      />
                    ) : (
                      <div className={styles.voiceActorPosterPlaceholder}>Фото</div>
                    )}
                    {(() => {
                      const lang = translateLanguage(va.language);
                      const langParams = getMarqueeParams(lang, 40, 7);
                      
                      return (
                        <div className={styles.languageBadge}>
                          <div className="languageMarqueeContainer hasMarquee">
                            <div className="languageMarqueeInner isMarquee" style={{ ...langParams.style, '--marquee-duration': '8s' } as React.CSSProperties}>
                              <span>{lang}</span>
                              <span>&nbsp;</span>
                              <span>{lang}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className={styles.voiceActorInfo}>
                    {(() => {
                      const name = va.name.full;
                      const nameParams = getMarqueeParams(name, 120, 8);
                      
                      return (
                        <div className={`voiceActorNameContainer ${nameParams.isLong ? 'hasMarquee' : ''}`}>
                          <div className={`voiceActorMarqueeInner ${nameParams.isLong ? 'isMarquee' : ''}`} style={nameParams.style}>
                            <div className={styles.voiceActorName}>{name}</div>
                            {nameParams.isLong && <div className={styles.voiceActorName}>&nbsp;</div>}
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
      </div>
    </div>
  );
}
