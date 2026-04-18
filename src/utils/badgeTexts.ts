// Status translations
export const STATUS_TEXTS: Record<string, string> = {
  anons: "Анонс",
  ongoing: "Онгоинг",
  released: "Вышел",
};

// Kind translations
export const KIND_TEXTS: Record<string, string> = {
  tv: "ТВ",
  movie: "Фильм",
  ova: "OVA",
  ona: "ONA",
  special: "Спешл",
  music: "Музыка",
  tv_13: "ТВ-13",
  tv_24: "ТВ-24",
  tv_48: "ТВ-48",
  manga: "Манга",
  manhwa: "Манхва",
  manhua: "Маньхуа",
  novel: "Ранобэ",
  one_shot: "Ваншот",
  doujin: "Додзинси",
};

// Person role translations
export const ROLE_TEXTS = {
  is_seyu: "Сэйю",
  is_mangaka: "Мангака",
  is_producer: "Продюсер",
} as const;

// InfoChip labels
export const INFO_CHIP_LABELS = {
  dates: "Даты",
  studios: "Студии",
  publishers: "Издательства",
  episode: "Серия",
  synonyms: "Синонимы",
  unknown_date: "Дата неизвестна",
} as const;

// Helper functions
export const getStatusText = (status?: string): string | null => {
  return status ? STATUS_TEXTS[status] || status : null;
};

export const getKindText = (kind?: string): string | null => {
  return kind ? KIND_TEXTS[kind] || kind.toUpperCase() : null;
};

export const getPersonRoles = (person: { is_seyu?: boolean; is_mangaka?: boolean; is_producer?: boolean }): string[] => {
  const roles: string[] = [];
  if (person.is_seyu) roles.push(ROLE_TEXTS.is_seyu);
  if (person.is_mangaka) roles.push(ROLE_TEXTS.is_mangaka);
  if (person.is_producer) roles.push(ROLE_TEXTS.is_producer);
  return roles;
};

// Character and Staff role translations
export const ROLE_TRANSLATIONS: Record<string, string> = {
  // Персонажи
  Main: "Главный",
  Supporting: "Второстепенный",
  // Персонал
  Producer: "Продюсер",
  Director: "Режиссёр",
  "Original Creator": "Автор оригинала",
  Music: "Композитор",
  "Character Design": "Дизайнер персонажей",
  "Series Composition": "Сценарист",
  "Animation Director": "Режиссёр анимации",
  Script: "Сценарий",
  Editing: "Монтаж",
  "Sound Director": "Звукорежиссёр",
  "Art Director": "Арт-директор",
  "Key Animation": "Ключевая анимация",
  "Background Art": "Художник-постановщик",
  Storyboard: "Раскадровка",
  "Color Design": "Цветовой дизайн",
  "Theme Song Performance": "Исполнение темы",
  "Theme Song Arrangement": "Аранжировка темы",
  "Theme Song Composition": "Композиция темы",
  "Theme Song Lyrics": "Текст темы",
  "Chief Animation Director": "Шеф-режиссёр анимации",
  "Executive Producer": "Исполнительный продюсер",
  "Associate Producer": "Ассоциированный продюсер",
  "Assistant Director": "Помощник режиссёра",
  "Music Producer": "Музыкальный продюсер",
  "Sound Effects": "Звуковые эффекты",
  "Director of Photography": "Оператор-постановщик",
  "Digital Art": "Цифровая графика",
  "3D Director": "3D-режиссёр",
  "In-Between Animation": "Промежуточная анимация",
  Planning: "Планирование",
  "Color Setting": "Работа с цветом",
};

// Helper functions for InfoChip labels
export const getInfoChipLabel = (key: keyof typeof INFO_CHIP_LABELS): string => {
  return INFO_CHIP_LABELS[key];
};

// Helper function for role translations
export const translateRole = (role: string): string => {
  return ROLE_TRANSLATIONS[role] || role;
};
