import { invoke } from "@tauri-apps/api/core";
import type { VoiceActor, Poster } from "../types";

const ANILIST_API = "https://graphql.anilist.co";

// Simple in-memory cache for AniList results
const anilistCache = new Map<string, AniListMediaInfo>();

export interface AniListAnime {
  id: number;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    large?: string;
    medium?: string;
    extraLarge?: string;
  };
  bannerImage?: string;
  description?: string;
  averageScore?: number;
  genres?: string[];
  studios?: {
    nodes: Array<{
      name: string;
    }>;
  };
}

export interface AniListAnimeResponse {
  data: {
    Media: AniListAnime;
  };
}

export interface AniListMediaYearResponse {
  data: {
    Media: {
      id: number;
      startDate: {
        year?: number;
      };
      status?: string;
    };
  };
}

export async function fetchMediaYear(mediaId: number, type: "ANIME" | "MANGA"): Promise<number | null> {
  const query = `
    query ($id: Int, $type: MediaType) {
      Media(id: $id, type: $type) {
        id
        startDate {
          year
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { id: mediaId, type },
      }),
    });

    if (!response.ok) {
      console.error("AniList API error:", response.status);
      return null;
    }

    const json: AniListMediaYearResponse = await response.json();

    if (!json.data?.Media) {
      return null;
    }

    return json.data.Media.startDate.year || null;
  } catch (error) {
    console.error("Error fetching media year from AniList:", error);
    return null;
  }
}

export interface AniListMediaInfo {
  year: number | null;
  status: string | null;
}

export async function fetchMediaInfoByName(name: string, type: "ANIME" | "MANGA"): Promise<AniListMediaInfo> {
  const cacheKey = `${name}:${type}`;
  
  // Check cache first
  if (anilistCache.has(cacheKey)) {
    return anilistCache.get(cacheKey)!;
  }

  try {
    const json = await invoke<Record<string, any>>("fetch_anilist_media_info", {
      name,
      mediaType: type,
    });

    if (!json?.data?.Page?.media?.[0]) {
      const result = { year: null, status: null };
      anilistCache.set(cacheKey, result);
      return result;
    }

    const media = json.data.Page.media[0];
    const result = {
      year: media.startDate.year || null,
      status: media.status || null,
    };
    
    // Cache the result
    anilistCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Error fetching media info from AniList by name:", error);
    const result = { year: null, status: null };
    anilistCache.set(cacheKey, result);
    return result;
  }
}

export async function fetchAnimeDetails(animeId: number): Promise<AniListAnime | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
          extraLarge
        }
        bannerImage
        description
        averageScore
        genres
        studios {
          nodes {
            name
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { id: animeId },
      }),
    });

    if (!response.ok) {
      console.error("AniList API error:", response.status);
      return null;
    }

    const json: AniListAnimeResponse = await response.json();

    if (!json.data?.Media) {
      return null;
    }

    return json.data.Media;
  } catch (error) {
    console.error("Error fetching anime details from AniList:", error);
    return null;
  }
}

export function convertAniListPoster(aniListAnime: AniListAnime): Poster {
  return {
    main: aniListAnime.coverImage.large || aniListAnime.coverImage.extraLarge || aniListAnime.coverImage.medium,
    original: aniListAnime.coverImage.extraLarge || aniListAnime.coverImage.large,
    preview: aniListAnime.coverImage.medium,
  };
}

export function translateLanguage(language: string): string {
  const normalized = language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();
  const translations: Record<string, string> = {
    "Japanese": "Японский",
    "English": "Английский",
    "Korean": "Корейский",
    "Spanish": "Испанский",
    "French": "Французский",
    "German": "Немецкий",
    "Portuguese": "Португальский",
    "Italian": "Итальянский",
    "Chinese": "Китайский",
    "Thai": "Тайский",
    "Tagalog": "Тагальский",
    "Vietnamese": "Вьетнамский",
    "Hindi": "Хинди",
    "Arabic": "Арабский",
    "Turkish": "Турецкий",
    "Polish": "Польский",
    "Russian": "Русский",
  };
  return translations[normalized] || language;
}

export interface AniListCharacterResponse {
  data: {
    Character: {
      id: number;
      name: {
        first?: string;
        last?: string;
        full: string;
        native?: string;
      };
      media: {
        edges: Array<{
          node: {
            id: number;
            title: {
              romaji: string;
              english?: string;
              native?: string;
            };
            type: "ANIME" | "MANGA";
          };
          voiceActors: Array<{
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
            siteUrl?: string;
          }>;
        }>;
      };
    };
  };
}

export async function fetchVoiceActors(characterName: string): Promise<VoiceActor[]> {
  const query = `
    query ($search: String) {
      Character(search: $search) {
        id
        name {
          first
          last
          full
          native
        }
        media {
          edges {
            node {
              id
              title {
                romaji
                english
                native
              }
              type
            }
            voiceActors {
              id
              name {
                first
                last
                full
                native
              }
              language
              image {
                large
                medium
              }
              siteUrl
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { search: characterName },
      }),
    });

    if (!response.ok) {
      throw new Error(`AniList API error: ${response.status}`);
    }

    const json: AniListCharacterResponse = await response.json();
    
    if (!json.data?.Character) {
      return [];
    }
    
    // Собираем всех уникальных сейю
    const voiceActorsMap = new Map<number, VoiceActor>();
    
    json.data.Character.media.edges.forEach(edge => {
      edge.voiceActors.forEach(va => {
        if (!voiceActorsMap.has(va.id)) {
          voiceActorsMap.set(va.id, {
            id: va.id,
            name: va.name,
            language: va.language,
            image: va.image,
            url: va.siteUrl,
          });
        }
      });
    });

    return Array.from(voiceActorsMap.values());
  } catch (error) {
    console.error("Error fetching voice actors from AniList:", error);
    return [];
  }
}
