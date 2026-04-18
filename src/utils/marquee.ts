export interface MarqueeParams {
  isLong: boolean;
  style: React.CSSProperties;
}

/**
 * Calculate marquee parameters for text scrolling
 * @param text - Text to check for scrolling
 * @param containerWidth - Width of container in pixels
 * @param charWidth - Average character width in pixels (default: 8.5)
 * @param speed - Scrolling speed in pixels per second (default: 25)
 * @returns Marquee parameters object
 */
export const getMarqueeParams = (
  text: string, 
  containerWidth = 130,
  charWidth = 8.5,
  speed = 25
): MarqueeParams => {
  const textWidth = text.length * charWidth;
  const isLong = textWidth > containerWidth;
  
  if (!isLong) {
    return { isLong: false, style: {} };
  }

  const moveDistance = textWidth + 32; // gap: 2rem (32px)
  const totalDuration = moveDistance / speed;
  
  return { 
    isLong: true, 
    style: { "--marquee-duration": `${totalDuration}s` } as React.CSSProperties 
  };
};

/**
 * Generate CSS classes for marquee container
 * @param params - Marquee parameters from getMarqueeParams
 * @param baseClass - Base CSS class name
 * @returns Object with CSS classes
 */
export const getMarqueeClasses = (
  params: MarqueeParams,
  baseClass: string
): {
  container: string;
  inner: string;
} => {
  return {
    container: params.isLong ? `${baseClass} hasMarquee` : baseClass,
    inner: params.isLong ? `${baseClass}Inner isMarquee` : `${baseClass}Inner`
  };
};
