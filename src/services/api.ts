import { invoke } from "@tauri-apps/api/core";
import { 
  Anime, 
  Manga, 
  Character, 
  Person, 
  AnimeDetail, 
  MangaDetail, 
  CharacterDetail, 
  SearchResult, 
  Genre, 
  Studio, 
  Publisher,
  AppSettings,
  ContentType,
  SortOption
} from "../types";

export const api = {
  getSettings: () => invoke<AppSettings>("get_settings"),
  updateSettings: (settings: AppSettings) => invoke<void>("update_settings", { settings }),
  
  getGenres: () => invoke<Genre[]>("get_genres"),
  searchStudios: (query: string) => invoke<Studio[]>("search_studios", { query }),
  searchPublishers: (query: string) => invoke<Publisher[]>("search_publishers", { query }),
  
  getAccentColor: (url: string) => invoke<string>("get_accent_color", { url }),
  
  searchAnime: (params: {
    query: string;
    page?: number;
    limit?: number;
    kind?: string;
    status?: string;
    genre?: string;
    studio?: string;
    order?: SortOption;
  }) => invoke<SearchResult<Anime>>("search_anime", params),
  
  searchManga: (params: {
    query: string;
    page?: number;
    limit?: number;
    kind?: string;
    status?: string;
    genre?: string;
    publisher?: string;
    order?: SortOption;
  }) => invoke<SearchResult<Manga>>("search_manga", params),
  
  searchCharacters: (params: {
    query: string;
    page?: number;
    limit?: number;
    ids?: string[];
  }) => invoke<SearchResult<Character>>("search_characters", params),
  
  searchPeople: (params: {
    query: string;
    limit?: number;
  }) => invoke<SearchResult<Person>>("search_people", params),
  
  getAnimeById: (id: number) => invoke<AnimeDetail>("get_anime_by_id", { id }),
  getMangaById: (id: number) => invoke<MangaDetail>("get_manga_by_id", { id }),
  getCharacterDetails: (id: number) => invoke<CharacterDetail>("get_character_details", { id }),
};
