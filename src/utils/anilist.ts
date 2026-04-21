import type { VoiceActor, Poster } from "../types";

const ANILIST_API = "https://graphql.anilist.co";

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
