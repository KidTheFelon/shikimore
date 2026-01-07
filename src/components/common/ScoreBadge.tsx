import React from 'react';
import { StarIcon } from '../icons';

interface ScoreBadgeProps {
  score: number | undefined;
  variant?: 'card' | 'detail';
  clickable?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  forwardRef?: React.Ref<HTMLDivElement>;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  variant = 'card',
  clickable = false,
  active = false,
  onClick,
  className = '',
  forwardRef,
}) => {
  if (score === undefined) return null;

  const isHighScore = score > 9;
  const baseClass = variant === 'card' ? 'anime-card-score' : 'detail-score';
  const highScoreClass = isHighScore ? 'high-score' : '';
  const clickableClass = clickable ? 'clickable' : '';
  const activeClass = active ? 'active' : '';

  return (
    <div
      ref={forwardRef}
      className={`${baseClass} ${highScoreClass} ${clickableClass} ${activeClass} ${className}`}
      onClick={clickable ? onClick : undefined}
      title={clickable ? "Показать статистику оценок" : undefined}
    >
      <StarIcon size={variant === 'card' ? 12 : 20} />
      <span>{score.toFixed(1)}</span>
    </div>
  );
};
