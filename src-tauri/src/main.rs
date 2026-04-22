// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod logger;

use serde::{Deserialize, Serialize};
use shikicrate::{ShikicrateClient, ShikicrateError};
use reqwest;
use image;
use log::{info, error, warn, debug};
use std::sync::Arc;

// Singleton client state
struct AppState {
    client: Arc<ShikicrateClient>,
}

impl AppState {
    fn new() -> Result<Self, ApiError> {
        let client = ShikicrateClient::new()
            .map_err(|e| ApiError::from(e))?;
        Ok(Self {
            client: Arc::new(client),
        })
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ApiError {
    kind: String,
    message: String,
    retry_after: Option<u64>,
    details: Option<serde_json::Value>,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.kind, self.message)
    }
}

impl std::error::Error for ApiError {}

impl From<ShikicrateError> for ApiError {
    fn from(err: ShikicrateError) -> Self {
        match err {
            ShikicrateError::Validation(msg) => ApiError {
                kind: "validation".to_string(),
                message: msg,
                retry_after: None,
                details: None,
            },
            ShikicrateError::Http(e) => {
                let mut details = serde_json::json!({});
                if let Some(status) = e.status() {
                    details["status"] = serde_json::json!(status.as_u16());
                }
                if let Some(url) = e.url() {
                    details["url"] = serde_json::json!(url.to_string());
                }
                ApiError {
                    kind: "http".to_string(),
                    message: format!("Ошибка сети: {}", e),
                    retry_after: None,
                    details: if details.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
                        Some(details)
                    } else {
                        None
                    },
                }
            }
            ShikicrateError::GraphQL { message, errors } => ApiError {
                kind: "graphql".to_string(),
                message,
                retry_after: None,
                details: errors,
            },
            ShikicrateError::RateLimit { message, retry_after } => ApiError {
                kind: "rate_limit".to_string(),
                message,
                retry_after,
                details: Some(serde_json::json!({ "retry_after": retry_after })),
            },
            ShikicrateError::Api { status, message } => ApiError {
                kind: "api".to_string(),
                message: format!("HTTP {}: {}", status, message),
                retry_after: None,
                details: Some(serde_json::json!({ "status": status })),
            },
            ShikicrateError::Serialization(e) => ApiError {
                kind: "serialization".to_string(),
                message: format!("Ошибка сериализации: {}", e),
                retry_after: None,
                details: Some(serde_json::json!({ "classification": format!("{:?}", e.classify()) })),
            },
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct Anime {
    id: i64,
    title: String,
    russian: Option<String>,
    url: Option<String>,
    poster_url: Option<String>,
    score: Option<f64>,
    kind: Option<String>,
    status: Option<String>,
    episodes: Option<i32>,
    episodes_aired: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Manga {
    id: i64,
    title: String,
    russian: Option<String>,
    url: Option<String>,
    poster_url: Option<String>,
    score: Option<f64>,
    kind: Option<String>,
    status: Option<String>,
    volumes: Option<i32>,
    chapters: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Character {
    id: i64,
    name: String,
    russian: Option<String>,
    url: Option<String>,
    poster_url: Option<String>,
    description: Option<String>,
    is_anime: Option<bool>,
    is_manga: Option<bool>,
    is_ranobe: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CharacterDetail {
    id: i64,
    name: String,
    russian: Option<String>,
    japanese: Option<String>,
    synonyms: Vec<String>,
    url: Option<String>,
    poster_url: Option<String>,
    description: Option<String>,
    description_html: Option<String>,
    character_roles: Vec<CharacterRoleDetail>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CharacterRoleDetail {
    id: i64,
    roles_ru: Vec<String>,
    anime: Option<Anime>,
    manga: Option<Manga>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Person {
    id: i64,
    name: String,
    russian: Option<String>,
    url: Option<String>,
    poster_url: Option<String>,
    is_seyu: Option<bool>,
    is_mangaka: Option<bool>,
    is_producer: Option<bool>,
    website: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SearchResult<T> {
    items: Vec<T>,
    page: u32,
    limit: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct Date {
    year: Option<i32>,
    month: Option<i32>,
    day: Option<i32>,
    date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Genre {
    id: i64,
    name: String,
    russian: Option<String>,
    kind: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Studio {
    id: i64,
    name: String,
    image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Publisher {
    id: i64,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExternalLink {
    id: Option<i64>,
    kind: String,
    url: String,
    created_at: Option<String>,
    updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PersonRole {
    id: i64,
    roles_ru: Option<Vec<String>>,
    roles_en: Option<Vec<String>>,
    person: Person,
}

#[derive(Debug, Serialize, Deserialize)]
struct CharacterRole {
    id: i64,
    roles_ru: Option<Vec<String>>,
    roles_en: Option<Vec<String>>,
    character: Character,
}

#[derive(Debug, Serialize, Deserialize)]
struct Poster {
    main: Option<String>,
    original: Option<String>,
    preview: Option<String>,
    x96: Option<String>,
    x48: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RelatedAnime {
    id: Option<i64>,
    name: Option<String>,
    russian: Option<String>,
    image: Option<Poster>,
    aired_on: Option<Date>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RelatedManga {
    id: Option<i64>,
    name: Option<String>,
    russian: Option<String>,
    image: Option<Poster>,
    aired_on: Option<Date>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Related {
    id: i64,
    anime: Option<RelatedAnime>,
    manga: Option<RelatedManga>,
    relation_kind: String,
    relation_text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Video {
    id: i64,
    url: Option<String>,
    name: Option<String>,
    kind: Option<String>,
    player_url: Option<String>,
    image_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Screenshot {
    id: i64,
    original_url: Option<String>,
    x166_url: Option<String>,
    x332_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ScoreStat {
    score: i32,
    count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct StatusStat {
    status: String,
    count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnimeDetail {
    id: i64,
    mal_id: Option<i64>,
    title: String,
    russian: Option<String>,
    license_name_ru: Option<String>,
    english: Option<String>,
    japanese: Option<String>,
    synonyms: Option<Vec<String>>,
    url: Option<String>,
    poster_url: Option<String>,
    description: Option<String>,
    description_html: Option<String>,
    description_source: Option<String>,
    score: Option<f64>,
    kind: Option<String>,
    rating: Option<String>,
    status: Option<String>,
    episodes: Option<i32>,
    episodes_aired: Option<i32>,
    duration: Option<i32>,
    aired_on: Option<Date>,
    released_on: Option<Date>,
    season: Option<String>,
    next_episode_at: Option<String>,
    is_censored: Option<bool>,
    genres: Option<Vec<Genre>>,
    studios: Option<Vec<Studio>>,
    external_links: Option<Vec<ExternalLink>>,
    person_roles: Option<Vec<PersonRole>>,
    character_roles: Option<Vec<CharacterRole>>,
    related: Option<Vec<Related>>,
    videos: Option<Vec<Video>>,
    screenshots: Option<Vec<Screenshot>>,
    scores_stats: Option<Vec<ScoreStat>>,
    statuses_stats: Option<Vec<StatusStat>>,
    fansubbers: Option<Vec<String>>,
    fandubbers: Option<Vec<String>>,
    licensors: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MangaDetail {
    id: i64,
    mal_id: Option<i64>,
    title: String,
    russian: Option<String>,
    license_name_ru: Option<String>,
    english: Option<String>,
    japanese: Option<String>,
    synonyms: Option<Vec<String>>,
    url: Option<String>,
    poster_url: Option<String>,
    description: Option<String>,
    description_html: Option<String>,
    description_source: Option<String>,
    score: Option<f64>,
    kind: Option<String>,
    status: Option<String>,
    volumes: Option<i32>,
    chapters: Option<i32>,
    aired_on: Option<Date>,
    released_on: Option<Date>,
    is_censored: Option<bool>,
    genres: Option<Vec<Genre>>,
    publishers: Option<Vec<Publisher>>,
    external_links: Option<Vec<ExternalLink>>,
    person_roles: Option<Vec<PersonRole>>,
    character_roles: Option<Vec<CharacterRole>>,
    related: Option<Vec<Related>>,
    scores_stats: Option<Vec<ScoreStat>>,
    statuses_stats: Option<Vec<StatusStat>>,
    licensors: Option<Vec<String>>,
}


#[tauri::command]
async fn search_anime(
    state: tauri::State<'_, AppState>,
    query: String,
    page: Option<u32>,
    limit: Option<u32>,
    kind: Option<String>,
    genres: Option<String>,
    order: Option<String>,
) -> Result<SearchResult<Anime>, ApiError> {
    debug!("[Backend] search_anime вызвана: query='{}', page={:?}, limit={:?}, kind={:?}, genres={:?}", query, page, limit, kind, genres);
    
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);
    let client = &state.client;

    use shikicrate::queries::AnimeSearchParams;
    
    let params = AnimeSearchParams {
        search: if query.is_empty() { None } else { Some(query.clone()) },
        ids: None,
        limit: Some(limit as i32),
        page: Some(page as i32),
        kind: kind.clone(),
        censored: None,
        genre: genres.clone(),
        order: order.clone(),
        rating: None,
        season: None,
        studio: None,
        status: None,
    };

    debug!("[Backend] AnimeSearchParams: genre = {:?}", params.genre);
    
    debug!("[Backend] Выполнение запроса к API...");
    let animes = match client.animes(params).await {
        Ok(a) => {
            debug!("[Backend] Получено {} аниме", a.len());
            a
        },
        Err(e) => {
            error!("[Backend] Ошибка запроса аниме: {:?}", e);
            let api_err = ApiError::from(e);
            error!("[Backend] Преобразованная ошибка: kind={}, message={}", api_err.kind, api_err.message);
            return Err(api_err);
        }
    };
    
    debug!("[Backend] Преобразование данных...");
    let anime_list: Vec<Anime> = animes
        .into_iter()
        .map(|a| Anime {
            id: a.id,
            title: a.name,
            russian: a.russian,
            url: a.url.or_else(|| Some(format!("https://shikimori.io/animes/{}", a.id))),
            poster_url: a.poster.and_then(|p| p.main_url),
            score: a.score,
            kind: a.kind,
            status: a.status,
            episodes: a.episodes,
            episodes_aired: a.episodes_aired,
        })
        .collect();
    
    debug!("[Backend] Возврат результата: {} элементов", anime_list.len());
    Ok(SearchResult {
        items: anime_list,
        page,
        limit,
    })
}

#[tauri::command]
async fn search_manga(
    state: tauri::State<'_, AppState>,
    query: String,
    page: Option<u32>,
    limit: Option<u32>,
    kind: Option<String>,
    genres: Option<String>,
    order: Option<String>,
) -> Result<SearchResult<Manga>, ApiError> {
    debug!("[Backend] search_manga вызвана: query='{}', page={:?}, limit={:?}, kind={:?}, genres={:?}", query, page, limit, kind, genres);

    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);
    let client = &state.client;

    use shikicrate::queries::MangaSearchParams;
    
    let params = MangaSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        ids: None,
        limit: Some(limit as i32),
        page: Some(page as i32),
        kind: kind.clone(),
        censored: None,
        genre: genres.clone(),
        order: order.clone(),
        publisher: None,
        status: None,
    };

    debug!("[Backend] Выполнение запроса к API...");
    let mangas = match client.mangas(params).await {
        Ok(m) => {
            debug!("[Backend] Получено {} манги", m.len());
            m
        },
        Err(e) => {
            error!("[Backend] Ошибка запроса манги: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    let manga_list: Vec<Manga> = mangas
        .into_iter()
        .map(|m| Manga {
            id: m.id,
            title: m.name,
            russian: m.russian,
            url: m.url.or_else(|| Some(format!("https://shikimori.io/mangas/{}", m.id))),
            poster_url: m.poster.and_then(|p| p.main_url),
            score: m.score,
            kind: m.kind,
            status: m.status,
            volumes: m.volumes,
            chapters: m.chapters,
        })
        .collect();

    debug!("[Backend] Возврат результата: {} элементов", manga_list.len());
    Ok(SearchResult {
        items: manga_list,
        page,
        limit,
    })
}

#[tauri::command]
async fn search_characters(
    state: tauri::State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
    ids: Option<Vec<String>>,
) -> Result<SearchResult<Character>, ApiError> {
    debug!("[Backend] search_characters вызвана: page={:?}, limit={:?}, ids={:?}", page, limit, ids);

    let client = &state.client;

    use shikicrate::queries::CharacterSearchParams;
    
    if let Some(ids) = ids {
        debug!("[Backend] Поиск по ID: {} персонажей", ids.len());
        let params = CharacterSearchParams {
            page: None,
            limit: None,
            ids: Some(ids),
            search: None,
        };

        let characters = match client.characters(params).await {
            Ok(c) => {
                debug!("[Backend] Получено {} персонажей по ID", c.len());
                c
            },
            Err(e) => {
                error!("[Backend] Ошибка поиска персонажей по ID: {:?}", e);
                return Err(ApiError::from(e));
            }
        };
        
        let character_list: Vec<Character> = characters
            .into_iter()
            .map(|c| Character {
                id: c.id,
                name: c.name,
                russian: c.russian,
                url: c.url.or_else(|| Some(format!("https://shikimori.io/characters/{}", c.id))),
                poster_url: c.poster.and_then(|p| p.main_url),
                description: c.description,
                is_anime: c.is_anime,
                is_manga: c.is_manga,
                is_ranobe: c.is_ranobe,
            })
            .collect();
        
        let list_len = character_list.len() as u32;
        
        return Ok(SearchResult {
            items: character_list,
            page: 1,
            limit: list_len,
        });
    }
    
    let page_val = page.unwrap_or(1);
    let limit_val = limit.unwrap_or(20);

    debug!("[Backend] Поиск по странице: page={}, limit={}", page_val, limit_val);
    let params = CharacterSearchParams {
        page: Some(page_val as i32),
        limit: Some(limit_val as i32),
        ids: None,
        search: None,
    };

    let characters = match client.characters(params).await {
        Ok(c) => {
            debug!("[Backend] Получено {} персонажей (страница {})", c.len(), page_val);
            c
        },
        Err(e) => {
            error!("[Backend] Ошибка поиска персонажей: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    let character_list: Vec<Character> = characters
        .into_iter()
        .map(|c| Character {
            id: c.id,
            name: c.name,
            russian: c.russian,
            url: c.url.or_else(|| Some(format!("https://shikimori.io/characters/{}", c.id))),
            poster_url: c.poster.and_then(|p| p.main_url),
            description: c.description,
            is_anime: c.is_anime,
            is_manga: c.is_manga,
            is_ranobe: c.is_ranobe,
        })
        .collect();

    debug!("[Backend] Возврат результата: {} персонажей", character_list.len());
    Ok(SearchResult {
        items: character_list,
        page: page_val,
        limit: limit_val,
    })
}

#[tauri::command]
async fn get_character_details(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<CharacterDetail, ApiError> {
    debug!("[Backend] Вызов get_character_details (ID: {})", id);

    let client = &state.client;

    debug!("[Backend] Поиск персонажа по ID через API...");
    let character = match client.character_detail(id).await {
        Ok(Some(c)) => {
            debug!("[Backend] Персонаж найден: {}", c.name);
            c
        },
        Ok(None) => {
            warn!("[Backend] Персонаж с ID {} не найден", id);
            return Err(ApiError {
                kind: "not_found".to_string(),
                message: "Персонаж не найден".to_string(),
                retry_after: None,
                details: Some(serde_json::json!({ "id": id })),
            });
        }
        Err(e) => {
            error!("[Backend] Ошибка API при получении деталей персонажа: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
        
    Ok(CharacterDetail {
        id: character.id,
        name: character.name,
        russian: character.russian,
        japanese: character.japanese,
        synonyms: character.synonyms.unwrap_or_default(),
        url: character.url,
        poster_url: character.poster.and_then(|p| p.original_url),
        description: character.description,
        description_html: character.description_html,
        character_roles: Vec::new(), // В GraphQL Shikimori пока нет поля roles для персонажа
    })
}

#[tauri::command]
async fn search_people(
    state: tauri::State<'_, AppState>,
    query: String,
    limit: Option<u32>,
) -> Result<SearchResult<Person>, ApiError> {
    debug!("[Backend] search_people вызвана: query='{}', limit={:?}", query, limit);

    let limit = limit.unwrap_or(20);
    let client = &state.client;

    use shikicrate::queries::PeopleSearchParams;
    
    let params = PeopleSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        limit: Some(limit as i32),
    };

    debug!("[Backend] Выполнение запроса к API...");
    let people = match client.people(params).await {
        Ok(p) => {
            debug!("[Backend] Получено {} людей", p.len());
            p
        },
        Err(e) => {
            error!("[Backend] Ошибка запроса людей: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    let person_list: Vec<Person> = people
        .into_iter()
        .map(|p| Person {
            id: p.id,
            name: p.name,
            russian: p.russian,
            url: p.url.or_else(|| Some(format!("https://shikimori.io/people/{}", p.id))),
            poster_url: p.poster.and_then(|p| p.main_url),
            is_seyu: p.is_seyu,
            is_mangaka: p.is_mangaka,
            is_producer: p.is_producer,
            website: p.website,
        })
        .collect();

    debug!("[Backend] Возврат результата: {} людей", person_list.len());
    Ok(SearchResult {
        items: person_list,
        page: 1,
        limit,
    })
}

fn convert_date(date: Option<shikicrate::types::Date>) -> Option<Date> {
    date.map(|d| Date {
        year: d.year,
        month: d.month,
        day: d.day,
        date: d.date,
    })
}

fn convert_genre(genre: shikicrate::types::Genre) -> Genre {
    Genre {
        id: genre.id,
        name: genre.name,
        russian: genre.russian,
        kind: genre.kind,
    }
}

fn convert_studio(studio: shikicrate::types::Studio) -> Studio {
    Studio {
        id: studio.id,
        name: studio.name,
        image_url: studio.image_url,
    }
}

fn convert_publisher(publisher: shikicrate::types::Publisher) -> Publisher {
    Publisher {
        id: publisher.id,
        name: publisher.name,
    }
}

fn convert_external_link(link: shikicrate::types::ExternalLink) -> ExternalLink {
    ExternalLink {
        id: link.id,
        kind: link.kind,
        url: link.url,
        created_at: link.created_at,
        updated_at: link.updated_at,
    }
}

fn convert_person_role(role: shikicrate::types::PersonRole) -> PersonRole {
    PersonRole {
        id: role.id,
        roles_ru: role.roles_ru,
        roles_en: role.roles_en,
        person: Person {
            id: role.person.id,
            name: role.person.name,
            russian: role.person.russian,
            url: Some(format!("https://shikimori.io/people/{}", role.person.id)),
            poster_url: role.person.poster.and_then(|p| p.main_url),
            is_seyu: None,
            is_mangaka: None,
            is_producer: None,
            website: None,
        },
    }
}

fn convert_character_role(role: shikicrate::types::CharacterRole) -> CharacterRole {
    let char_data = role.character.unwrap_or(shikicrate::types::Character {
        id: 0,
        name: "Unknown".to_string(),
        russian: None,
        poster: None,
    });
    
    CharacterRole {
        id: role.id,
        roles_ru: role.roles_ru,
        roles_en: role.roles_en,
        character: Character {
            id: char_data.id,
            name: char_data.name,
            russian: char_data.russian,
            url: Some(format!("https://shikimori.io/characters/{}", char_data.id)),
            poster_url: char_data.poster.and_then(|p| p.main_url),
            description: None,
            is_anime: None,
            is_manga: None,
            is_ranobe: None,
        },
    }
}

fn fix_url(url: Option<String>) -> Option<String> {
    url.map(|u| {
        if u.starts_with('/') {
            format!("https://shikimori.io{}", u)
        } else {
            u
        }
    })
}

fn convert_poster(poster: shikicrate::types::Poster) -> Poster {
    let main = fix_url(poster.main_url);
    let preview = fix_url(poster.preview_url).or_else(|| main.clone());
    
    Poster {
        main,
        original: fix_url(poster.original_url),
        preview,
        x96: fix_url(poster.x96_url),
        x48: fix_url(poster.x48_url),
    }
}

fn convert_related(related: shikicrate::types::Related) -> Related {
    Related {
        id: related.id,
        anime: related.anime.map(|a| RelatedAnime {
            id: a.id,
            name: a.name,
            russian: a.russian,
            image: a.poster.map(convert_poster),
            aired_on: convert_date(a.aired_on),
        }),
        manga: related.manga.map(|m| RelatedManga {
            id: m.id,
            name: m.name,
            russian: m.russian,
            image: m.poster.map(convert_poster),
            aired_on: convert_date(m.aired_on),
        }),
        relation_kind: related.relation_kind,
        relation_text: related.relation_text,
    }
}

fn convert_video(video: shikicrate::types::Video) -> Video {
    Video {
        id: video.id,
        url: video.url,
        name: video.name,
        kind: video.kind,
        player_url: video.player_url,
        image_url: video.image_url,
    }
}

fn convert_screenshot(screenshot: shikicrate::types::Screenshot) -> Screenshot {
    Screenshot {
        id: screenshot.id,
        original_url: screenshot.original_url,
        x166_url: screenshot.x166_url,
        x332_url: screenshot.x332_url,
    }
}

fn convert_score_stat(stat: shikicrate::types::ScoreStat) -> ScoreStat {
    ScoreStat {
        score: stat.score,
        count: stat.count,
    }
}

fn convert_status_stat(stat: shikicrate::types::StatusStat) -> StatusStat {
    StatusStat {
        status: stat.status,
        count: stat.count,
    }
}

#[tauri::command]
async fn get_anime_by_id(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<AnimeDetail, ApiError> {
    let client = &state.client;

    // Используем выделенный метод для получения деталей
    debug!("[Backend] Поиск аниме по ID через API...");
    let anime = match client.anime_detail(id).await {
        Ok(Some(a)) => a,
        Ok(None) => {
            warn!("[Backend] Аниме с ID {} не найдено", id);
            return Err(ApiError {
                kind: "not_found".to_string(),
                message: format!("Аниме с ID {} не найдено.", id),
                retry_after: None,
                details: Some(serde_json::json!({ "id": id })),
            });
        }
        Err(e) => {
            error!("[Backend] Ошибка API при получении деталей аниме: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    debug!("[Backend] Аниме найдено: {}. Преобразование данных...", anime.name);
    Ok(AnimeDetail {
        id: anime.id,
        mal_id: anime.mal_id,
        title: anime.name,
        russian: anime.russian,
        license_name_ru: anime.license_name_ru,
        english: anime.english,
        japanese: anime.japanese,
        synonyms: anime.synonyms,
        url: anime.url.or_else(|| Some(format!("https://shikimori.io/animes/{}", anime.id))),
        poster_url: anime.poster.and_then(|p| p.main_url),
        description: anime.description,
        description_html: anime.description_html,
        description_source: anime.description_source,
        score: anime.score,
        kind: anime.kind,
        rating: anime.rating,
        status: anime.status,
        episodes: anime.episodes,
        episodes_aired: anime.episodes_aired,
        duration: anime.duration,
        aired_on: convert_date(anime.aired_on),
        released_on: convert_date(anime.released_on),
        season: anime.season,
        next_episode_at: anime.next_episode_at,
        is_censored: anime.is_censored,
        genres: anime.genres.map(|g| g.into_iter().map(convert_genre).collect()),
        studios: anime.studios.map(|s| s.into_iter().map(convert_studio).collect()),
        external_links: anime.external_links.map(|l| l.into_iter().map(convert_external_link).collect()),
        person_roles: anime.person_roles.map(|r| r.into_iter().map(convert_person_role).collect()),
        character_roles: anime.character_roles.map(|r| r.into_iter().map(convert_character_role).collect()),
        related: anime.related.map(|r| r.into_iter().map(convert_related).collect()),
        videos: anime.videos.map(|v| v.into_iter().map(convert_video).collect()),
        screenshots: anime.screenshots.map(|s| s.into_iter().map(convert_screenshot).collect()),
        scores_stats: anime.scores_stats.map(|s| s.into_iter().map(convert_score_stat).collect()),
        statuses_stats: anime.statuses_stats.map(|s| s.into_iter().map(convert_status_stat).collect()),
        fansubbers: anime.fansubbers,
        fandubbers: anime.fandubbers,
        licensors: anime.licensors,
    })
}

#[tauri::command]
async fn get_manga_by_id(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<MangaDetail, ApiError> {
    let client = &state.client;

    // Используем выделенный метод для получения деталей
    debug!("[Backend] Поиск манги по ID через API...");
    let manga = match client.manga_detail(id).await {
        Ok(Some(m)) => m,
        Ok(None) => {
            warn!("[Backend] Манга с ID {} не найдена", id);
            return Err(ApiError {
                kind: "not_found".to_string(),
                message: format!("Манга с ID {} не найдена.", id),
                retry_after: None,
                details: Some(serde_json::json!({ "id": id })),
            });
        }
        Err(e) => {
            error!("[Backend] Ошибка API при получении деталей манги: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    debug!("[Backend] Манга найдена: {}. Преобразование данных...", manga.name);
    Ok(MangaDetail {
        id: manga.id,
        mal_id: manga.mal_id,
        title: manga.name,
        russian: manga.russian,
        license_name_ru: manga.license_name_ru,
        english: manga.english,
        japanese: manga.japanese,
        synonyms: manga.synonyms,
        url: manga.url.or_else(|| Some(format!("https://shikimori.io/mangas/{}", manga.id))),
        poster_url: manga.poster.and_then(|p| p.main_url),
        description: manga.description,
        description_html: manga.description_html,
        description_source: manga.description_source,
        score: manga.score,
        kind: manga.kind,
        status: manga.status,
        volumes: manga.volumes,
        chapters: manga.chapters,
        aired_on: convert_date(manga.aired_on),
        released_on: convert_date(manga.released_on),
        is_censored: manga.is_censored,
        genres: manga.genres.map(|g| g.into_iter().map(convert_genre).collect()),
        publishers: manga.publishers.map(|p| p.into_iter().map(convert_publisher).collect()),
        external_links: manga.external_links.map(|l| l.into_iter().map(convert_external_link).collect()),
        person_roles: manga.person_roles.map(|r| r.into_iter().map(convert_person_role).collect()),
        character_roles: manga.character_roles.map(|r| r.into_iter().map(convert_character_role).collect()),
        related: manga.related.map(|r| r.into_iter().map(convert_related).collect()),
        scores_stats: manga.scores_stats.map(|s| s.into_iter().map(convert_score_stat).collect()),
        statuses_stats: manga.statuses_stats.map(|s| s.into_iter().map(convert_status_stat).collect()),
        licensors: manga.licensors,
    })
}

#[tauri::command]
async fn get_similar_anime(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<Vec<shikicrate::SimilarAnime>, ApiError> {
    let client = &state.client;

    let similar = client.similar_anime(id).await.map_err(ApiError::from)?;

    debug!("[Backend] Получено {} похожих аниме", similar.len());

    Ok(similar)
}

#[tauri::command]
async fn get_related_anime(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<Vec<shikicrate::Related>, ApiError> {
    let client = &state.client;

    let related = client.related_anime(id).await.map_err(ApiError::from)?;

    debug!("[Backend] Получено {} связанных аниме", related.len());

    Ok(related)
}

#[tauri::command]
async fn get_related_manga(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<Vec<shikicrate::Related>, ApiError> {
    let client = &state.client;

    let related = client.related_manga(id).await.map_err(ApiError::from)?;

    debug!("[Backend] Получено {} связанных манги", related.len());

    Ok(related)
}

#[tauri::command]
async fn get_accent_color(url: String) -> Result<String, String> {
    debug!("[Backend] get_accent_color вызвана: url='{}'", url);

    // Try to use preview/x48 version for better performance
    let optimized_url = url
        .replace("/original/", "/x48/")
        .replace("/preview/", "/x48/");

    let bytes = match reqwest::get(&optimized_url).await {
        Ok(resp) => match resp.bytes().await {
            Ok(b) => {
                debug!("[Backend] Загружено {} байт изображения", b.len());
                b
            },
            Err(e) => {
                error!("[Backend] Ошибка чтения байтов: {}", e);
                return Err(e.to_string());
            }
        },
        Err(e) => {
            error!("[Backend] Ошибка загрузки изображения: {}", e);
            return Err(e.to_string());
        }
    };

    let img = match image::load_from_memory(&bytes) {
        Ok(i) => i,
        Err(e) => {
            error!("[Backend] Ошибка загрузки изображения из памяти: {}", e);
            return Err(e.to_string());
        }
    };
    let img = img.thumbnail(10, 10);
    let rgb = img.to_rgb8();

    let mut r: u32 = 0;
    let mut g: u32 = 0;
    let mut b: u32 = 0;
    let mut count: u32 = 0;

    for pixel in rgb.pixels() {
        let brightness = (pixel[0] as f32 * 0.299 + pixel[1] as f32 * 0.587 + pixel[2] as f32 * 0.114) as f32;
        if brightness > 30.0 && brightness < 220.0 {
            r += pixel[0] as u32;
            g += pixel[1] as u32;
            b += pixel[2] as u32;
            count += 1;
        }
    }

    if count == 0 {
        debug!("[Backend] Не найдено подходящих пикселей, используем дефолтный цвет");
        return Ok("rgba(180, 160, 120, 0.9)".to_string());
    }

    let factor = 0.8;
    let color = format!(
        "rgba({}, {}, {}, 0.9)",
        ((r / count) as f32 * factor) as u8,
        ((g / count) as f32 * factor) as u8,
        ((b / count) as f32 * factor) as u8
    );
    debug!("[Backend] Вычислен акцентный цвет: {}", color);
    Ok(color)
}

#[tauri::command]
async fn fetch_anilist_media_info(name: String, media_type: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let query = r#"
        query ($search: String, $type: MediaType) {
          Page(page: 1, perPage: 1) {
            media(search: $search, type: $type) {
              id
              title {
                romaji
                english
                native
              }
              startDate {
                year
              }
              status
            }
          }
        }
    "#;

    let response = client
        .post("https://graphql.anilist.co")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&serde_json::json!({
            "query": query,
            "variables": {
                "search": name,
                "type": media_type
            }
        }))
        .send()
        .await
        .map_err(|e| format!("AniList request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("AniList API error: {}", response.status()));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse AniList response: {}", e))?;

    Ok(json)
}

fn main() {
    if let Err(e) = logger::init_logger() {
        eprintln!("Failed to initialize logger: {}", e);
    }
    info!("Запуск приложения Shikimore...");

    let app_state = match AppState::new() {
        Ok(state) => {
            info!("HTTP клиент инициализирован");
            state
        },
        Err(e) => {
            error!("Не удалось инициализировать HTTP клиент: {}", e);
            std::process::exit(1);
        }
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            search_anime,
            search_manga,
            search_characters,
            search_people,
            get_anime_by_id,
            get_manga_by_id,
            get_character_details,
            get_accent_color,
            get_similar_anime,
            get_related_anime,
            get_related_manga,
            fetch_anilist_media_info,
            logger::log_message
        ])
        .setup(|_app| {
            info!("Tauri приложение инициализировано");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
