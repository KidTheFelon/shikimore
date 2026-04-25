// Scroll constants
export const BASE_SCROLL_AMOUNT = 600;
export const ARROW_THRESHOLD = 10;
export const CACHE_UPDATE_DELAY = 1000;
export const SEPARATOR_CLASS = 'relatedSeparator';

// UI constants
export const VIDEO_PLACEHOLDER = 'https://avatars.mds.yandex.net/i?id=b8e25ffd85e46dd0f06d3535996da216_l-8193383-images-thumbs&n=13';

// User rate status options
export const STATUS_OPTIONS = [
  { value: 'watching', label: 'Смотрю' },
  { value: 'completed', label: 'Просмотрено' },
  { value: 'on_hold', label: 'На паузе' },
  { value: 'dropped', label: 'Брошено' },
  { value: 'planned', label: 'В планах' },
  { value: 'rewatching', label: 'Пересматриваю' },
] as const;

export const MANGA_STATUS_OPTIONS = [
  { value: 'watching', label: 'Читаю' },
  { value: 'completed', label: 'Прочитано' },
  { value: 'on_hold', label: 'На паузе' },
  { value: 'dropped', label: 'Брошено' },
  { value: 'planned', label: 'В планах' },
] as const;

// Status labels and colors
export const STATUS_LABELS: Record<string, string> = {
  watching: 'Смотрю',
  completed: 'Просмотрено',
  planned: 'В планах',
  on_hold: 'На паузе',
  dropped: 'Брошено'
} as const;

export const STATUS_COLORS: Record<string, string> = {
  watching: '#4ade80',
  completed: '#60a5fa',
  planned: '#fbbf24',
  on_hold: '#f97316',
  dropped: '#ef4444'
} as const;
