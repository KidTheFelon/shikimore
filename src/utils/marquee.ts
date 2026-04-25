const DEFAULT_SPEED = 25;
const MARQUEE_GAP = 32;

export interface MarqueeParams {
  isLong: boolean;
  style: React.CSSProperties;
}

// Canvas singleton for text measurement
let canvasContext: CanvasRenderingContext2D | null = null;

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (!canvasContext) {
    const canvas = document.createElement('canvas');
    canvasContext = canvas.getContext('2d');
  }
  return canvasContext;
}

// Cache for text measurements
const textWidthCache = new Map<string, number>();
const MAX_CACHE_SIZE = 500;
let cacheCleared = false;

function clearCacheIfNeeded() {
  if (!cacheCleared) {
    textWidthCache.clear();
    cacheCleared = true;
  }
  if (textWidthCache.size > MAX_CACHE_SIZE) {
    textWidthCache.clear();
  }
}

function getCacheKey(text: string, font: string): string {
  return `${text}|${font}`;
}

// Track if fonts are ready
let fontsReadyPromise: Promise<FontFaceSet> | null = null;

function ensureFontsReady(): Promise<FontFaceSet> {
  if (!fontsReadyPromise) {
    fontsReadyPromise = document.fonts.ready;
  }
  return fontsReadyPromise;
}

/**
 * Get computed font style from an element
 * @param element - DOM element to get font from
 * @returns Complete font string
 */
export const getComputedFont = (element: HTMLElement): string => {
  const computed = window.getComputedStyle(element);
  return `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
};

/**
 * Measure text width using canvas for accurate measurement
 * @param text - Text to measure
 * @param font - CSS font string (e.g., '14px Inter', 'bold 16px Inter', 'italic 14px Inter')
 * @param waitForFonts - Whether to wait for fonts to load before measuring (default: false)
 * @returns Text width in pixels
 */
export const measureTextWidth = (text: string, font: string, waitForFonts = false): number | Promise<number> => {
  if (!text) return 0;
  
  const cacheKey = getCacheKey(text, font);
  if (textWidthCache.has(cacheKey)) {
    return textWidthCache.get(cacheKey)!;
  }
  
  const context = getCanvasContext();
  if (!context) return 0;
  
  const measure = () => {
    context.font = font;
    const width = context.measureText(text).width;
    clearCacheIfNeeded();
    textWidthCache.set(cacheKey, width);
    return width;
  };
  
  if (waitForFonts) {
    return ensureFontsReady().then(measure);
  }
  
  return measure();
};

/**
 * Calculate marquee parameters from pre-measured text width
 */
function calculateMarqueeParams(
  textWidth: number,
  containerWidth: number,
  speed: number
): MarqueeParams {
  if (textWidth <= 0 || containerWidth <= 0 || speed <= 0) {
    return { isLong: false, style: {} };
  }

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
}

/**
 * Calculate marquee parameters for text scrolling (synchronous)
 * @param textOrWidth - Either text string to measure OR pre-measured width in pixels
 * @param containerWidth - Width of container in pixels
 * @param fontSizeOrSpeed - If textOrWidth is string: font size in pixels (default: 14). If textOrWidth is number: scrolling speed in pixels per second (default: 25)
 * @param fontFamily - Font family (default: 'Inter'), only used when textOrWidth is string
 * @param fontWeight - Font weight (default: 'normal'), only used when textOrWidth is string
 * @param fontStyle - Font style (default: 'normal'), only used when textOrWidth is string
 * @param speed - Scrolling speed in pixels per second (default: 25), only used when textOrWidth is string
 * @returns Marquee parameters object
 */
export function getMarqueeParams(
  text: string,
  containerWidth: number,
  fontSize?: number,
  fontFamily?: string,
  fontWeight?: string,
  fontStyle?: string,
  speed?: number
): MarqueeParams;
export function getMarqueeParams(
  textWidth: number,
  containerWidth: number,
  fontSizeOrSpeed?: number
): MarqueeParams;
export function getMarqueeParams(
  textOrWidth: string | number,
  containerWidth: number,
  fontSizeOrSpeed?: number,
  fontFamily?: string,
  fontWeight?: string,
  fontStyle?: string,
  speed?: number
): MarqueeParams {
  // If first arg is string, measure it
  if (typeof textOrWidth === 'string') {
    const fontSize = fontSizeOrSpeed ?? 14;
    const font = fontFamily ?? 'Inter';
    const weight = fontWeight ?? 'normal';
    const style = fontStyle ?? 'normal';
    const scrollSpeed = speed ?? DEFAULT_SPEED;
    const fontStr = `${style} ${weight} ${fontSize}px ${font}`;
    const textWidth = measureTextWidth(textOrWidth, fontStr, false) as number;
    return calculateMarqueeParams(textWidth, containerWidth, scrollSpeed);
  }

  // Original behavior with pre-measured width
  const textWidth = textOrWidth;
  const scrollSpeed = fontSizeOrSpeed ?? DEFAULT_SPEED;
  return calculateMarqueeParams(textWidth, containerWidth, scrollSpeed);
}

/**
 * Calculate marquee parameters for text scrolling (asynchronous, waits for fonts)
 * @param text - Text to measure
 * @param containerWidth - Width of container in pixels
 * @param fontSize - Font size in pixels (default: 14)
 * @param fontFamily - Font family (default: 'Inter')
 * @param fontWeight - Font weight (default: 'normal')
 * @param fontStyle - Font style (default: 'normal')
 * @param speed - Scrolling speed in pixels per second (default: 25)
 * @returns Marquee parameters object
 */
export async function getMarqueeParamsAsync(
  text: string,
  containerWidth: number,
  fontSize = 14,
  fontFamily = 'Inter',
  fontWeight = 'normal',
  fontStyle = 'normal',
  speed = DEFAULT_SPEED
): Promise<MarqueeParams> {
  const fontStr = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  const textWidth = await measureTextWidth(text, fontStr, true);
  return calculateMarqueeParams(textWidth, containerWidth, speed);
}
