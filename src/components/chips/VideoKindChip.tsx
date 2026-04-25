import Chip from '../ui/Chip';

interface VideoKindChipProps {
  kind: string;
  label: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
}

const VideoKindChip = ({ 
  kind, 
  label, 
  backgroundColor, 
  borderColor,
  className = ''
}: VideoKindChipProps) => {
  return (
    <Chip
      variant="video"
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      className={className}
      title={kind}
    >
      {label}
    </Chip>
  );
};

export default VideoKindChip;
