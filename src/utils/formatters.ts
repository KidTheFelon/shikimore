/**
 * Утилиты для форматирования данных с Shikimori
 */

export const formatStatus = (status?: string): string | null => {
  const statuses: Record<string, string> = {
    anons: "Анонсировано",
    ongoing: "Онгоинг",
    released: "Выпущено",
  };
  return status ? statuses[status] || status : null;
};

export const formatKind = (kind?: string): string | null => {
  const kinds: Record<string, string> = {
    tv: "ТВ",
    movie: "Фильм",
    ova: "OVA",
    ona: "ONA",
    special: "Спешл",
    tv_special: "ТВ-спешл",
    music: "Клип",
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
  return kind ? kinds[kind] || kind.toUpperCase() : null;
};

export const formatRating = (rating?: string): string | null => {
  const ratings: Record<string, string> = {
    none: "Без рейтинга",
    g: "G",
    pg: "PG",
    pg_13: "PG-13",
    r: "R-17",
    r_plus: "R+",
    rx: "Rx",
  };
  return rating ? ratings[rating] || rating.toUpperCase() : null;
};

export const formatRelationKind = (kind: string): string => {
  const relations: Record<string, string> = {
    sequel: "Сиквел",
    prequel: "Приквел",
    alternative: "Альтернатива",
    side_story: "Побочная история",
    parent_story: "Основная история",
    summary: "Рекап",
    adaptation: "Адаптация",
    spin_off: "Спин-офф",
    character: "Персонаж",
    other: "Другое",
    full_story: "Полная история",
    alternative_setting: "Альтернативный сеттинг",
    alternative_version: "Альтернативная версия",
  };
  return relations[kind] || kind;
};

export const translateRole = (role: string): string => {
  const roles: Record<string, string> = {
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
    "Planning": "Планирование",
    "Color Setting": "Работа с цветом",
  };
  return roles[role] || role;
};

/**
 * Регулировка яркости цвета (HEX)
 */
export const adjustColor = (hex: string, amt: number): string => {
  let usePound = false;
  if (hex[0] === "#") {
    hex = hex.slice(1);
    usePound = true;
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255; else if (r < 0) r = 0;
  let g = ((num >> 8) & 0x00FF) + amt;
  if (g > 255) g = 255; else if (g < 0) g = 0;
  let b = (num & 0x0000FF) + amt;
  if (b > 255) b = 255; else if (b < 0) b = 0;
  return (usePound ? "#" : "") + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
};

export const formatDate = (date?: string | { year?: number; month?: number; day?: number; date?: string }): string | null => {
  if (!date) return null;
  
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString("ru-RU", { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  if (date.date) {
    return new Date(date.date).toLocaleDateString("ru-RU", { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  if (date.year) {
    const parts = [];
    if (date.day) parts.push(date.day);
    if (date.month) {
      const monthNames = [
        "января", "февраля", "марта", "апреля", "мая", "июня",
        "июля", "августа", "сентября", "октября", "ноября", "декабря"
      ];
      parts.push(monthNames[date.month - 1]);
    }
    parts.push(date.year);
    return parts.join(" ");
  }

  return null;
};
