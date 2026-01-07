import React from 'react';
import { AnimeIcon, MangaIcon } from './icons';
import { MarqueeText } from './common/MarqueeText';
import { formatKind, formatRelationKind } from '../utils/formatters';

interface RelatedCardProps {
  item: {
    id: number;
    name: string;
    russian?: string;
    poster_url?: string;
    image?: {
      original?: string;
      preview?: string;
    };
    kind?: string;
    aired_on?: string;
    title?: string;
  };
  type: 'anime' | 'manga';
  relation?: string;
  relationRussian?: string;
  roles?: string[];
  onClick: () => void;
  className?: string;
}

export const RelatedCard: React.FC<RelatedCardProps> = ({
  item,
  type,
  relation,
  relationRussian,
  roles,
  onClick,
  className = '',
}) => {
  const isAnime = type === 'anime';
  const russianTitle = item.russian;
  const originalTitle = item.title || item.name;
  const displayTitle = (russianTitle || originalTitle) || `${isAnime ? 'Аниме' : 'Манга'} #${item.id}`;
  
  const posterUrl = item.poster_url || (item.image?.preview ? (item.image.preview.startsWith('http') ? item.image.preview : `https://shikimori.one${item.image.preview}`) : undefined);

  return (
    <div 
      className={`related-card clickable ${className}`}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="related-card-poster">
        {posterUrl ? (
          <img 
            src={posterUrl} 
            alt={displayTitle} 
            loading="lazy"
          />
        ) : (
          <div className="related-card-poster-placeholder">
            {isAnime ? "Аниме" : "Манга"}
          </div>
        )}
        {(relationRussian || relation || (roles && roles.length > 0)) && (
          <div className="related-card-kind-badge">
            {roles ? roles.join(", ") : formatRelationKind(relationRussian || relation || "")}
          </div>
        )}
      </div>
      
      <div className="related-card-content">
        <div className="related-card-type">
          {isAnime ? <AnimeIcon size={10} strokeWidth={2.5} /> : <MangaIcon size={10} strokeWidth={2.5} />}
          <span>{isAnime ? "Аниме" : "Манга"}</span>
        </div>

        <MarqueeText 
          text={displayTitle} 
          className="related-card-title" 
          containerWidth={150} 
          charWidth={8.5} 
          tag="div" 
        />
        
        {item.kind && (
          <div className="related-card-meta">
            {formatKind(item.kind)} {item.aired_on && `• ${new Date(item.aired_on).getFullYear()}`}
          </div>
        )}
      </div>

      <div className="related-card-footer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  );
};
