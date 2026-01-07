import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'genre' | 'status' | 'kind' | 'rating';
  clickable?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  clickable = false,
  onClick,
  title,
  className = '',
}) => {
  const baseClass = variant === 'genre' ? 'genre-mini-chip' : 'detail-badge';
  const clickableClass = clickable ? 'clickable' : '';
  
  return (
    <span
      className={`${baseClass} ${clickableClass} ${className}`}
      onClick={clickable ? onClick : undefined}
      title={title}
      style={clickable ? { cursor: 'pointer' } : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </span>
  );
};
