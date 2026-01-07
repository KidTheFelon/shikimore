export interface ShikiDate {
  year?: number;
  month?: number;
  day?: number;
  date?: string;
}

export interface Genre {
  id: number;
  name: string;
  russian?: string;
  kind?: string;
}

export interface Studio {
  id: number;
  name: string;
  image_url?: string;
}

export interface Publisher {
  id: number;
  name: string;
}

export interface ExternalLink {
  id?: number;
  kind: string;
  url: string;
  created_at?: string;
  updated_at?: string;
}

export interface Person {
  id: number;
  name: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  is_seyu?: boolean;
  is_mangaka?: boolean;
  is_producer?: boolean;
  website?: string;
}

export interface PersonRole {
  id: number;
  roles_ru?: string[];
  roles_en?: string[];
  person: Person;
}

export interface Character {
  id: number;
  name: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  description?: string;
  is_anime?: boolean;
  is_manga?: boolean;
  is_ranobe?: boolean;
}

export interface CharacterRole {
  id: number;
  roles_ru?: string[];
  roles_en?: string[];
  character: Character;
}

export interface Poster {
  main?: string;
  original?: string;
  preview?: string;
  x96?: string;
  x48?: string;
}

export interface RelatedAnime {
  id?: number;
  name?: string;
  russian?: string;
  image?: Poster;
}

export interface RelatedManga {
  id?: number;
  name?: string;
  russian?: string;
  image?: Poster;
}

export interface Related {
  id: number;
  anime?: RelatedAnime;
  manga?: RelatedManga;
  relation_kind: string;
  relation_text?: string;
}

export interface Video {
  id: number;
  url?: string;
  name?: string;
  kind?: string;
  player_url?: string;
  image_url?: string;
}

export interface Screenshot {
  id: number;
  original_url?: string;
  x166_url?: string;
  x332_url?: string;
}

export interface ScoreStat {
  score: number;
  count: number;
}

export interface StatusStat {
  status: string;
  count: number;
}

export interface Anime {
  id: number;
  title: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  score?: number;
  kind?: string;
  status?: string;
  episodes?: number;
  episodes_aired?: number;
}

export interface Manga {
  id: number;
  title: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  score?: number;
  kind?: string;
  status?: string;
  volumes?: number;
  chapters?: number;
}

export interface AnimeDetail {
  id: number;
  mal_id?: number;
  title: string;
  russian?: string;
  license_name_ru?: string;
  english?: string;
  japanese?: string;
  synonyms?: string[];
  url?: string;
  poster_url?: string;
  description?: string;
  description_html?: string;
  description_source?: string;
  score?: number;
  kind?: string;
  rating?: string;
  status?: string;
  episodes?: number;
  episodes_aired?: number;
  duration?: number;
  aired_on?: ShikiDate;
  released_on?: ShikiDate;
  season?: string;
  next_episode_at?: string;
  is_censored?: boolean;
  genres?: Genre[];
  studios?: Studio[];
  external_links?: ExternalLink[];
  person_roles?: PersonRole[];
  character_roles?: CharacterRole[];
  related?: Related[];
  videos?: Video[];
  screenshots?: Screenshot[];
  scores_stats?: ScoreStat[];
  statuses_stats?: StatusStat[];
  fansubbers?: string[];
  fandubbers?: string[];
  licensors?: string[];
}

export interface MangaDetail {
  id: number;
  mal_id?: number;
  title: string;
  russian?: string;
  license_name_ru?: string;
  english?: string;
  japanese?: string;
  synonyms?: string[];
  url?: string;
  poster_url?: string;
  description?: string;
  description_html?: string;
  description_source?: string;
  score?: number;
  kind?: string;
  status?: string;
  volumes?: number;
  chapters?: number;
  aired_on?: ShikiDate;
  released_on?: ShikiDate;
  is_censored?: boolean;
  genres?: Genre[];
  publishers?: Publisher[];
  external_links?: ExternalLink[];
  person_roles?: PersonRole[];
  character_roles?: CharacterRole[];
  related?: Related[];
  scores_stats?: ScoreStat[];
  statuses_stats?: StatusStat[];
  licensors?: string[];
}

export interface CharacterDetail {
  id: number;
  name: string;
  russian?: string;
  japanese?: string;
  synonyms: string[];
  url?: string;
  poster_url?: string;
  description?: string;
  description_html?: string;
  character_roles: CharacterRoleDetail[];
  seyus: Person[];
}

export interface CharacterRoleDetail {
  id: number;
  roles_ru: string[];
  anime?: Anime;
  manga?: Manga;
}

export type ContentItem = Anime | Manga | Character | Person;

export interface SearchResult<T> {
  items: T[];
  page: number;
  limit: number;
}

export type ContentType = "anime" | "manga" | "characters" | "people";
export type SortOption = "relevance" | "score" | "title";

export interface ApiError {
  kind: "validation" | "http" | "graphql" | "rate_limit" | "api" | "serialization" | "not_found";
  message: string;
  retry_after?: number;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  nsfw: boolean;
  accent_color: string;
  preferred_language: 'russian' | 'original';
  view_mode: 'grid' | 'list';
  autostart: boolean;
  tray: boolean;
}
