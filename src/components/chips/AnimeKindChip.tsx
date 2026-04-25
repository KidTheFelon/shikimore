import Chip from '../ui/Chip';

interface AnimeKindChipProps {
  kind: string;
  className?: string;
}

const getAnimeKindColor = (kind: string) => {
  const colors: Record<string, { bg: string; border: string }> = {
    tv: { bg: 'rgba(59, 130, 246, 0.9)', border: 'rgba(59, 130, 246, 1)' },
    movie: { bg: 'rgba(239, 68, 68, 0.9)', border: 'rgba(239, 68, 68, 1)' },
    ova: { bg: 'rgba(168, 85, 247, 0.9)', border: 'rgba(168, 85, 247, 1)' },
    ona: { bg: 'rgba(236, 72, 153, 0.9)', border: 'rgba(236, 72, 153, 1)' },
    special: { bg: 'rgba(234, 179, 8, 0.9)', border: 'rgba(234, 179, 8, 1)' },
    tv_special: { bg: 'rgba(34, 197, 94, 0.9)', border: 'rgba(34, 197, 94, 1)' },
  };
  return colors[kind] || { bg: 'rgba(107, 114, 128, 0.9)', border: 'rgba(107, 114, 128, 1)' };
};

const formatAnimeKind = (kind: string) => {
  const labels: Record<string, string> = {
    tv: 'TV',
    movie: 'Фильм',
    ova: 'OVA',
    ona: 'ONA',
    special: 'Спец.',
    tv_special: 'Спец. TV',
  };
  return labels[kind] || kind;
};

const AnimeKindChip = ({ 
  kind, 
  className = ''
}: AnimeKindChipProps) => {
  const colors = getAnimeKindColor(kind);
  const label = formatAnimeKind(kind);
  
  return (
    <Chip
      variant="video"
      backgroundColor={colors.bg}
      borderColor={colors.border}
      className={className}
      title={kind}
    >
      {label}
    </Chip>
  );
};

export default AnimeKindChip;
