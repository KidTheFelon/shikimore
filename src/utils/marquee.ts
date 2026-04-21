// Constants
const DEFAULT_CHAR_WIDTH = 8.5;
const DEFAULT_SPEED = 25;
const MARQUEE_GAP = 32; // 2rem in pixels
const DEFAULT_CONTAINER_WIDTH = 130;

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
  containerWidth = DEFAULT_CONTAINER_WIDTH,
  charWidth = DEFAULT_CHAR_WIDTH,
  speed = DEFAULT_SPEED
): MarqueeParams => {
  // Validation
  if (!text || typeof text !== 'string') {
    return { isLong: false, style: {} };
  }

  if (containerWidth <= 0 || charWidth <= 0 || speed <= 0) {
    return { isLong: false, style: {} };
  }

  const textWidth = text.length * charWidth;
  const isLong = textWidth > containerWidth;

  if (!isLong) {
    return { isLong: false, style: {} };
  }

  const moveDistance = textWidth + MARQUEE_GAP;
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
