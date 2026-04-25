export interface ApiError {
  kind: "validation" | "http" | "graphql" | "rate_limit" | "api" | "serialization" | "not_found";
  message: string;
  retry_after?: number;
  details?: unknown;
}

export interface Date {
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

export interface PersonRole {
  id: number;
  roles_ru?: string[];
  roles_en?: string[];
  person: Person;
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
  aired_on?: Date;
}

export interface RelatedManga {
  id?: number;
  name?: string;
  russian?: string;
  image?: Poster;
  aired_on?: Date;
}

export interface SimilarAnime {
  id?: number;
  name?: string;
  russian?: string;
  kind?: string;
  status?: string;
  image?: SimilarAnimeImage;
}

export interface SimilarAnimeImage {
  original?: string;
  preview?: string;
  x48?: string;
  x96?: string;
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
  aired_on?: Date;
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
  aired_on?: Date;
  released_on?: Date;
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
  aired_on?: Date;
  released_on?: Date;
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
  voice_actors?: VoiceActor[];
}

// AniList types
export interface VoiceActor {
  id: number;
  name: {
    first?: string;
    last?: string;
    full: string;
    native?: string;
  };
  language: string;
  image: {
    large?: string;
    medium?: string;
  };
  url?: string;
}

export interface CharacterRoleDetail {
  id: number;
  roles_ru: string[];
  anime?: Anime;
  manga?: Manga;
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

export type ContentItem = Anime | Manga | Character | Person;
export type ContentType = "anime" | "manga" | "characters" | "people" | "profile" | "user_rates";
export type SortOption =
  | "relevance"
  | "score"
  | "title"
  | "id"
  | "popularity"
  | "aired_on"
  | "episodes"
  | "status"
  | "random"
  | "created_at"
  | "updated_at";

export interface SearchResult<T> {
  items: T[];
  page: number;
  limit: number;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// OAuth types
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  created_at: number;
  expires_in: number;
  token_type: string;
}

export interface UserInfo {
  id: number;
  nickname: string;
  avatar?: string;
  image?: UserImage;
  url: string;
  rates_anime_stats?: UserStats;
  rates_manga_stats?: UserStats;
  gender?: string;
  age?: number;
  website?: string;
  about?: string;
  show_comments?: boolean;
}

export interface UserStats {
  completed: number;
  dropped: number;
  on_hold: number;
  planned: number;
  watching: number;
}

export interface UserRate {
  id: number;
  score?: string;
  status: string;
  text?: string;
  text_html?: string;
  rewatches?: number;
  episodes?: number;
  volumes?: number;
  chapters?: number;
  anime?: Anime;
  manga?: Manga;
}

// Simplified version for API responses without nested objects
export interface UserRateSimple {
  id: number;
  score?: string;
  status: string;
  text?: string;
  text_html?: string;
  rewatches?: number;
  episodes?: number;
  volumes?: number;
  chapters?: number;
}

export interface UserImage {
  original?: string;
  preview?: string;
  x160?: string;
  x80?: string;
  x48?: string;
}

export interface CreateUserRateRequest {
  user_id: number;
  target_id: number;
  target_type: string;
  score?: string;
  status?: string;
  episodes?: string;
  chapters?: string;
  volumes?: string;
  rewatches?: string;
  text?: string;
}

export interface UpdateUserRateRequest {
  score?: string;
  status?: string;
  episodes?: string;
  chapters?: string;
  volumes?: string;
  rewatches?: string;
  text?: string;
}
