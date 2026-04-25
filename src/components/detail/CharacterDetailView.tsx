import type { CharacterDetail, ContentType, VoiceActor } from "../../types";
import { useState, useEffect, useRef, memo, useMemo } from "react";
import styles from "./CharacterDetailView.module.css";
import InfoChip from "../chips/InfoChip";
import HorizontalScroll from "../ui/HorizontalScroll";
import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import ReadMoreButton from "../ui/ReadMoreButton";
import DescriptionWithLinks from "../utils/DescriptionWithLinks";
import { getMarqueeParams } from "../../utils/marquee";
import { getInfoChipLabel, translateRole } from "../../utils/badgeTexts";
import { fetchVoiceActors, translateLanguage } from "../../utils/anilist";

// Constants for marquee styling
const MARQUEE_CONFIG = {
  CHARACTER_NAME: { width: 110, fontSize: 15.2, fontWeight: '600' as const },
  VOICE_ACTOR_NAME: { width: 120, fontSize: 15.2, fontWeight: '600' as const },
  ROLE_BADGE: { width: 100, fontSize: 11.2, fontWeight: '800' as const },
  LANGUAGE_BADGE: { width: 40, fontSize: 10.4, fontWeight: '700' as const },
} as const;

// Memoized component for marquee text
const MarqueeText = memo(({ text, width, fontSize, fontWeight, containerPrefix, className }: { text: string; width: number; fontSize: number; fontWeight?: string; containerPrefix: string; className: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(width);
  
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerWidth(rect.width);
    }
  }, []);
  
  const params = getMarqueeParams(text, containerWidth, fontSize, undefined, fontWeight);

  return (
    <div ref={containerRef} className={`${containerPrefix}Container ${params.isLong ? 'hasMarquee' : ''}`}>
      <div className={`${containerPrefix}MarqueeInner ${params.isLong ? 'isMarquee' : ''}`} style={params.style}>
        <div className={className}>{text}</div>
        {params.isLong && <div className={className}>&nbsp;</div>}
        {params.isLong && <div className={className}>{text}</div>}
      </div>
    </div>
  );
});

// Role badge component with marquee
const RoleBadge = memo(({ roles }: { roles: string[] }) => {
  if (roles.length === 0) return null;
  
  const roleText = roles[0];
  const badgeParams = getMarqueeParams(
    roleText, 
    MARQUEE_CONFIG.ROLE_BADGE.width, 
    MARQUEE_CONFIG.ROLE_BADGE.fontSize, 
    undefined, 
    MARQUEE_CONFIG.ROLE_BADGE.fontWeight
  );

  return (
    <div className={`${styles.roleBadge} roleBadge`} title={roles.join(", ")}>
      <div className={`${styles.roleMarqueeContainer} roleMarqueeContainer ${badgeParams.isLong ? 'hasMarquee' : ''}`}>
        <div className={`${styles.roleMarqueeInner} roleMarqueeInner ${badgeParams.isLong ? 'isMarquee' : ''}`} style={badgeParams.style}>
          <div className={styles.roleText}>{roleText}</div>
          {badgeParams.isLong && <div className={styles.roleText}>&nbsp;</div>}
        </div>
      </div>
    </div>
  );
});

// Language badge component with marquee
const LanguageBadge = memo(({ language }: { language: string }) => {
  const langParams = getMarqueeParams(
    language, 
    MARQUEE_CONFIG.LANGUAGE_BADGE.width, 
    MARQUEE_CONFIG.LANGUAGE_BADGE.fontSize, 
    undefined, 
    MARQUEE_CONFIG.LANGUAGE_BADGE.fontWeight
  );
  
  return (
    <div className={styles.languageBadge}>
      <div className={`${styles.languageMarqueeContainer} languageMarqueeContainer hasMarquee`}>
        <div className={`${styles.languageMarqueeInner} languageMarqueeInner isMarquee`} style={{ ...langParams.style, '--marquee-duration': '8s' } as React.CSSProperties}>
          <span>{language}</span>
          <span>&nbsp;</span>
          <span>{language}</span>
        </div>
      </div>
    </div>
  );
});

// Role card component for anime/manga
const RoleCard = memo(({ 
  item, 
  type, 
  roles, 
  onNavigate 
}: { 
  item: { id: number; poster_url?: string; russian?: string; title: string };
  type: 'anime' | 'manga';
  roles: string[];
  onNavigate: (type: ContentType, id: number) => void;
}) => {
  const translatedRoles = roles.map(translateRole);
  const typeIcon = type === 'anime' ? (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );

  return (
    <div 
      key={`${type}-${item.id}`}
      className={`${styles.roleCard} ${styles.clickable}`}
      onClick={() => onNavigate(type, item.id)}
      title={item.russian || item.title}
    >
      <div className={styles.rolePosterWrapper}>
        {item.poster_url ? (
          <ImageWithSkeleton
            src={item.poster_url}
            alt={item.russian || item.title}
            className={styles.rolePoster}
            useCache={true}
          />
        ) : (
          <div className={styles.rolePosterPlaceholder}>Нет фото</div>
        )}
        <RoleBadge roles={translatedRoles} />
      </div>
      <div className={styles.roleInfo}>
        <div className={styles.roleType}>
          {typeIcon}
          <span>{type === 'anime' ? 'Аниме' : 'Манга'}</span>
        </div>
        <MarqueeText
          text={item.russian || item.title}
          width={MARQUEE_CONFIG.CHARACTER_NAME.width}
          fontSize={MARQUEE_CONFIG.CHARACTER_NAME.fontSize}
          fontWeight={MARQUEE_CONFIG.CHARACTER_NAME.fontWeight}
          containerPrefix="characterName"
          className={styles.roleTitle}
        />
      </div>
    </div>
  );
});

interface CharacterDetailViewProps {
  data: CharacterDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onNavigate: (type: ContentType, id: number) => void;
  hasParentView?: boolean;
}

export default function CharacterDetailView({
  data,
  loading,
  error,
  onBack,
  onNavigate,
  hasParentView = false
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

  // Memoize character roles to avoid unnecessary recalculations
  const characterRoles = useMemo(() => {
    if (!data?.character_roles) return { anime: [], manga: [] };
    
    return {
      anime: data.character_roles.filter(r => !!r.anime),
      manga: data.character_roles.filter(r => !!r.manga),
    };
  }, [data?.character_roles]);

  if (loading || !data) {
    return (
      <div className={styles.detailView}>
        <button className={styles.detailBackBtn} onClick={onBack}>
          <span className={styles.backArrow}>{"<"} </span>
          <span>{hasParentView ? "Назад к аниме" : "Назад к списку"}</span>
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
          <span>{hasParentView ? "Назад к аниме" : "Назад к списку"}</span>
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
        <span>{hasParentView ? "Назад к аниме" : "Назад к списку"}</span>
      </button>

      <div className={styles.detailHeader}>
        <div className={styles.detailPosterWrapper}>
          {data.poster_url ? (
            <ImageWithSkeleton
              src={data.poster_url}
              alt={data.russian || data.name}
              className={styles.detailPoster}
              useCache={true}
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

      <div className={styles.detailContent}>
        {data.character_roles && data.character_roles.length > 0 && (
          <div className={styles.detailSection}>
            <h3 className={styles.detailSectionTitle}>Участие в произведениях</h3>
            <HorizontalScroll className={styles.detailRoles}>
              {characterRoles.anime.length > 0 && (
                <>
                  <div key="sep-anime" className={`${styles.relatedSeparator} ${styles.firstSeparator}`}>
                    <span className={styles.relatedSeparatorText}>Аниме</span>
                  </div>
                  {characterRoles.anime.map((role) => (
                    <RoleCard
                      key={`anime-${role.anime!.id}`}
                      item={role.anime!}
                      type="anime"
                      roles={role.roles_ru || []}
                      onNavigate={onNavigate}
                    />
                  ))}
                </>
              )}
              {characterRoles.manga.length > 0 && (
                <>
                  <div key="sep-manga" className={styles.relatedSeparator}>
                    <span className={styles.relatedSeparatorText}>Манга</span>
                  </div>
                  {characterRoles.manga.map((role) => (
                    <RoleCard
                      key={`manga-${role.manga!.id}`}
                      item={role.manga!}
                      type="manga"
                      roles={role.roles_ru || []}
                      onNavigate={onNavigate}
                    />
                  ))}
                </>
              )}
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
                  onClick={() => onNavigate("people", va.id)}
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
                    <LanguageBadge language={translateLanguage(va.language)} />
                  </div>
                  <div className={styles.voiceActorInfo}>
                    <MarqueeText
                      text={va.name.full}
                      width={MARQUEE_CONFIG.VOICE_ACTOR_NAME.width}
                      fontSize={MARQUEE_CONFIG.VOICE_ACTOR_NAME.fontSize}
                      fontWeight={MARQUEE_CONFIG.VOICE_ACTOR_NAME.fontWeight}
                      containerPrefix="voiceActorName"
                      className={styles.voiceActorName}
                    />
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
