import React from 'react';
import styles from './Chip.module.css';

interface BaseChipProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
  title?: string;
  variant?: 'default' | 'genre' | 'info' | 'video';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
}

const Chip = ({ 
  children, 
  className = '', 
  clickable = false, 
  onClick, 
  title,
  variant = 'default',
  size = 'md',
  color,
  backgroundColor,
  borderColor
}: BaseChipProps) => {
  // Validate info variant structure
  if (variant === 'info' && React.Children.count(children) !== 2) {
    console.warn('Chip variant "info" expects exactly 2 children: label and value');
  }

  const chipClasses = [
    styles.chip,
    styles[variant],
    styles[size],
    clickable && styles.clickable,
    className
  ].filter(Boolean).join(' ');

  const style: React.CSSProperties = {};
  if (color) style.color = color;
  if (backgroundColor) style.background = backgroundColor;
  if (borderColor) style.borderColor = borderColor;

  return (
    <div 
      className={chipClasses}
      onClick={clickable ? onClick : undefined}
      title={title}
      style={style}
    >
      {children}
    </div>
  );
};

export default Chip;
