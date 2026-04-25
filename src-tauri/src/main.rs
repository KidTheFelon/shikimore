// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod logger;
mod text_cache;

use serde::{Deserialize, Serialize};
use shikicrate::{ShikicrateClient, ShikicrateError};
use reqwest;
use image;
use log::{info, error, warn, debug};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::path::PathBuf;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use std::fs;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tauri_plugin_deep_link::DeepLinkExt;
use thiserror::Error;
use base64::Engine;

// Rate limit: 0.5 requests per second (2000ms between requests)
const RATE_LIMIT_DELAY: Duration = Duration::from_millis(2000);

// Rate limit for accent color extraction: 50ms between requests
const ACCENT_COLOR_RATE_LIMIT_DELAY: Duration = Duration::from_millis(50);

// Image cache TTL: 30 days
const IMAGE_CACHE_TTL_SECONDS: i64 = 30 * 24 * 60 * 60;

fn get_env_var(key: &str) -> Result<String, ApiError> {
    std::env::var(key).map_err(|_| ApiError {
        kind: "config".to_string(),
        message: format!("Environment variable {} not set", key),
        retry_after: None,
        details: None,
    })
}

// Singleton client state
struct AppState {
    client: Arc<ShikicrateClient>,
    http_client: Arc<reqwest::Client>,
    last_rest_request: Arc<Mutex<Instant>>,
    last_accent_color_request: Arc<Mutex<Instant>>,
    user_id: Arc<Mutex<Option<i64>>>,
    text_cache: Arc<text_cache::TextCache>,
}

impl AppState {
    fn new() -> Result<Self, ApiError> {
        let client = ShikicrateClient::new()
            .map_err(|e| ApiError::from(e))?;
        
        let http_client = reqwest::Client::builder()
            .user_agent("Shikimore")
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| ApiError {
                kind: "http".to_string(),
                message: format!("Failed to create HTTP client: {}", e),
                retry_after: None,
                details: None,
            })?;
        
        let db_path = text_cache::get_cache_db_path()
            .map_err(|e| ApiError {
                kind: "storage".to_string(),
                message: format!("Failed to get cache db path: {}", e),
                retry_after: None,
                details: None,
            })?;
        
        let text_cache = text_cache::TextCache::new(db_path)
            .map_err(|e| ApiError {
                kind: "storage".to_string(),
                message: format!("Failed to initialize text cache: {}", e),
                retry_after: None,
                details: None,
            })?;
        
        Ok(Self {
            client: Arc::new(client),
            http_client: Arc::new(http_client),
            last_rest_request: Arc::new(Mutex::new(Instant::now() - RATE_LIMIT_DELAY)),
            last_accent_color_request: Arc::new(Mutex::new(Instant::now() - ACCENT_COLOR_RATE_LIMIT_DELAY)),
            user_id: Arc::new(Mutex::new(None)),
            text_cache: Arc::new(text_cache),
        })
    }
}

async fn wait_for_rate_limit(last_request: &Arc<Mutex<Instant>>, delay: Duration) {
    let mut last = last_request.lock().await;
    let elapsed = last.elapsed();
    if elapsed < delay {
        let wait_time = delay - elapsed;
        drop(last);
        tokio::time::sleep(wait_time).await;
        let mut last = last_request.lock().await;
        *last = Instant::now();
    } else {
        *last = Instant::now();
    }
}

async fn get_user_id_cached(
    state: &tauri::State<'_, AppState>
) -> Result<i64, ApiError> {
    // Check cache first
    {
        let cached = state.user_id.lock().await;
        if let Some(id) = *cached {
            return Ok(id);
        }
    }

    // Fetch from API
    let auth_data = load_auth_data()?
        .ok_or_else(|| ApiError {
            kind: "auth".to_string(),
            message: "Not authenticated".to_string(),
            retry_after: None,
            details: None,
        })?;

    let client = state.http_client.clone();
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;

    let response = client
        .get("https://shikimori.one/api/users/whoami")
        .header("User-Agent", "Shikimore")
        .header("Authorization", &format!("Bearer {}", auth_data.access_token))
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to get user info: {}", e),
            retry_after: None,
            details: None,
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        let body = response.text().await.unwrap_or_default();

        if status.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)),
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }

        return Err(ApiError {
            kind: "api".to_string(),
            message: format!("Failed to get user info: {} - {}", status, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
        });
    }

    let user_info: serde_json::Value = response
        .json()
        .await
        .map_err(|e| ApiError {
            kind: "serialization".to_string(),
            message: format!("Failed to parse user info: {}", e),
            retry_after: None,
            details: None,
        })?;

    let user_id = user_info.get("id")
        .and_then(|v| v.as_i64())
        .ok_or_else(|| ApiError {
            kind: "serialization".to_string(),
            message: "Failed to get user id".to_string(),
            retry_after: None,
            details: None,
        })?;

    // Cache the user_id
    {
        let mut cached = state.user_id.lock().await;
        *cached = Some(user_id);
    }

    Ok(user_id)
}

#[derive(Debug, Serialize, Deserialize, Clone, Error)]
#[error("{kind}: {message}")]
struct ApiError {
    kind: String,
    message: String,
    retry_after: Option<u64>,
    details: Option<serde_json::Value>,
}

// OAuth types
#[derive(Debug, Serialize, Deserialize)]
struct OAuthTokenResponse {
    access_token: String,
    refresh_token: String,
    created_at: i64,
    expires_in: i64,
    token_type: String,
}

#[derive(Serialize, Deserialize)]
struct UserInfo {
    id: i64,
    nickname: String,
    avatar: String,
    url: String,
    image: Option<UserImage>,
    rates_anime_stats: Option<UserStats>,
    rates_manga_stats: Option<UserStats>,
    #[serde(rename = "sex")]
    gender: Option<String>,
    #[serde(rename = "full_years")]
    age: Option<i32>,
    #[serde(rename = "website")]
    website: Option<String>,
    #[serde(rename = "about")]
    about: Option<String>,
    #[serde(rename = "show_comments")]
    show_comments: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug)]
struct UserStats {
    completed: i32,
    dropped: i32,
    on_hold: i32,
    planned: i32,
    watching: i32,
}

fn deserialize_score<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::Deserialize;
    
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum ScoreValue {
        String(String),
        Number(i64),
        Float(f64),
    }
    
    let value = Option::<ScoreValue>::deserialize(deserializer)?;
    Ok(value.map(|v| match v {
        ScoreValue::String(s) => s,
        ScoreValue::Number(n) => n.to_string(),
        ScoreValue::Float(f) => f.to_string(),
    }))
}

#[derive(Serialize, Deserialize, Debug)]
struct UserRate {
    id: i64,
    #[serde(deserialize_with = "deserialize_score")]
    score: Option<String>,
    status: String,
    text: Option<String>,
    text_html: Option<String>,
    rewatches: Option<i32>,
    episodes: Option<i32>,
    volumes: Option<i32>,
    chapters: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    anime: Option<Anime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    manga: Option<Manga>,
}

// Simplified UserRate for API responses without nested objects
#[derive(Serialize, Deserialize, Debug)]
struct UserRateSimple {
    id: i64,
    #[serde(deserialize_with = "deserialize_score")]
    score: Option<String>,
    status: String,
    text: Option<String>,
    text_html: Option<String>,
    rewatches: Option<i32>,
    episodes: Option<i32>,
    volumes: Option<i32>,
    chapters: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UserImage {
    original: Option<String>,
    preview: Option<String>,
    x160: Option<String>,
    x80: Option<String>,
    x48: Option<String>,
}

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
struct Date {
    year: Option<i32>,
    month: Option<i32>,
    day: Option<i32>,
    date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Anime {
    id: i64,
    #[serde(alias = "name")]
    title: String,
    russian: Option<String>,
    url: Option<String>,
    poster_url: Option<String>,
    #[serde(deserialize_with = "deserialize_score")]
    score: Option<String>,
    kind: Option<String>,
    status: Option<String>,
    episodes: Option<i32>,
    episodes_aired: Option<i32>,
    aired_on: Option<Date>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Manga {
    id: i64,
    #[serde(alias = "name")]
    title: String,
    russian: Option<String>,
    url: Option<String>,
    poster_url: Option<String>,
    #[serde(deserialize_with = "deserialize_score")]
    score: Option<String>,
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


// OAuth commands
#[tauri::command]
async fn oauth_authorize() -> Result<String, ApiError> {
    let client_id = get_env_var("OAUTH_CLIENT_ID")?;
    let redirect_uri = get_env_var("OAUTH_REDIRECT_URI")?;
    
    let auth_url = format!(
        "https://shikimori.one/oauth/authorize?client_id={}&redirect_uri={}&response_type=code&scope=",
        client_id,
        urlencoding::encode(&redirect_uri)
    );
    
    info!("[OAuth] Authorization URL generated");
    Ok(auth_url)
}

#[tauri::command]
async fn open_oauth_window(app: tauri::AppHandle) -> Result<(), ApiError> {
    let client_id = get_env_var("OAUTH_CLIENT_ID")?;
    let redirect_uri = get_env_var("OAUTH_REDIRECT_URI")?;
    
    let auth_url = format!(
        "https://shikimori.one/oauth/authorize?client_id={}&redirect_uri={}&response_type=code&scope=",
        client_id,
        urlencoding::encode(&redirect_uri)
    );
    
    info!("[OAuth] Opening OAuth window with URL: {}", auth_url);
    
    // Создаём новое окно для OAuth
    tauri::WebviewWindowBuilder::new(
        &app,
        "oauth-window",
        tauri::WebviewUrl::External(auth_url.parse().unwrap())
    )
    .title("Shikimori Authorization")
    .inner_size(800.0, 600.0)
    .resizable(true)
    .build()
    .map_err(|e| ApiError {
        kind: "window".to_string(),
        message: format!("Failed to create OAuth window: {}", e),
        retry_after: None,
        details: None,
    })?;
    
    Ok(())
}

#[derive(Serialize, Deserialize)]
struct AuthData {
    access_token: String,
    refresh_token: String,
    token_expires_at: i64,
}

fn get_auth_file_path() -> Result<PathBuf, ApiError> {
    let mut path = if cfg!(target_os = "windows") {
        let appdata = std::env::var("APPDATA")
            .map_err(|e| ApiError {
                kind: "storage".to_string(),
                message: format!("Failed to get APPDATA: {}", e),
                retry_after: None,
                details: None,
            })?;
        PathBuf::from(appdata)
    } else if cfg!(target_os = "macos") {
        let home = std::env::var("HOME")
            .map_err(|e| ApiError {
                kind: "storage".to_string(),
                message: format!("Failed to get HOME: {}", e),
                retry_after: None,
                details: None,
            })?;
        PathBuf::from(home).join("Library/Application Support")
    } else {
        // Linux and others
        let home = std::env::var("HOME")
            .map_err(|e| ApiError {
                kind: "storage".to_string(),
                message: format!("Failed to get HOME: {}", e),
                retry_after: None,
                details: None,
            })?;
        PathBuf::from(home).join(".local/share")
    };
    
    path.push("Shikimore");
    
    // Create directory if it doesn't exist
    std::fs::create_dir_all(&path)
        .map_err(|e| ApiError {
            kind: "storage".to_string(),
            message: format!("Failed to create auth directory: {}", e),
            retry_after: None,
            details: None,
        })?;
    
    path.push("auth.json");
    Ok(path)
}

fn save_auth_data(data: &AuthData) -> Result<(), ApiError> {
    let path = get_auth_file_path()?;
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| ApiError {
            kind: "storage".to_string(),
            message: format!("Failed to serialize auth data: {}", e),
            retry_after: None,
            details: None,
        })?;
    std::fs::write(&path, json)
        .map_err(|e| ApiError {
            kind: "storage".to_string(),
            message: format!("Failed to write auth file: {}", e),
            retry_after: None,
            details: None,
        })?;
    Ok(())
}

fn load_auth_data() -> Result<Option<AuthData>, ApiError> {
    let path = get_auth_file_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let json = std::fs::read_to_string(&path)
        .map_err(|e| ApiError {
            kind: "storage".to_string(),
            message: format!("Failed to read auth file: {}", e),
            retry_after: None,
            details: None,
        })?;
    let data: AuthData = serde_json::from_str(&json)
        .map_err(|e| ApiError {
            kind: "storage".to_string(),
            message: format!("Failed to parse auth file: {}", e),
            retry_after: None,
            details: None,
        })?;
    Ok(Some(data))
}

fn delete_auth_data() -> Result<(), ApiError> {
    let path = get_auth_file_path()?;
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| ApiError {
                kind: "storage".to_string(),
                message: format!("Failed to delete auth file: {}", e),
                retry_after: None,
                details: None,
            })?;
    }
    Ok(())
}

#[tauri::command]
async fn oauth_callback(code: String, state: tauri::State<'_, AppState>) -> Result<OAuthTokenResponse, ApiError> {
    let client = state.http_client.clone();
    let client_id = get_env_var("OAUTH_CLIENT_ID")?;
    let client_secret = get_env_var("OAUTH_CLIENT_SECRET")?;
    let redirect_uri = get_env_var("OAUTH_REDIRECT_URI")?;
    
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;
    
    let form_data = [
        ("grant_type", "authorization_code"),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
        ("code", &code),
        ("redirect_uri", &redirect_uri),
    ];
    
    let body = form_data.iter()
        .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");
    
    info!("[OAuth] Sending token request to https://shikimori.one/oauth/token");
    
    let response = client
        .post("https://shikimori.one/oauth/token")
        .header("User-Agent", "Shikimore")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| {
            error!("[OAuth] HTTP request failed: {}", e);
            ApiError {
                kind: "http".to_string(),
                message: format!("Failed to get token: {}", e),
                retry_after: None,
                details: Some(serde_json::json!({
                    "url": "https://shikimori.one/oauth/token"
                })),
            }
        })?;
    
    if !response.status().is_success() {
        let status = response.status();
        
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        
        let body = response.text().await.unwrap_or_default();
        
        if status.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)), // Default to 60 seconds if not provided
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }
        
        return Err(ApiError {
            kind: "oauth".to_string(),
            message: format!("OAuth token request failed: {} - {}", status, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
        });
    }
    
    let token_response: OAuthTokenResponse = response
        .json()
        .await
        .map_err(|e| ApiError {
            kind: "serialization".to_string(),
            message: format!("Failed to parse token response: {}", e),
            retry_after: None,
            details: None,
        })?;
    
    // Сохраняем токен в файл
    let auth_data = AuthData {
        access_token: token_response.access_token.clone(),
        refresh_token: token_response.refresh_token.clone(),
        token_expires_at: token_response.created_at + token_response.expires_in,
    };
    save_auth_data(&auth_data)?;
    
    info!("[OAuth] Token received and saved");
    Ok(token_response)
}

#[tauri::command]
async fn oauth_refresh(state: tauri::State<'_, AppState>) -> Result<OAuthTokenResponse, ApiError> {
    let auth_data = load_auth_data()?
        .ok_or_else(|| ApiError {
            kind: "auth".to_string(),
            message: "No auth data found".to_string(),
            retry_after: None,
            details: None,
        })?;
    
    let client = state.http_client.clone();
    let client_id = get_env_var("OAUTH_CLIENT_ID")?;
    let client_secret = get_env_var("OAUTH_CLIENT_SECRET")?;
    
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;
    
    let form_data = [
        ("grant_type", "refresh_token"),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
        ("refresh_token", &auth_data.refresh_token),
    ];
    
    let body = form_data.iter()
        .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");
    
    let response = client
        .post("https://shikimori.one/oauth/token")
        .header("User-Agent", "Shikimore")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to refresh token: {}", e),
            retry_after: None,
            details: None,
        })?;
    
    if !response.status().is_success() {
        let status = response.status();
        
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        
        let body = response.text().await.unwrap_or_default();
        
        if status.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)), // Default to 60 seconds if not provided
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }
        
        return Err(ApiError {
            kind: "oauth".to_string(),
            message: format!("OAuth refresh failed: {} - {}", status, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
        });
    }
    
    let token_response: OAuthTokenResponse = response
        .json()
        .await
        .map_err(|e| ApiError {
            kind: "serialization".to_string(),
            message: format!("Failed to parse refresh response: {}", e),
            retry_after: None,
            details: None,
        })?;
    
    // Обновляем токены в файле
    let new_auth_data = AuthData {
        access_token: token_response.access_token.clone(),
        refresh_token: token_response.refresh_token.clone(),
        token_expires_at: token_response.created_at + token_response.expires_in,
    };
    save_auth_data(&new_auth_data)?;
    
    info!("[OAuth] Token refreshed");
    Ok(token_response)
}

#[tauri::command]
async fn get_user_info(state: tauri::State<'_, AppState>) -> Result<UserInfo, ApiError> {
    let auth_data = load_auth_data()?
        .ok_or_else(|| ApiError {
            kind: "auth".to_string(),
            message: "Not authenticated".to_string(),
            retry_after: None,
            details: None,
        })?;

    let client = state.http_client.clone();
    
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;
    
    // Сначала получаем basic info
    let response = client
        .get("https://shikimori.one/api/users/whoami")
        .header("User-Agent", "Shikimore")
        .header("Authorization", &format!("Bearer {}", auth_data.access_token))
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to get user info: {}", e),
            retry_after: None,
            details: None,
        })?;

    if !response.status().is_success() {
        let status = response.status();
        
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        
        let body = response.text().await.unwrap_or_default();
        
        if status.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)), // Default to 60 seconds if not provided
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }
        
        return Err(ApiError {
            kind: "api".to_string(),
            message: format!("Failed to get user info: {} - {}", status, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
        });
    }

    let body_text = response.text().await.map_err(|e| ApiError {
        kind: "http".to_string(),
        message: format!("Failed to read response body: {}", e),
        retry_after: None,
        details: None,
    })?;

    info!("[OAuth] Basic user info received");

    let mut user_info: UserInfo = serde_json::from_str(&body_text).map_err(|e| ApiError {
        kind: "serialization".to_string(),
        message: format!("Failed to parse user info: {}", e),
        retry_after: None,
        details: Some(serde_json::json!({ "error": e.to_string(), "body": body_text })),
    })?;

    // Получаем полную информацию о пользователе со статистикой
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;
    
    let full_response = client
        .get(&format!("https://shikimori.one/api/users/{}", user_info.id))
        .header("User-Agent", "Shikimore")
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to get full user info: {}", e),
            retry_after: None,
            details: None,
        })?;

    if full_response.status().is_success() {
        let full_body = full_response.text().await.unwrap_or_default();
        info!("[OAuth] User info received");
        
        // Парсим только нужные поля из полного ответа
        if let Ok(full_info) = serde_json::from_str::<serde_json::Value>(&full_body) {
            // Извлекаем статистику из stats.statuses.anime
            if let Some(stats) = full_info.get("stats").and_then(|s| s.get("statuses")).and_then(|s| s.get("anime")) {
                if let Some(statuses) = stats.as_array() {
                    let mut anime_stats = UserStats {
                        completed: 0,
                        dropped: 0,
                        on_hold: 0,
                        planned: 0,
                        watching: 0,
                    };
                    for status in statuses {
                        if let Some(item) = status.as_object() {
                            if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                                if let Some(size) = item.get("size").and_then(|s| s.as_i64()) {
                                    match name {
                                        "completed" => anime_stats.completed = size as i32,
                                        "dropped" => anime_stats.dropped = size as i32,
                                        "on_hold" => anime_stats.on_hold = size as i32,
                                        "planned" => anime_stats.planned = size as i32,
                                        "watching" => anime_stats.watching = size as i32,
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                    user_info.rates_anime_stats = Some(anime_stats);
                }
            }
            
            // Извлекаем статистику из stats.statuses.manga
            if let Some(stats) = full_info.get("stats").and_then(|s| s.get("statuses")).and_then(|s| s.get("manga")) {
                if let Some(statuses) = stats.as_array() {
                    let mut manga_stats = UserStats {
                        completed: 0,
                        dropped: 0,
                        on_hold: 0,
                        planned: 0,
                        watching: 0,
                    };
                    for status in statuses {
                        if let Some(item) = status.as_object() {
                            if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                                if let Some(size) = item.get("size").and_then(|s| s.as_i64()) {
                                    match name {
                                        "completed" => manga_stats.completed = size as i32,
                                        "dropped" => manga_stats.dropped = size as i32,
                                        "on_hold" => manga_stats.on_hold = size as i32,
                                        "planned" => manga_stats.planned = size as i32,
                                        "watching" => manga_stats.watching = size as i32,
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                    user_info.rates_manga_stats = Some(manga_stats);
                }
            }
            
            if let Some(about) = full_info.get("about") {
                if let Some(about_str) = about.as_str() {
                    if !about_str.is_empty() {
                        user_info.about = Some(about_str.to_string());
                    }
                }
            }
            if let Some(website) = full_info.get("website") {
                if let Some(website_str) = website.as_str() {
                    if !website_str.is_empty() {
                        user_info.website = Some(website_str.to_string());
                    }
                }
            }
        }
    }

    Ok(user_info)
}

#[tauri::command]
async fn logout(state: tauri::State<'_, AppState>) -> Result<(), ApiError> {
    delete_auth_data()?;
    // Clear user_id cache
    {
        let mut cached = state.user_id.lock().await;
        *cached = None;
    }
    info!("[OAuth] User logged out");
    Ok(())
}

#[tauri::command]
async fn is_authenticated() -> Result<bool, ApiError> {
    let has_auth = load_auth_data()?.is_some();
    Ok(has_auth)
}

#[tauri::command]
async fn get_user_anime_rates(state: tauri::State<'_, AppState>) -> Result<Vec<UserRate>, ApiError> {
    let user_id = get_user_id_cached(&state).await?;
    let client = state.http_client.clone();

    // Pagination: load all records in batches
    let mut all_rates: Vec<UserRate> = Vec::new();
    let mut page = 1;
    let limit = 50;
    
    loop {
        wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;
        
        let response = client
            .get(&format!("https://shikimori.one/api/users/{}/anime_rates", user_id))
            .header("User-Agent", "Shikimore")
            .query(&[("page", &page.to_string()), ("limit", &limit.to_string())])
            .send()
            .await
            .map_err(|e| ApiError {
                kind: "http".to_string(),
                message: format!("Failed to get anime rates: {}", e),
                retry_after: None,
                details: None,
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let retry_after = response.headers()
                .get("Retry-After")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok());
            let body = response.text().await.unwrap_or_default();
            
            if status.as_u16() == 429 {
                return Err(ApiError {
                    kind: "rate_limit".to_string(),
                    message: format!("Too Many Requests: {}", body),
                    retry_after: retry_after.or(Some(60)),
                    details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
                });
            }
            
            return Err(ApiError {
                kind: "api".to_string(),
                message: format!("Failed to get anime rates: {} - {}", status, body),
                retry_after: None,
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }

        let body_text = response.text().await.map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to read response body: {}", e),
            retry_after: None,
            details: None,
        })?;
        
        let rates: Vec<UserRate> = serde_json::from_str(&body_text).map_err(|e| ApiError {
            kind: "serialization".to_string(),
            message: format!("Failed to parse anime rates: {}", e),
            retry_after: None,
            details: Some(serde_json::json!({ "error": e.to_string(), "body": body_text })),
        })?;
        
        if rates.is_empty() {
            break;
        }
        
        all_rates.extend(rates);
        page += 1;
        
        // Safety limit to prevent infinite loops
        if page > 100 {
            break;
        }
    }

    Ok(all_rates)
}

#[tauri::command]
async fn get_user_anime_rates_paginated(
    state: tauri::State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
) -> Result<SearchResult<UserRate>, ApiError> {
    let user_id = get_user_id_cached(&state).await?;
    let client = state.http_client.clone();
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);

    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;

    let mut query_params = vec![
        ("page", page.to_string()),
        ("limit", limit.to_string()),
        ("order", "created_at".to_string()),
    ];

    if let Some(status_filter) = status {
        query_params.push(("status", status_filter));
    }

    let response = client
        .get(&format!("https://shikimori.one/api/users/{}/anime_rates", user_id))
        .header("User-Agent", "Shikimore")
        .query(&query_params)
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to get anime rates: {}", e),
            retry_after: None,
            details: None,
        })?;

    if !response.status().is_success() {
        let status_code = response.status();
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        let body = response.text().await.unwrap_or_default();

        if status_code.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)),
                details: Some(serde_json::json!({ "status": status_code.as_u16(), "body": body })),
            });
        }

        return Err(ApiError {
            kind: "api".to_string(),
            message: format!("Failed to get anime rates: {} - {}", status_code, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status_code.as_u16(), "body": body })),
        });
    }

    let body_text = response.text().await.map_err(|e| ApiError {
        kind: "http".to_string(),
        message: format!("Failed to read response body: {}", e),
        retry_after: None,
        details: None,
    })?;

    // Handle null response (no rates found)
    if body_text.trim() == "null" {
        return Ok(SearchResult {
            items: vec![],
            page,
            limit,
        });
    }

    let rates: Vec<UserRate> = serde_json::from_str(&body_text).map_err(|e| ApiError {
        kind: "serialization".to_string(),
        message: format!("Failed to parse anime rates: {}", e),
        retry_after: None,
        details: Some(serde_json::json!({ "error": e.to_string(), "body": body_text })),
    })?;

    Ok(SearchResult {
        items: rates,
        page,
        limit,
    })
}

#[tauri::command]
async fn get_user_anime_rates_graphql(
    state: tauri::State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
) -> Result<SearchResult<UserRate>, ApiError> {
    let client = &state.client;
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);

    use shikicrate::queries::UserRateSearchParams;
    
    let params = UserRateSearchParams {
        page: Some(page as i32),
        limit: Some(limit as i32),
        target_type: None,
        order_field: None,
        order: None,
    };

    let rates = client.user_rates(params).await.map_err(ApiError::from)?;

    // Filter by status if provided
    let filtered_rates = if let Some(status_filter) = status {
        rates.into_iter()
            .filter(|r| r.status.to_lowercase() == status_filter.to_lowercase())
            .collect()
    } else {
        rates
    };

    // Convert Shikicrate UserRate to our UserRate format
    let converted_rates: Vec<UserRate> = filtered_rates.into_iter().map(|cr| {
        UserRate {
            id: cr.id,
            score: cr.score.map(|s| s.to_string()),
            status: cr.status,
            text: None,
            text_html: None,
            rewatches: None,
            episodes: cr.episodes,
            volumes: None,
            chapters: None,
            anime: cr.anime.map(|a| Anime {
                id: a.id,
                title: a.name,
                russian: a.russian,
                url: a.url,
                poster_url: a.poster.and_then(|p| fix_url(p.main_url)),
                score: a.score.map(|s| s.to_string()),
                kind: a.kind,
                status: a.status,
                episodes: a.episodes,
                episodes_aired: a.episodes_aired,
                aired_on: a.aired_on.map(|d| Date {
                    year: d.year,
                    month: d.month,
                    day: d.day,
                    date: d.date,
                }),
            }),
            manga: None,
        }
    }).collect();

    Ok(SearchResult {
        items: converted_rates,
        page,
        limit,
    })
}

#[tauri::command]
async fn get_user_manga_rates(state: tauri::State<'_, AppState>) -> Result<Vec<UserRate>, ApiError> {
    let user_id = get_user_id_cached(&state).await?;
    let client = state.http_client.clone();

    // Pagination: load all records in batches
    let mut all_rates: Vec<UserRate> = Vec::new();
    let mut page = 1;
    let limit = 50;
    
    loop {
        wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;
        
        let response = client
            .get(&format!("https://shikimori.one/api/users/{}/manga_rates", user_id))
            .header("User-Agent", "Shikimore")
            .query(&[("page", &page.to_string()), ("limit", &limit.to_string())])
            .send()
            .await
            .map_err(|e| ApiError {
                kind: "http".to_string(),
                message: format!("Failed to get manga rates: {}", e),
                retry_after: None,
                details: None,
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let retry_after = response.headers()
                .get("Retry-After")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok());
            let body = response.text().await.unwrap_or_default();
            
            if status.as_u16() == 429 {
                return Err(ApiError {
                    kind: "rate_limit".to_string(),
                    message: format!("Too Many Requests: {}", body),
                    retry_after: retry_after.or(Some(60)),
                    details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
                });
            }
            
            return Err(ApiError {
                kind: "api".to_string(),
                message: format!("Failed to get manga rates: {} - {}", status, body),
                retry_after: None,
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }

        let body_text = response.text().await.map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to read response body: {}", e),
            retry_after: None,
            details: None,
        })?;
        
        let rates: Vec<UserRate> = serde_json::from_str(&body_text).map_err(|e| ApiError {
            kind: "serialization".to_string(),
            message: format!("Failed to parse manga rates: {}", e),
            retry_after: None,
            details: Some(serde_json::json!({ "error": e.to_string(), "body": body_text })),
        })?;
        
        if rates.is_empty() {
            break;
        }
        
        all_rates.extend(rates);
        page += 1;
        
        // Safety limit to prevent infinite loops
        if page > 100 {
            break;
        }
    }

    Ok(all_rates)
}

#[tauri::command]
async fn get_user_manga_rates_paginated(
    state: tauri::State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
) -> Result<SearchResult<UserRate>, ApiError> {
    let user_id = get_user_id_cached(&state).await?;
    let client = state.http_client.clone();
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);

    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;

    let mut query_params = vec![
        ("page", page.to_string()),
        ("limit", limit.to_string()),
        ("order", "created_at".to_string()),
    ];

    if let Some(status_filter) = status {
        query_params.push(("status", status_filter));
    }

    let response = client
        .get(&format!("https://shikimori.one/api/users/{}/manga_rates", user_id))
        .header("User-Agent", "Shikimore")
        .query(&query_params)
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to get manga rates: {}", e),
            retry_after: None,
            details: None,
        })?;

    if !response.status().is_success() {
        let status_code = response.status();
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        let body = response.text().await.unwrap_or_default();

        if status_code.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)),
                details: Some(serde_json::json!({ "status": status_code.as_u16(), "body": body })),
            });
        }

        return Err(ApiError {
            kind: "api".to_string(),
            message: format!("Failed to get manga rates: {} - {}", status_code, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status_code.as_u16(), "body": body })),
        });
    }

    let body_text = response.text().await.map_err(|e| ApiError {
        kind: "http".to_string(),
        message: format!("Failed to read response body: {}", e),
        retry_after: None,
        details: None,
    })?;

    // Handle null response (no rates found)
    if body_text.trim() == "null" {
        return Ok(SearchResult {
            items: vec![],
            page,
            limit,
        });
    }

    let rates: Vec<UserRate> = serde_json::from_str(&body_text).map_err(|e| ApiError {
        kind: "serialization".to_string(),
        message: format!("Failed to parse manga rates: {}", e),
        retry_after: None,
        details: Some(serde_json::json!({ "error": e.to_string(), "body": body_text })),
    })?;

    Ok(SearchResult {
        items: rates,
        page,
        limit,
    })
}

#[tauri::command]
async fn get_user_manga_rates_graphql(
    state: tauri::State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
) -> Result<SearchResult<UserRate>, ApiError> {
    let client = &state.client;
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);

    use shikicrate::queries::UserRateSearchParams;
    
    let params = UserRateSearchParams {
        page: Some(page as i32),
        limit: Some(limit as i32),
        target_type: None,
        order_field: None,
        order: None,
    };

    let rates = client.user_rates(params).await.map_err(ApiError::from)?;

    // Filter by status if provided
    let filtered_rates = if let Some(status_filter) = status {
        rates.into_iter()
            .filter(|r| r.status.to_lowercase() == status_filter.to_lowercase())
            .collect()
    } else {
        rates
    };

    // Convert Shikicrate UserRate to our UserRate format
    let converted_rates: Vec<UserRate> = filtered_rates.into_iter().map(|cr| {
        UserRate {
            id: cr.id,
            score: cr.score.map(|s| s.to_string()),
            status: cr.status,
            text: None,
            text_html: None,
            rewatches: None,
            episodes: None,
            volumes: cr.volumes,
            chapters: cr.chapters,
            anime: None,
            manga: cr.manga.map(|m| Manga {
                id: m.id,
                title: m.name,
                russian: m.russian,
                url: m.url,
                poster_url: m.poster.and_then(|p| fix_url(p.main_url)),
                score: m.score.map(|s| s.to_string()),
                kind: m.kind,
                status: m.status,
                volumes: m.volumes,
                chapters: m.chapters,
            }),
        }
    }).collect();

    Ok(SearchResult {
        items: converted_rates,
        page,
        limit,
    })
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

    let animes = match client.animes(params).await {
        Ok(a) => {
            info!("[Backend] Got {} animes from GraphQL", a.len());
            if a.len() > 0 {
                info!("[Backend] First anime: id={}, title={}", a[0].id, a[0].name);
                info!("[Backend] First anime aired_on: {:?}", a[0].aired_on);
            }
            a
        }
        Err(e) => {
            error!("[Backend] Ошибка запроса аниме: {:?}", e);
            let api_err = ApiError::from(e);
            error!("[Backend] Преобразованная ошибка: kind={}, message={}", api_err.kind, api_err.message);
            return Err(api_err);
        }
    };

    let anime_list: Vec<Anime> = animes
        .into_iter()
        .map(|a| Anime {
            id: a.id,
            title: a.name,
            russian: a.russian,
            url: a.url.or_else(|| Some(format!("https://shikimori.io/animes/{}", a.id))),
            poster_url: a.poster.and_then(|p| p.main_url),
            score: a.score.map(|s| s.to_string()),
            kind: a.kind,
            status: a.status,
            episodes: a.episodes,
            episodes_aired: a.episodes_aired,
            aired_on: a.aired_on.map(|d| Date {
                year: d.year,
                month: d.month,
                day: d.day,
                date: d.date,
            }),
        })
        .collect();

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

    let mangas = match client.mangas(params).await {
        Ok(m) => m,
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
            score: m.score.map(|s| s.to_string()),
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
    state: tauri::State<'_, AppState>,
    page: Option<u32>,
    limit: Option<u32>,
    ids: Option<Vec<String>>,
) -> Result<SearchResult<Character>, ApiError> {
    let client = &state.client;

    use shikicrate::queries::CharacterSearchParams;

    if let Some(ids) = ids {
        let params = CharacterSearchParams {
            page: None,
            limit: None,
            ids: Some(ids),
            search: None,
        };

        let characters = match client.characters(params).await {
            Ok(c) => c,
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

    let params = CharacterSearchParams {
        page: Some(page_val as i32),
        limit: Some(limit_val as i32),
        ids: None,
        search: None,
    };

    let characters = match client.characters(params).await {
        Ok(c) => c,
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
    let client = &state.client;

    let character = match client.character_detail(id).await {
        Ok(Some(c)) => c,
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
    let limit = limit.unwrap_or(20);
    let client = &state.client;

    use shikicrate::queries::PeopleSearchParams;
    
    let params = PeopleSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        limit: Some(limit as i32),
    };

    let people = match client.people(params).await {
        Ok(p) => p,
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
    
    // Check cache first
    let cache_key = text_cache::cache_key_anime(id);
    if let Ok(Some(cached_json)) = state.text_cache.get(&cache_key) {
        match serde_json::from_str::<AnimeDetail>(&cached_json) {
            Ok(cached) => return Ok(cached),
            Err(e) => {
                warn!("[get_anime_by_id] Failed to deserialize cached data: {}", e);
            }
        }
    }
    
    let client = &state.client;

    // Используем выделенный метод для получения деталей
    let anime = match client.anime_detail(id).await {
        Ok(Some(a)) => {
            a
        },
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

    let result = AnimeDetail {
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
    };

    // Cache the result
    if let Ok(json) = serde_json::to_string(&result) {
        if let Err(e) = state.text_cache.set(&cache_key, &json) {
            warn!("[get_anime_by_id] Failed to cache anime data: {}", e);
        } else {
        }
    }

    Ok(result)
}

#[tauri::command]
async fn get_manga_by_id(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<MangaDetail, ApiError> {
    
    // Check cache first
    let cache_key = text_cache::cache_key_manga(id);
    if let Ok(Some(cached_json)) = state.text_cache.get(&cache_key) {
        match serde_json::from_str::<MangaDetail>(&cached_json) {
            Ok(cached) => return Ok(cached),
            Err(e) => {
                warn!("[get_manga_by_id] Failed to deserialize cached data: {}", e);
            }
        }
    }
    
    let client = &state.client;

    // Используем выделенный метод для получения деталей
    let manga = match client.manga_detail(id).await {
        Ok(Some(m)) => {
            m
        },
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

    let result = MangaDetail {
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
    };

    // Cache the result
    if let Ok(json) = serde_json::to_string(&result) {
        if let Err(e) = state.text_cache.set(&cache_key, &json) {
            warn!("[get_manga_by_id] Failed to cache manga data: {}", e);
        } else {
        }
    }

    Ok(result)
}

#[tauri::command]
async fn get_similar_anime(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<Vec<shikicrate::SimilarAnime>, ApiError> {
    let client = &state.client;

    let similar = client.similar_anime(id).await.map_err(ApiError::from)?;

    Ok(similar)
}

#[tauri::command]
async fn get_related_anime(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<Vec<shikicrate::Related>, ApiError> {
    let client = &state.client;

    let related = client.related_anime(id).await.map_err(ApiError::from)?;

    Ok(related)
}

#[tauri::command]
async fn get_related_manga(
    state: tauri::State<'_, AppState>,
    id: i64
) -> Result<Vec<shikicrate::Related>, ApiError> {
    let client = &state.client;

    let related = client.related_manga(id).await.map_err(ApiError::from)?;

    Ok(related)
}

#[tauri::command]
async fn get_accent_color(url: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    wait_for_rate_limit(&state.last_accent_color_request, ACCENT_COLOR_RATE_LIMIT_DELAY).await;

    let bytes = if url.starts_with("data:") {
        // Handle data URL
        let data_url = url.clone();
        let parts: Vec<&str> = data_url.split(',').collect();
        if parts.len() != 2 {
            return Err("Invalid data URL format".to_string());
        }
        let base64_data = parts[1];
        base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .map_err(|e| format!("Failed to decode base64: {}", e))?
    } else {
        // Try to use preview/x48 version for better performance
        let optimized_url = url
            .replace("/original/", "/x48/")
            .replace("/preview/", "/x48/");

        let client = state.http_client.clone();
        
        client
            .get(&optimized_url)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| {
                error!("[Backend] Ошибка загрузки изображения: {}", e);
                e.to_string()
            })?
            .bytes()
            .await
            .map_err(|e| {
                error!("[Backend] Ошибка чтения байтов: {}", e);
                e.to_string()
            })?
            .to_vec()
    };

    let img = match image::load_from_memory(&bytes) {
        Ok(i) => i,
        Err(e) => {
            error!("[Backend] Ошибка загрузки изображения из памяти: {}", e);
            return Err(e.to_string());
        }
    };
    
    // Use larger thumbnail for better color accuracy
    let img = img.thumbnail(32, 32);
    let rgb = img.to_rgb8();

    let mut r: u32 = 0;
    let mut g: u32 = 0;
    let mut b: u32 = 0;
    let mut count: u32 = 0;

    for pixel in rgb.pixels() {
        let brightness = pixel[0] as f32 * 0.299 + pixel[1] as f32 * 0.587 + pixel[2] as f32 * 0.114;
        // Filter out very dark and very bright pixels for better accent color
        if brightness > 20.0 && brightness < 240.0 {
            r += pixel[0] as u32;
            g += pixel[1] as u32;
            b += pixel[2] as u32;
            count += 1;
        }
    }

    if count == 0 {
        warn!("[Backend] No valid pixels found, using default color");
        return Ok("#b4a078".to_string());
    }

    let avg_r = (r / count) as u8;
    let avg_g = (g / count) as u8;
    let avg_b = (b / count) as u8;
    
    // Apply slight darkening for better accent color
    let factor = 0.85;
    let final_r = ((avg_r as f32 * factor) as u8).max(0).min(255);
    let final_g = ((avg_g as f32 * factor) as u8).max(0).min(255);
    let final_b = ((avg_b as f32 * factor) as u8).max(0).min(255);

    let color = format!("#{:02x}{:02x}{:02x}", final_r, final_g, final_b);
    debug!("[Backend] Generated accent color: {}", color);
    Ok(color)
}

fn get_cache_dir() -> Result<PathBuf, String> {
    let mut cache_dir = std::env::temp_dir();
    cache_dir.push("shikimore");
    cache_dir.push("image_cache");

    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir)
            .map_err(|e| format!("Failed to create cache dir at {:?}: {}", cache_dir, e))?;
    }

    debug!("[Backend] Image cache dir: {:?}", cache_dir);
    Ok(cache_dir)
}

fn clear_expired_images() -> Result<usize, String> {
    let cache_dir = get_cache_dir()?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    let mut deleted_count = 0;
    
    let entries = fs::read_dir(&cache_dir)
        .map_err(|e| format!("Failed to read cache dir: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {}", e))?;
        let path = entry.path();
        
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                let modified_secs = modified
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or(Duration::ZERO)
                    .as_secs() as i64;
                
                if now - modified_secs > IMAGE_CACHE_TTL_SECONDS {
                    if fs::remove_file(&path).is_ok() {
                        deleted_count += 1;
                        debug!("[Backend] Deleted expired image cache: {:?}", path);
                    }
                }
            }
        }
    }
    
    if deleted_count > 0 {
        info!("[Backend] Cleared {} expired image cache files", deleted_count);
    }
    
    Ok(deleted_count)
}

fn url_to_filename(url: &str) -> String {
    let mut hasher = DefaultHasher::new();
    url.hash(&mut hasher);
    let hash = hasher.finish();
    
    // Extract extension from URL
    let ext = url
        .split('.')
        .last()
        .and_then(|s| s.split('?').next())
        .unwrap_or("jpg");
    
    format!("{}.{}", hash, ext)
}

#[tauri::command]
async fn get_cached_image(url: String) -> Result<String, String> {
    // Validate URL
    if url.is_empty() {
        error!("[Backend] Empty URL provided to get_cached_image");
        return Err("Empty URL".to_string());
    }

    // Fix protocol-relative URLs (//example.com/image.jpg)
    let url = if url.starts_with("//") {
        format!("https:{}", url)
    } else {
        url
    };

    let cache_dir = get_cache_dir()?;
    let filename = url_to_filename(&url);
    let cache_path = cache_dir.join(&filename);

    // Check if image is already cached
    if cache_path.exists() {
    } else {
        // Download and cache the image
        debug!("[Backend] Attempting to download image from URL: {}", url);
        let response = reqwest::get(&url)
            .await
            .map_err(|e| {
                error!("[Backend] Failed to download image (URL: {}): {}", url, e);
                format!("Failed to download image: {}", e)
            })?;

        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| {
                error!("[Backend] Failed to read image bytes: {}", e);
                format!("Failed to read image bytes: {}", e)
            })?;

        fs::write(&cache_path, &bytes)
            .map_err(|e| {
                error!("[Backend] Failed to write cached image: {}", e);
                format!("Failed to write cached image: {}", e)
            })?;
    }

    // Read file and convert to base64 data URL
    let image_data = fs::read(&cache_path)
        .map_err(|e| {
            error!("[Backend] Failed to read cached image: {}", e);
            format!("Failed to read cached image: {}", e)
        })?;

    // Detect mime type from extension
    let mime_type = match cache_path.extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        _ => "image/jpeg",
    };

    let base64 = base64::engine::general_purpose::STANDARD.encode(&image_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64);

    Ok(data_url)
}

#[tauri::command]
async fn get_user_rate(
    target_id: i64,
    target_type: String,
    state: tauri::State<'_, AppState>
) -> Result<Option<UserRateSimple>, ApiError> {

    eprintln!("[get_user_rate] Called with target_id={}, target_type={}", target_id, target_type);

    let auth_data = match load_auth_data() {
        Ok(Some(data)) => data,
        Ok(None) => {
            eprintln!("[get_user_rate] No auth data, returning None");
            return Ok(None);
        }
        Err(e) => {
            eprintln!("[get_user_rate] Auth error: {}", e);
            return Err(e);
        }
    };

    let user_id = match get_user_id_cached(&state).await {
        Ok(id) => id,
        Err(e) => {
            eprintln!("[get_user_rate] Failed to get user_id: {}", e);
            return Err(e);
        }
    };

    eprintln!("[get_user_rate] user_id={}, querying Shikimori API", user_id);


    // Check cache first
    let cache_key = text_cache::cache_key_user_rate(user_id, target_id, &target_type);
    if let Ok(Some(cached_json)) = state.text_cache.get(&cache_key) {
        match serde_json::from_str::<UserRateSimple>(&cached_json) {
            Ok(cached) => {
                eprintln!("[get_user_rate] Cache hit for target_id={}", target_id);
                return Ok(Some(cached));
            }
            Err(e) => {
                warn!("[get_user_rate] Failed to deserialize cached data: {}", e);
            }
        }
    }

    let client = state.http_client.clone();

    let endpoint = if target_type.to_lowercase() == "anime" {
        "anime_rates"
    } else {
        "manga_rates"
    };

    // Paginate through all pages to find the specific target_id
    let mut page = 1;
    let limit = 500;

    loop {
        wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;

        let response = client
            .get(&format!(
                "https://shikimori.one/api/users/{}/{}",
                user_id, endpoint
            ))
            .header("User-Agent", "Shikimore")
            .header("Authorization", &format!("Bearer {}", auth_data.access_token))
            .query(&[("page", &page.to_string()), ("limit", &limit.to_string())])
            .send()
            .await
            .map_err(|e| {
                error!("[get_user_rate] HTTP request failed: {}", e);
                ApiError {
                    kind: "http".to_string(),
                    message: format!("Failed to get user rate: {}", e),
                    retry_after: None,
                    details: None,
                }
            })?;

        let status = response.status();
        let body = response.text().await.map_err(|e| {
            error!("[get_user_rate] Failed to read response body: {}", e);
            ApiError {
                kind: "http".to_string(),
                message: format!("Failed to read response body: {}", e),
                retry_after: None,
                details: None,
            }
        })?;

        if !status.is_success() {
            if status.as_u16() == 404 || body.trim() == "[]" || body.trim() == "null" {
                return Ok(None);
            }

            return Err(ApiError {
                kind: "api".to_string(),
                message: format!("Failed to get user rate: {} - {}", status, body),
                retry_after: None,
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }

        if body.trim() == "[]" || body.trim() == "null" {
            eprintln!("[get_user_rate] No more rates on page {}", page);
            break;
        }

        let rates: Vec<serde_json::Value> = serde_json::from_str(&body).map_err(|e| {
            error!("[get_user_rate] Failed to parse user rate: {}", e);
            ApiError {
                kind: "serialization".to_string(),
                message: format!("Failed to parse user rate: {}", e),
                retry_after: None,
                details: Some(serde_json::json!({ "error": e.to_string(), "body": body })),
            }
        })?;

        // Find the rate for the specific target_id
        for rate in rates {
            let anime_id = rate.get("anime")
                .and_then(|a| a.get("id"))
                .and_then(|id| id.as_i64());
            let manga_id = rate.get("manga")
                .and_then(|m| m.get("id"))
                .and_then(|id| id.as_i64());

            eprintln!("[get_user_rate] Checking: anime_id={:?}, manga_id={:?}, target_id={}", anime_id, manga_id, target_id);

            let found = match target_type.to_lowercase().as_str() {
                "anime" => anime_id == Some(target_id),
                "manga" => manga_id == Some(target_id),
                _ => false,
            };

            if found {
                let simple = serde_json::from_value::<UserRateSimple>(rate).map_err(|e| {
                    error!("[get_user_rate] Failed to convert rate: {}", e);
                    ApiError {
                        kind: "serialization".to_string(),
                        message: format!("Failed to convert rate: {}", e),
                        retry_after: None,
                        details: None,
                    }
                })?;

                // Cache the result
                if let Ok(json) = serde_json::to_string(&simple) {
                    if let Err(e) = state.text_cache.set(&cache_key, &json) {
                        warn!("[get_user_rate] Failed to cache user rate: {}", e);
                    }
                }

                return Ok(Some(simple));
            }
        }

        page += 1;
        if page > 100 {
            eprintln!("[get_user_rate] Reached page limit without finding target_id={}", target_id);
            break;
        }
    }

    Ok(None)
}

#[derive(Serialize, Deserialize)]
struct CreateUserRateRequest {
    user_id: i64,
    target_id: i64,
    target_type: String,
    score: Option<String>,
    status: Option<String>,
    episodes: Option<String>,
    chapters: Option<String>,
    volumes: Option<String>,
    rewatches: Option<String>,
    text: Option<String>,
}

#[tauri::command]
async fn create_user_rate(
    request: CreateUserRateRequest,
    state: tauri::State<'_, AppState>
) -> Result<UserRateSimple, ApiError> {
    let auth_data = load_auth_data()?
        .ok_or_else(|| ApiError {
            kind: "auth".to_string(),
            message: "Not authenticated".to_string(),
            retry_after: None,
            details: None,
        })?;

    let client = state.http_client.clone();
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;

    let mut user_rate = serde_json::Map::new();
    user_rate.insert("user_id".to_string(), serde_json::json!(request.user_id));
    user_rate.insert("target_id".to_string(), serde_json::json!(request.target_id));
    user_rate.insert("target_type".to_string(), serde_json::json!(request.target_type));
    
    if let Some(score) = request.score {
        user_rate.insert("score".to_string(), serde_json::json!(score));
    }
    if let Some(status) = request.status {
        user_rate.insert("status".to_string(), serde_json::json!(status));
    }
    if let Some(episodes) = request.episodes {
        user_rate.insert("episodes".to_string(), serde_json::json!(episodes));
    }
    if let Some(chapters) = request.chapters {
        user_rate.insert("chapters".to_string(), serde_json::json!(chapters));
    }
    if let Some(volumes) = request.volumes {
        user_rate.insert("volumes".to_string(), serde_json::json!(volumes));
    }
    if let Some(rewatches) = request.rewatches {
        user_rate.insert("rewatches".to_string(), serde_json::json!(rewatches));
    }
    if let Some(text) = request.text {
        user_rate.insert("text".to_string(), serde_json::json!(text));
    }

    let body = serde_json::json!({
        "user_rate": user_rate
    });

    let response = client
        .post("https://shikimori.one/api/v2/user_rates")
        .header("User-Agent", "Shikimore")
        .header("Authorization", &format!("Bearer {}", auth_data.access_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to create user rate: {}", e),
            retry_after: None,
            details: None,
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        let body = response.text().await.unwrap_or_default();

        if status.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)),
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }

        return Err(ApiError {
            kind: "api".to_string(),
            message: format!("Failed to create user rate: {} - {}", status, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
        });
    }

    let user_rate: UserRateSimple = response.json().await.map_err(|e| ApiError {
        kind: "serialization".to_string(),
        message: format!("Failed to parse user rate response: {}", e),
        retry_after: None,
        details: None,
    })?;

    // Invalidate cache for this user rate
    let cache_key = text_cache::cache_key_user_rate(request.user_id, request.target_id, &request.target_type);
    if let Err(e) = state.text_cache.invalidate(&cache_key) {
        warn!("[create_user_rate] Failed to invalidate cache: {}", e);
    }

    Ok(user_rate)
}

#[derive(Serialize, Deserialize)]
struct UpdateUserRateRequest {
    score: Option<String>,
    status: Option<String>,
    episodes: Option<String>,
    chapters: Option<String>,
    volumes: Option<String>,
    rewatches: Option<String>,
    text: Option<String>,
}

#[tauri::command]
async fn update_user_rate(
    id: i64,
    request: UpdateUserRateRequest,
    state: tauri::State<'_, AppState>
) -> Result<UserRateSimple, ApiError> {
    let auth_data = load_auth_data()?
        .ok_or_else(|| ApiError {
            kind: "auth".to_string(),
            message: "Not authenticated".to_string(),
            retry_after: None,
            details: None,
        })?;

    let client = state.http_client.clone();
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;

    let mut user_rate = serde_json::Map::new();
    
    if let Some(score) = request.score {
        user_rate.insert("score".to_string(), serde_json::json!(score));
    }
    if let Some(status) = request.status {
        user_rate.insert("status".to_string(), serde_json::json!(status));
    }
    if let Some(episodes) = request.episodes {
        user_rate.insert("episodes".to_string(), serde_json::json!(episodes));
    }
    if let Some(chapters) = request.chapters {
        user_rate.insert("chapters".to_string(), serde_json::json!(chapters));
    }
    if let Some(volumes) = request.volumes {
        user_rate.insert("volumes".to_string(), serde_json::json!(volumes));
    }
    if let Some(rewatches) = request.rewatches {
        user_rate.insert("rewatches".to_string(), serde_json::json!(rewatches));
    }
    if let Some(text) = request.text {
        user_rate.insert("text".to_string(), serde_json::json!(text));
    }

    let body = serde_json::json!({
        "user_rate": user_rate
    });

    let response = client
        .patch(&format!("https://shikimori.one/api/v2/user_rates/{}", id))
        .header("User-Agent", "Shikimore")
        .header("Authorization", &format!("Bearer {}", auth_data.access_token))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to update user rate: {}", e),
            retry_after: None,
            details: None,
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        let body = response.text().await.unwrap_or_default();

        if status.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)),
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }

        return Err(ApiError {
            kind: "api".to_string(),
            message: format!("Failed to update user rate: {} - {}", status, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
        });
    }

    let user_rate: UserRateSimple = response.json().await.map_err(|e| ApiError {
        kind: "serialization".to_string(),
        message: format!("Failed to parse user rate response: {}", e),
        retry_after: None,
        details: None,
    })?;

    // Invalidate all user_rate cache entries
    if let Err(e) = state.text_cache.invalidate_pattern("user_rate:%") {
        warn!("[update_user_rate] Failed to invalidate cache: {}", e);
    }

    Ok(user_rate)
}

#[tauri::command]
async fn delete_user_rate(
    id: i64,
    state: tauri::State<'_, AppState>
) -> Result<(), ApiError> {
    let auth_data = load_auth_data()?
        .ok_or_else(|| ApiError {
            kind: "auth".to_string(),
            message: "Not authenticated".to_string(),
            retry_after: None,
            details: None,
        })?;

    let client = state.http_client.clone();
    wait_for_rate_limit(&state.last_rest_request, RATE_LIMIT_DELAY).await;

    let response = client
        .delete(&format!("https://shikimori.one/api/v2/user_rates/{}", id))
        .header("User-Agent", "Shikimore")
        .header("Authorization", &format!("Bearer {}", auth_data.access_token))
        .send()
        .await
        .map_err(|e| ApiError {
            kind: "http".to_string(),
            message: format!("Failed to delete user rate: {}", e),
            retry_after: None,
            details: None,
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let retry_after = response.headers()
            .get("Retry-After")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<u64>().ok());
        let body = response.text().await.unwrap_or_default();

        if status.as_u16() == 429 {
            return Err(ApiError {
                kind: "rate_limit".to_string(),
                message: format!("Too Many Requests: {}", body),
                retry_after: retry_after.or(Some(60)),
                details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
            });
        }

        return Err(ApiError {
            kind: "api".to_string(),
            message: format!("Failed to delete user rate: {} - {}", status, body),
            retry_after: None,
            details: Some(serde_json::json!({ "status": status.as_u16(), "body": body })),
        });
    }

    // Invalidate all user_rate cache entries
    if let Err(e) = state.text_cache.invalidate_pattern("user_rate:%") {
        warn!("[delete_user_rate] Failed to invalidate cache: {}", e);
    }

    Ok(())
}

#[tauri::command]
fn get_cache_metrics(state: tauri::State<'_, AppState>) -> serde_json::Value {
    let (hits, misses) = state.text_cache.get_metrics();
    let total = hits + misses;
    let hit_rate = if total > 0 {
        (hits as f64 / total as f64 * 100.0) as f64
    } else {
        0.0
    };

    serde_json::json!({
        "text_cache": {
            "hits": hits,
            "misses": misses,
            "total": total,
            "hit_rate": hit_rate
        }
    })
}

#[tauri::command]
async fn fetch_anilist_media_info(name: String, media_type: String, state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let client = state.http_client.clone();
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
    dotenv::dotenv().ok();
    
    if let Err(e) = logger::init_logger() {
        eprintln!("Failed to initialize logger: {}", e);
    }
    info!("Запуск приложения Shikimore...");

    let app_state = match AppState::new() {
        Ok(state) => {
            info!("HTTP клиент инициализирован");
            
            // Clear expired caches on startup
            if let Err(e) = state.text_cache.clear_expired() {
                warn!("Failed to clear expired text cache: {}", e);
            } else {
                info!("Text cache cleanup completed");
            }
            
            if let Err(e) = clear_expired_images() {
                warn!("Failed to clear expired image cache: {}", e);
            } else {
                info!("Image cache cleanup completed");
            }
            
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
        .plugin(tauri_plugin_deep_link::init())
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
            get_cached_image,
            get_similar_anime,
            get_related_anime,
            get_related_manga,
            fetch_anilist_media_info,
            oauth_authorize,
            open_oauth_window,
            oauth_callback,
            oauth_refresh,
            get_user_info,
            get_user_anime_rates,
            get_user_manga_rates,
            get_user_anime_rates_paginated,
            get_user_manga_rates_paginated,
            get_user_anime_rates_graphql,
            get_user_manga_rates_graphql,
            get_user_rate,
            create_user_rate,
            update_user_rate,
            delete_user_rate,
            logout,
            get_cache_metrics,
            is_authenticated,
            logger::log_message
        ])
        .setup(|app| {
            info!("Tauri приложение инициализировано");
            
            // Регистрируем deep-link для OAuth callback
            #[cfg(target_os = "windows")]
            {
                app.deep_link().register_all().unwrap();
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
