import React from 'react';
import { MarqueeText } from './common/MarqueeText';

interface PersonCardProps {
  id: number;
  name: string;
  russian?: string;
  poster_url?: string;
  role?: string;
  onClick: () => void;
  className?: string;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  id,
  name,
  russian,
  poster_url,
  role,
  onClick,
  className = '',
}) => {
  const displayName = russian || name;

  return (
    <div 
      className={`person-card clickable ${className}`}
      onClick={onClick}
      title={`Открыть ${displayName}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="person-poster-wrapper">
        {poster_url ? (
          <img
            src={poster_url}
            alt={displayName}
            className="person-poster"
            loading="lazy"
          />
        ) : (
          <div className="person-poster-placeholder">Нет фото</div>
        )}
        {role && (
          <div className="role-badge">
            <div className="role-text">{role}</div>
          </div>
        )}
      </div>
      <div className="person-info">
        <MarqueeText 
          text={displayName} 
          className="person-name" 
          containerWidth={160} 
          charWidth={8.5} 
          tag="div"
        />
      </div>
    </div>
  );
};
