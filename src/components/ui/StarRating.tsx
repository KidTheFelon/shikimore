interface StarRatingProps {
  score: number | undefined | null;
  size?: number;
  className?: string;
}

export default function StarRating({ score, size = 16, className = '' }: StarRatingProps) {
  if (score === undefined || score === null || score === 0) {
    return <span className={className}>—</span>;
  }

  const normalizedScore = Math.min(Math.max(score, 0), 10);
  const fullStars = Math.floor(normalizedScore / 2);
  const hasHalfStar = normalizedScore % 2 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const Star = ({ filled, half }: { filled: boolean; half?: boolean }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}
    >
      {half ? (
        <>
          <defs>
            <linearGradient id={`half-star-${size}`}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={`url(#half-star-${size})`}
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

  return (
    <span className={className}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} filled={true} />
      ))}
      {hasHalfStar && <Star key="half" filled={false} half={true} />}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} filled={false} />
      ))}
    </span>
  );
}
