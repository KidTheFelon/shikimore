import Chip from './Chip';

interface GenreChipProps {
  id: number;
  name: string;
  onClick?: (id: number, name: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const GenreChip = ({ 
  id, 
  name, 
  onClick, 
  size = 'sm',
  className = ''
}: GenreChipProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick(id, name);
    }
  };

  return (
    <Chip
      variant="genre"
      size={size}
      clickable={!!onClick}
      onClick={handleClick}
      title={`Найти всё в жанре ${name}`}
      className={className}
    >
      {name}
    </Chip>
  );
};

export default GenreChip;
