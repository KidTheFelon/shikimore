import type { ContentItem, ContentType, Anime, Manga, Character, Person } from "../types";

export const getItemType = (item: ContentItem): ContentType => {
  const isAnime = "episodes" in item;
  const isManga = ("volumes" in item || "chapters" in item) && !isAnime;
  const isCharacter = "name" in item && !isAnime && !isManga && (("is_anime" in item) || ("is_manga" in item) || ("is_ranobe" in item));
  
  if (isAnime) return "anime";
  if (isManga) return "manga";
  if (isCharacter) return "characters";
  return "people";
};


// Type guards for different content types
export const isAnime = (item: ContentItem): item is Anime => 
  "episodes" in item;

export const isManga = (item: ContentItem): item is Manga => 
  ("volumes" in item || "chapters" in item) && !isAnime(item);

export const isCharacter = (item: ContentItem): item is Character => 
  "name" in item && !isAnime(item) && !isManga(item) && (("is_anime" in item) || ("is_manga" in item) || ("is_ranobe" in item));

export const isPerson = (item: ContentItem): item is Person => 
  !isAnime(item) && !isManga(item) && !isCharacter(item);

// Safe getters with proper typing
export const getItemTitle = (item: ContentItem): string => {
  if (isCharacter(item) || isPerson(item)) return item.name;
  return item.title;
};

export const getItemRussian = (item: ContentItem): string | undefined => {
  return item.russian;
};

export const getItemKind = (item: ContentItem): string | undefined => {
  if (isAnime(item) || isManga(item)) return item.kind;
  return undefined;
};

export const getItemStatus = (item: ContentItem): string | undefined => {
  if (isAnime(item) || isManga(item)) return item.status;
  return undefined;
};

export const getItemScore = (item: ContentItem): number | undefined => {
  if (isAnime(item) || isManga(item)) return item.score;
  return undefined;
};

export const getItemDescription = (item: ContentItem): string | undefined => {
  if (isCharacter(item)) return item.description;
  return undefined;
};

export const getItemUrl = (item: ContentItem): string | undefined => {
  return item.url;
};

export const getItemPosterUrl = (item: ContentItem): string | undefined => {
  return item.poster_url;
};

// Anime specific getters
export const getAnimeEpisodes = (item: ContentItem): number | undefined => {
  return isAnime(item) ? item.episodes : undefined;
};

export const getAnimeEpisodesAired = (item: ContentItem): number | undefined => {
  return isAnime(item) ? item.episodes_aired : undefined;
};

// Manga specific getters  
export const getMangaVolumes = (item: ContentItem): number | undefined => {
  return isManga(item) ? item.volumes : undefined;
};

export const getMangaChapters = (item: ContentItem): number | undefined => {
  return isManga(item) ? item.chapters : undefined;
};

// Person specific getters
