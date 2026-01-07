import React from 'react';

interface MarqueeTextProps {
  text: string;
  containerWidth?: number;
  charWidth?: number;
  className?: string;
  tag?: 'h3' | 'p' | 'div' | 'span';
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  containerWidth = 210,
  charWidth = 9.5,
  className = '',
  tag: Tag = 'div',
}) => {
  const textWidth = text.length * charWidth;
  const isLong = textWidth > containerWidth;

  if (!isLong) {
    return (
      <div className="anime-title-container">
        <div className="anime-marquee-inner">
          <Tag className={className}>{text}</Tag>
        </div>
      </div>
    );
  }

  const moveDistance = textWidth + 32;
  const totalDuration = (moveDistance / 50) / 0.7;
  const style = { "--marquee-duration": `${totalDuration}s` } as React.CSSProperties;

  return (
    <div className="anime-title-container">
      <div className="anime-marquee-inner is-marquee" style={style}>
        <Tag className={className}>{text}</Tag>
        <Tag className={`${className} spacer`}>{text}</Tag>
      </div>
    </div>
  );
};
