import Chip from '../ui/Chip';

interface InfoChipProps {
  label: string;
  value: React.ReactNode;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

const InfoChip = ({ 
  label, 
  value, 
  clickable = false,
  onClick,
  className = ''
}: InfoChipProps) => {
  return (
    <Chip
      variant="info"
      clickable={clickable}
      onClick={onClick}
      className={className}
    >
      <span className="chipLabel">{label}</span>
      <span className="chipValue">{value}</span>
    </Chip>
  );
};

export default InfoChip;
