import { useState, useRef } from 'react';

interface InteractiveStarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  onHover?: (value: number | null) => void;
  size?: number;
  className?: string;
}

export default function InteractiveStarRating({ 
  value, 
  onChange, 
  onHover,
  size = 24, 
  className = '' 
}: InteractiveStarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const totalWidth = rect.width;
    const starWidth = totalWidth / 5;
    
    // Ограничиваем x в пределах контейнера
    const clampedX = Math.max(0, Math.min(x, totalWidth));
    
    const starIndex = Math.floor(clampedX / starWidth);
    const positionInStar = (clampedX % starWidth) / starWidth;
    
    // Левая половина звезды = нечетное, правая = четное
    const isLeftHalf = positionInStar < 0.5;
    const score = (starIndex * 2) + (isLeftHalf ? 1 : 2);
    
    const newHoverValue = Math.min(Math.max(score, 1), 10);
    setHoverValue(newHoverValue);
    onHover?.(newHoverValue);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
    onHover?.(null);
  };

  const handleClick = () => {
    if (hoverValue !== null) {
      onChange(hoverValue);
      setHoverValue(null);
      onHover?.(null);
    }
  };

  const Star = ({ 
    index, 
    filled, 
    half 
  }: { 
    index: number; 
    filled: boolean; 
    half?: boolean;
  }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: 'text-bottom', cursor: 'pointer' }}
    >
      {half ? (
        <>
          <defs>
            <linearGradient id={`half-star-${size}-${index}`}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={`url(#half-star-${size}-${index})`}
          />
        </>
      ) : (
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill={filled ? 'currentColor' : 'currentColor'}
          fillOpacity={filled ? 1 : 0.3}
        />
      )}
    </svg>
  );

  if (displayValue === null || displayValue === 0) {
    return (
      <div 
        ref={containerRef}
        className={className}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ display: 'inline-block' }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} index={i} filled={false} />
        ))}
      </div>
    );
  }

  const normalizedScore = Math.min(Math.max(displayValue, 0), 10);
  const fullStars = Math.floor(normalizedScore / 2);
  const hasHalfStar = normalizedScore % 2 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div 
      ref={containerRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ display: 'inline-block' }}
    >
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} index={i} filled={true} />
      ))}
      {hasHalfStar && <Star key="half" index={fullStars} filled={false} half={true} />}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} index={fullStars + (hasHalfStar ? 1 : 0) + i} filled={false} />
      ))}
    </div>
  );
}
