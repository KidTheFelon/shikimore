import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium', className = '' }) => {
  const sizeClass = size === 'small' ? 'loading-spinner-small' : 'loading-spinner';
  return (
    <div 
      className={`${sizeClass} ${className}`} 
      role="status" 
      aria-label="Загрузка"
    />
  );
};
