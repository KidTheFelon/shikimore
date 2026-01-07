// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// Временно отключено для отладки
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Mutex, OnceLock};
use std::collections::HashMap;
use std::time::Duration;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use shikicrate::{ShikicrateClient, ShikicrateError};

static ACCENT_CACHE: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub theme: String,             // "dark", "light", "system"
    pub nsfw: bool,
    pub accent_color: String,
    pub preferred_language: String, // "russian", "original"
    pub view_mode: String,          // "grid", "list"
    pub autostart: bool,
    pub tray: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            nsfw: false,
            accent_color: "#646cff".to_string(),
            preferred_language: "russian".to_string(),
            view_mode: "grid".to_string(),
            autostart: false,
            tray: false,
        }
    }
}

fn get_config_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = app_handle.path().app_config_dir().map_err(|e| format!("Failed to get config dir: {}", e))?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }
    Ok(path.join("config.json"))
}

#[tauri::command]
fn get_settings(app_handle: tauri::AppHandle) -> AppSettings {
    match get_config_path(&app_handle) {
        Ok(path) => {
            if path.exists() {
                let content = fs::read_to_string(path).unwrap_or_default();
                serde_json::from_str(&content).unwrap_or_else(|_| AppSettings::default())
            } else {
                AppSettings::default()
            }
        },
        Err(e) => {
            eprintln!("Error getting config path: {}", e);
            AppSettings::default()
        }
    }
}

#[tauri::command]
fn update_settings(app_handle: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = get_config_path(&app_handle)?;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| format!("Failed to write config: {}", e))?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ApiError {
    kind: String,
    message: String,
    retry_after: Option<u64>,
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
            },
            ShikicrateError::Http(e) => ApiError {
                kind: "http".to_string(),
                message: format!("Ошибка сети: {}", e),
                retry_after: None,
            },
            ShikicrateError::GraphQL { message, .. } => ApiError {
                kind: "graphql".to_string(),
                message,
                retry_after: None,
            },
            ShikicrateError::RateLimit { message, retry_after } => ApiError {
                kind: "rate_limit".to_string(),
                message,
                retry_after,
            },
            ShikicrateError::Api { status, message } => ApiError {
                kind: "api".to_string(),
                message: format!("HTTP {}: {}", status, message),
                retry_after: None,
            },
            ShikicrateError::Serialization(e) => ApiError {
                kind: "serialization".to_string(),
                message: format!("Ошибка сериализации: {}", e),
                retry_after: None,
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
    seyus: Vec<Person>,
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
}

#[derive(Debug, Serialize, Deserialize)]
struct RelatedManga {
    id: Option<i64>,
    name: Option<String>,
    russian: Option<String>,
    image: Option<Poster>,
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

// REST API structures for character details
#[derive(Debug, Deserialize)]
struct RestImage {
    original: Option<String>,
    #[allow(dead_code)]
    preview: Option<String>,
    #[allow(dead_code)]
    x96: Option<String>,
    #[allow(dead_code)]
    x48: Option<String>,
}

fn deser_id<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let v: serde_json::Value = serde::Deserialize::deserialize(deserializer)?;
    match v {
        serde_json::Value::Number(n) => n.as_i64().ok_or_else(|| serde::de::Error::custom("Invalid ID number")),
        serde_json::Value::String(s) => s.parse().map_err(serde::de::Error::custom),
        _ => Err(serde::de::Error::custom("Expected ID as number or string")),
    }
}

fn deser_score<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let v: Option<serde_json::Value> = serde::Deserialize::deserialize(deserializer)?;
    match v {
        Some(serde_json::Value::Number(n)) => Ok(n.as_f64()),
        Some(serde_json::Value::String(s)) => {
            if s.is_empty() || s == "0.0" || s == "0" {
                Ok(None)
            } else {
                s.parse::<f64>().map(Some).map_err(serde::de::Error::custom)
            }
        }
        _ => Ok(None),
    }
}

#[derive(Debug, Deserialize)]
struct RestSeyu {
    #[serde(deserialize_with = "deser_id")]
    id: i64,
    name: Option<String>,
    russian: Option<String>,
    image: Option<RestImage>,
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RestAnime {
    #[serde(deserialize_with = "deser_id")]
    id: i64,
    name: Option<String>,
    russian: Option<String>,
    image: Option<RestImage>,
    url: Option<String>,
    kind: Option<String>,
    #[serde(deserialize_with = "deser_score")]
    score: Option<f64>,
    status: Option<String>,
    episodes: Option<i32>,
    episodes_aired: Option<i32>,
    #[serde(default)]
    roles: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct RestManga {
    #[serde(deserialize_with = "deser_id")]
    id: i64,
    name: Option<String>,
    russian: Option<String>,
    image: Option<RestImage>,
    url: Option<String>,
    kind: Option<String>,
    #[serde(deserialize_with = "deser_score")]
    score: Option<f64>,
    status: Option<String>,
    volumes: Option<i32>,
    chapters: Option<i32>,
    #[serde(default)]
    roles: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct RestCharacter {
    #[serde(deserialize_with = "deser_id")]
    id: i64,
    name: Option<String>,
    russian: Option<String>,
    japanese: Option<String>,
    altname: Option<String>,
    image: Option<RestImage>,
    url: Option<String>,
    description: Option<String>,
    description_html: Option<String>,
    #[allow(dead_code)]
    description_source: Option<String>,
    #[serde(default)]
    seyu: Vec<RestSeyu>,
    #[serde(default)]
    animes: Vec<RestAnime>,
    #[serde(default)]
    mangas: Vec<RestManga>,
}



#[tauri::command]
async fn search_anime(
    app_handle: tauri::AppHandle,
    query: String,
    ids: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
    kind: Option<String>,
    status: Option<String>,
    season: Option<String>,
    rating: Option<String>,
    genre: Option<String>,
    studio: Option<String>,
    order: Option<String>,
) -> Result<SearchResult<Anime>, ApiError> {
    println!(">>> [Backend] search_anime вызвана: query='{}', ids={:?}, page={:?}, limit={:?}, kind={:?}, status={:?}, studio={:?}, order={:?}", query, ids, page, limit, kind, status, studio, order);
    
    let settings = get_settings(app_handle);
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);

    println!(">>> [Backend] Создание клиента...");
    let client = match ShikicrateClient::new() {
        Ok(c) => {
            println!(">>> [Backend] Клиент создан успешно");
            c
        },
        Err(e) => {
            println!(">>> [Backend] Ошибка создания клиента: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    use shikicrate::queries::AnimeSearchParams;
    
    let params = AnimeSearchParams {
        search: if query.is_empty() { None } else { Some(query.clone()) },
        ids,
        limit: Some(limit as i32),
        page: Some(page as i32),
        kind,
        status,
        season,
        rating,
        genre,
        studio,
        order,
        censored: Some(!settings.nsfw),
    };
    
    println!(">>> [Backend] Выполнение запроса к API...");
    let animes = match client.animes(params).await {
        Ok(a) => {
            println!(">>> [Backend] Получено {} аниме", a.len());
            a
        },
        Err(e) => {
            println!(">>> [Backend] Ошибка запроса аниме: {:?}", e);
            let api_err = ApiError::from(e);
            println!(">>> [Backend] Преобразованная ошибка: kind={}, message={}", api_err.kind, api_err.message);
            return Err(api_err);
        }
    };
    
    println!(">>> [Backend] Преобразование данных...");
    let anime_list: Vec<Anime> = animes
        .into_iter()
        .map(|a| Anime {
            id: a.id,
            title: a.name,
            russian: a.russian,
            url: a.url.or_else(|| Some(format!("https://shikimori.one/animes/{}", a.id))),
            poster_url: a.poster.and_then(|p| p.main_url),
            score: a.score,
            kind: a.kind,
            status: a.status,
            episodes: a.episodes,
            episodes_aired: a.episodes_aired,
        })
        .collect();
    
    println!(">>> [Backend] Возврат результата: {} элементов", anime_list.len());
    Ok(SearchResult {
        items: anime_list,
        page,
        limit,
    })
}

#[tauri::command]
async fn search_anime_lite(
    app_handle: tauri::AppHandle,
    query: String,
    kind: Option<String>,
    status: Option<String>,
    genre: Option<String>,
    studio: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<Anime>, ApiError> {
    let settings = get_settings(app_handle);
    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    let limit = limit.unwrap_or(50);
    
    use shikicrate::queries::AnimeSearchParams;
    let params = AnimeSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        ids: None,
        limit: Some(limit as i32),
        page: Some(1),
        kind,
        status,
        genre,
        studio,
        censored: Some(!settings.nsfw),
        ..Default::default()
    };
    
    let animes = client.animes_lite(params).await.map_err(ApiError::from)?;
    Ok(animes.into_iter().map(|a| Anime {
        id: a.id,
        title: a.name,
        russian: a.russian,
        url: None,
        poster_url: None,
        score: None,
        kind: None,
        status: None,
        episodes: None,
        episodes_aired: None,
    }).collect())
}

#[tauri::command]
async fn search_manga(
    app_handle: tauri::AppHandle,
    query: String,
    ids: Option<String>,
    page: Option<u32>,
    limit: Option<u32>,
    kind: Option<String>,
    status: Option<String>,
    genre: Option<String>,
    publisher: Option<String>,
    order: Option<String>,
) -> Result<SearchResult<Manga>, ApiError> {
    let settings = get_settings(app_handle);
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);

    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    
    use shikicrate::queries::MangaSearchParams;
    
    let params = MangaSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        ids,
        limit: Some(limit as i32),
        page: Some(page as i32),
        kind,
        status,
        genre,
        publisher,
        order,
        censored: Some(!settings.nsfw),
    };
    
    let mangas = client.mangas(params).await.map_err(ApiError::from)?;
    
    let manga_list: Vec<Manga> = mangas
        .into_iter()
        .map(|m| Manga {
            id: m.id,
            title: m.name,
            russian: m.russian,
            url: m.url.or_else(|| Some(format!("https://shikimori.one/mangas/{}", m.id))),
            poster_url: m.poster.and_then(|p| p.main_url),
            score: m.score,
            kind: m.kind,
            status: m.status,
            volumes: m.volumes,
            chapters: m.chapters,
        })
        .collect();
    
    Ok(SearchResult {
        items: manga_list,
        page,
        limit,
    })
}

#[tauri::command]
async fn search_characters(
    query: String,
    page: Option<u32>,
    limit: Option<u32>,
    ids: Option<Vec<String>>,
) -> Result<SearchResult<Character>, ApiError> {
    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    
    use shikicrate::queries::CharacterSearchParams;
    
    if let Some(ids) = ids {
        let params = CharacterSearchParams {
            search: None,
            page: None,
            limit: None,
            ids: Some(ids),
        };
        
        let characters = client.characters(params).await.map_err(ApiError::from)?;
        
        let character_list: Vec<Character> = characters
            .into_iter()
            .map(|c| Character {
                id: c.id,
                name: c.name,
                russian: c.russian,
                url: c.url.or_else(|| Some(format!("https://shikimori.one/characters/{}", c.id))),
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
    
    let params = CharacterSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        page: Some(page_val as i32),
        limit: Some(limit_val as i32),
        ids: None,
    };
    
    let characters = client.characters(params).await.map_err(ApiError::from)?;
    
    let character_list: Vec<Character> = characters
        .into_iter()
        .map(|c| Character {
            id: c.id,
            name: c.name,
            russian: c.russian,
            url: c.url.or_else(|| Some(format!("https://shikimori.one/characters/{}", c.id))),
            poster_url: c.poster.and_then(|p| p.main_url),
            description: c.description,
            is_anime: c.is_anime,
            is_manga: c.is_manga,
            is_ranobe: c.is_ranobe,
        })
        .collect();
    
    Ok(SearchResult {
        items: character_list,
        page: page_val,
        limit: limit_val,
    })
}

#[tauri::command]
async fn get_character_details(id: i64) -> Result<CharacterDetail, ApiError> {
    println!("--- [Backend] Вызов get_character_details REST (ID: {}) ---", id);
    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    
    // Используем REST API для получения полной информации (сейю, аниме, манга) в одном запросе
    let character = client.get_rest::<RestCharacter, ()>(&format!("characters/{}", id), None)
        .await
        .map_err(ApiError::from)?;
        
    let mut roles = Vec::new();
    
    // Мапим аниме роли
    for a in character.animes {
        roles.push(CharacterRoleDetail {
            id: a.id,
            roles_ru: a.roles,
            anime: Some(Anime {
                id: a.id,
                title: a.name.unwrap_or_else(|| "Unknown".to_string()),
                russian: a.russian,
                url: fix_url(a.url),
                poster_url: a.image.and_then(|img| fix_url(img.original)),
                score: a.score,
                kind: a.kind,
                status: a.status,
                episodes: a.episodes,
                episodes_aired: a.episodes_aired,
            }),
            manga: None,
        });
    }
    
    // Мапим манга роли
    for m in character.mangas {
        roles.push(CharacterRoleDetail {
            id: m.id,
            roles_ru: m.roles,
            anime: None,
            manga: Some(Manga {
                id: m.id,
                title: m.name.unwrap_or_else(|| "Unknown".to_string()),
                russian: m.russian,
                url: fix_url(m.url),
                poster_url: m.image.and_then(|img| fix_url(img.original)),
                score: m.score,
                kind: m.kind,
                status: m.status,
                volumes: m.volumes,
                chapters: m.chapters,
            }),
        });
    }

    Ok(CharacterDetail {
        id: character.id,
        name: character.name.unwrap_or_else(|| "Unknown".to_string()),
        russian: character.russian,
        japanese: character.japanese,
        synonyms: character.altname
            .map(|s| s.split(", ").map(|item| item.to_string()).collect())
            .unwrap_or_default(),
        url: fix_url(character.url),
        poster_url: character.image.and_then(|img| fix_url(img.original)),
        description: character.description,
        description_html: character.description_html,
        character_roles: roles,
        seyus: character.seyu.into_iter().map(|s| {
            Person {
                id: s.id,
                name: s.name.unwrap_or_else(|| "Unknown".to_string()),
                russian: s.russian,
                url: fix_url(s.url),
                poster_url: s.image.and_then(|img| fix_url(img.original)),
                is_seyu: Some(true),
                is_mangaka: None,
                is_producer: None,
                website: None,
            }
        }).collect(),
    })
}

#[tauri::command]
async fn search_people(
    query: String,
    limit: Option<u32>,
) -> Result<SearchResult<Person>, ApiError> {
    let limit = limit.unwrap_or(20);

    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    
    use shikicrate::queries::PeopleSearchParams;
    
    let params = PeopleSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        limit: Some(limit as i32),
    };
    
    let people = client.people(params).await.map_err(ApiError::from)?;
    
    let person_list: Vec<Person> = people
        .into_iter()
        .map(|p| Person {
            id: p.id,
            name: p.name,
            russian: p.russian,
            url: p.url.or_else(|| Some(format!("https://shikimori.one/people/{}", p.id))),
            poster_url: p.poster.and_then(|p| p.main_url),
            is_seyu: p.is_seyu,
            is_mangaka: p.is_mangaka,
            is_producer: p.is_producer,
            website: p.website,
        })
        .collect();
    
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
            url: Some(format!("https://shikimori.one/people/{}", role.person.id)),
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
            url: Some(format!("https://shikimori.one/characters/{}", char_data.id)),
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
            format!("https://shikimori.one{}", u)
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
        }),
        manga: related.manga.map(|m| RelatedManga {
            id: m.id,
            name: m.name,
            russian: m.russian,
            image: m.poster.map(convert_poster),
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
async fn get_anime_by_id(id: i64) -> Result<AnimeDetail, ApiError> {
    println!("--- [Backend] Вызов get_anime_by_id (ID: {}) ---", id);
    let client = match ShikicrateClient::new() {
        Ok(c) => c,
        Err(e) => {
            println!("[Backend] Ошибка создания клиента: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    // Используем выделенный метод для получения деталей
    println!("[Backend] Поиск аниме по ID через API...");
    let anime = match client.anime_detail(id).await {
        Ok(Some(a)) => a,
        Ok(None) => {
            println!("[Backend] Аниме с ID {} не найдено", id);
            return Err(ApiError {
                kind: "not_found".to_string(),
                message: format!("Аниме с ID {} не найдено.", id),
                retry_after: None,
            });
        }
        Err(e) => {
            println!("[Backend] Ошибка API при получении деталей аниме: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    println!("[Backend] Аниме найдено: {}. Преобразование данных...", anime.name);
    Ok(AnimeDetail {
        id: anime.id,
        mal_id: anime.mal_id,
        title: anime.name,
        russian: anime.russian,
        license_name_ru: anime.license_name_ru,
        english: anime.english,
        japanese: anime.japanese,
        synonyms: anime.synonyms,
        url: anime.url.or_else(|| Some(format!("https://shikimori.one/animes/{}", anime.id))),
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
async fn get_manga_by_id(id: i64) -> Result<MangaDetail, ApiError> {
    println!("--- [Backend] Вызов get_manga_by_id (ID: {}) ---", id);
    let client = match ShikicrateClient::new() {
        Ok(c) => c,
        Err(e) => {
            println!("[Backend] Ошибка создания клиента: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    // Используем выделенный метод для получения деталей
    println!("[Backend] Поиск манги по ID через API...");
    let manga = match client.manga_detail(id).await {
        Ok(Some(m)) => m,
        Ok(None) => {
            println!("[Backend] Манга с ID {} не найдена", id);
            return Err(ApiError {
                kind: "not_found".to_string(),
                message: format!("Манга с ID {} не найдена.", id),
                retry_after: None,
            });
        }
        Err(e) => {
            println!("[Backend] Ошибка API при получении деталей манги: {:?}", e);
            return Err(ApiError::from(e));
        }
    };
    
    println!("[Backend] Манга найдена: {}. Преобразование данных...", manga.name);
    Ok(MangaDetail {
        id: manga.id,
        mal_id: manga.mal_id,
        title: manga.name,
        russian: manga.russian,
        license_name_ru: manga.license_name_ru,
        english: manga.english,
        japanese: manga.japanese,
        synonyms: manga.synonyms,
        url: manga.url.or_else(|| Some(format!("https://shikimori.one/mangas/{}", manga.id))),
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
async fn search_studios(query: String) -> Result<Vec<Studio>, ApiError> {
    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    let studios = client.studios(if query.is_empty() { None } else { Some(query) }).await.map_err(ApiError::from)?;
    Ok(studios.into_iter().map(convert_studio).collect())
}

#[tauri::command]
async fn search_publishers(query: String) -> Result<Vec<Publisher>, ApiError> {
    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    let publishers = client.publishers(if query.is_empty() { None } else { Some(query) }).await.map_err(ApiError::from)?;
    Ok(publishers.into_iter().map(convert_publisher).collect())
}

#[tauri::command]
async fn get_genres() -> Result<Vec<Genre>, ApiError> {
    let client = ShikicrateClient::new().map_err(ApiError::from)?;
    let genres = client.genres().await.map_err(ApiError::from)?;
    Ok(genres.into_iter().map(convert_genre).collect())
}

#[tauri::command]
async fn get_accent_color(url: String) -> Result<String, String> {
    // 1. Проверка кэша
    let cache = ACCENT_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    if let Some(color) = cache.lock().unwrap().get(&url) {
        return Ok(color.clone());
    }

    // 2. Инициализация клиента
    let client = HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .expect("Failed to build HTTP client")
    });

    // 3. Выполнение запроса
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Ошибка сети: {}", e))?;

    // Проверка размера контента (макс 2МБ)
    if let Some(len) = response.content_length() {
        if len > 2 * 1024 * 1024 {
            return Ok("rgba(180, 160, 120, 0.9)".to_string());
        }
    }

    let bytes = response.bytes().await.map_err(|e| format!("Ошибка загрузки: {}", e))?;

    let img = image::load_from_memory(&bytes).map_err(|e| format!("Ошибка декодирования: {}", e))?;
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

    let result_color = if count == 0 {
        "rgba(180, 160, 120, 0.9)".to_string()
    } else {
        let factor = 0.8;
        format!(
            "rgba({}, {}, {}, 0.9)",
            ((r / count) as f32 * factor) as u8,
            ((g / count) as f32 * factor) as u8,
            ((b / count) as f32 * factor) as u8
        )
    };

    // Сохранение в кэш
    cache.lock().unwrap().insert(url, result_color.clone());
    
    Ok(result_color)
}

fn main() {
    println!("Запуск приложения Shikimore...");
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--minimized"])))
        .invoke_handler(tauri::generate_handler![
            search_anime,
            search_anime_lite,
            search_manga,
            search_characters,
            search_people,
            search_studios,
            search_publishers,
            get_genres,
            get_anime_by_id,
            get_manga_by_id,
            get_character_details,
            get_accent_color,
            get_settings,
            update_settings
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app_handle = window.app_handle();
                let settings = get_settings(app_handle.clone());
                if settings.tray {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
        })
        .setup(|app| {
            println!("Tauri приложение инициализировано");
            
            // Настройка системного трея
            use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState};
            use tauri::menu::{Menu, MenuItem};

            let quit_i = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>).unwrap();
            let show_i = MenuItem::with_id(app, "show", "Показать", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&show_i, &quit_i]).unwrap();

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)
                .unwrap();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
