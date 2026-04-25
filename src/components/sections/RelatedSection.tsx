import ImageWithSkeleton from "../ui/ImageWithSkeleton";
import HorizontalScroll from "../ui/HorizontalScroll";
import { getMarqueeParams } from "../../utils/marquee";
import { translateRelationKind } from "../../utils/badgeTexts";
import type { Related } from "../../types";
import { useAccentColor } from "../../hooks/useAccentColor";
import styles from "./RelatedSection.module.css";

interface RelatedSectionProps {
  related: Related[];
  type: "anime" | "manga";
  onNavigate: (type: "anime" | "manga" | "characters", id: number) => void;
}

export default function RelatedSection({ related, type, onNavigate }: RelatedSectionProps) {
  const { handleImageLoad, getColor } = useAccentColor();
  
  if (!related || related.length === 0) {
    return null;
  }

  const renderRelatedCard = (rel: Related) => {
    const isAnimeRel = !!rel.anime;
    const item = rel.anime || rel.manga;
    if (!item) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (item.id) {
        onNavigate(isAnimeRel ? "anime" : "manga", item.id);
      }
    };

    const year = item.aired_on?.year;
    const title = item.russian || item.name || `${isAnimeRel ? 'Аниме' : 'Манга'} #${item.id}`;
    const accentColor = item.id ? getColor(item.id!) : 'transparent';

    return (
      <div
        key={rel.id}
        className={`${styles.relatedCard} ${styles.clickable}`}
        onClick={handleClick}
        style={{
          '--accent-color': accentColor,
        } as React.CSSProperties & { '--accent-color'?: string }}
      >
        <div className={styles.relatedCardPoster}>
          {item.image?.main ? (
            <ImageWithSkeleton
              src={item.image.main}
              alt={title}
              loading="lazy"
              onLoad={item.id ? (e) => handleImageLoad(e, item.id) : undefined}
            />
          ) : (
            <div className={styles.relatedCardPosterPlaceholder}>
              {isAnimeRel ? "Аниме" : "Манга"}
            </div>
          )}
          {(() => {
            const relationText = translateRelationKind(rel.relation_kind);
            const badgeParams = getMarqueeParams(relationText, 125, 9.6, undefined, '800');
            return (
              <div className={`${styles.relatedCardKindBadge} ${badgeParams.isLong ? 'hasMarquee' : ''}`}>
                <div className={`${styles.relatedCardKindBadgeInner} ${badgeParams.isLong ? 'isMarquee' : ''}`} style={badgeParams.style}>
                  {relationText}
                  {badgeParams.isLong && <>&nbsp;{relationText}</>}
                </div>
              </div>
            );
          })()}
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
            const marqueeParams = getMarqueeParams(title, 150, 13.6, undefined, '600');
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

          {year ? (
            <div className={styles.relatedCardYear}>
              {year}
            </div>
          ) : null}
        </div>

        <div className={styles.relatedCardFooter}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    );
  };

  const anime = related.filter(r => !!r.anime);
  const manga = related.filter(r => !!r.manga);

  const sortByYear = (a: Related, b: Related) => {
    const yearA = a.anime?.aired_on?.year ?? a.manga?.aired_on?.year;
    const yearB = b.anime?.aired_on?.year ?? b.manga?.aired_on?.year;

    if (!yearA && !yearB) return 0;
    if (!yearA) return 1;
    if (!yearB) return -1;
    return yearA - yearB;
  };

  const sortedAnime = [...anime].sort(sortByYear);
  const sortedManga = [...manga].sort(sortByYear);

  const result = [];

  const isAnimeView = type === "anime";
  const firstGroup = isAnimeView ? sortedManga : sortedAnime;
  const secondGroup = isAnimeView ? sortedAnime : sortedManga;
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

  return (
    <div className={styles.detailSection}>
      <h3 className={styles.detailSectionTitle}>Связанные произведения</h3>
      <HorizontalScroll className={styles.detailRelatedHorizontal}>
        {result}
      </HorizontalScroll>
    </div>
  );
}
