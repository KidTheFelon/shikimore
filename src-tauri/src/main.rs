// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use shikicrate::ShikicrateClient;

#[derive(Debug, Serialize, Deserialize)]
struct Anime {
    id: i64,
    title: String,
    url: Option<String>,
    poster_url: Option<String>,
    description: Option<String>,
    score: Option<f64>,
    kind: Option<String>,
    status: Option<String>,
    episodes: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SearchResult {
    items: Vec<Anime>,
    page: u32,
    limit: u32,
}

#[derive(Debug, Serialize, Deserialize)]
enum AppError {
    ClientError(String),
    ValidationError(String),
    ApiError(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::ClientError(msg) => write!(f, "Ошибка клиента: {}", msg),
            AppError::ValidationError(msg) => write!(f, "Ошибка валидации: {}", msg),
            AppError::ApiError(msg) => write!(f, "Ошибка API: {}", msg),
        }
    }
}


#[tauri::command]
async fn search_anime(
    query: String,
    page: Option<u32>,
    limit: Option<u32>,
    kind: Option<String>,
) -> Result<SearchResult, AppError> {
    let page = page.unwrap_or(1);
    let limit = limit.unwrap_or(20);

    if page < 1 {
        return Err(AppError::ValidationError("Страница должна быть >= 1".to_string()));
    }
    if limit < 1 || limit > 50 {
        return Err(AppError::ValidationError("Лимит должен быть от 1 до 50".to_string()));
    }

    let client = ShikicrateClient::new()
        .map_err(|e| AppError::ClientError(format!("{}", e)))?;
    
    use shikicrate::queries::AnimeSearchParams;
    
    let params = AnimeSearchParams {
        search: if query.is_empty() { None } else { Some(query) },
        limit: Some(limit as i32),
        page: Some(page as i32),
        kind: kind.clone(),
    };
    
    let animes = client
        .animes(params)
        .await
        .map_err(|e| AppError::ApiError(format!("{}", e)))?;
    
    let anime_list: Vec<Anime> = animes
        .into_iter()
        .map(|a| Anime {
            id: a.id,
            title: a.name,
            url: a.url.or_else(|| Some(format!("https://shikimori.one/animes/{}", a.id))),
            poster_url: a.poster.and_then(|p| p.main_url),
            description: a.description,
            score: a.score,
            kind: a.kind,
            status: a.status,
            episodes: a.episodes,
        })
        .collect();
    
    Ok(SearchResult {
        items: anime_list,
        page,
        limit,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![search_anime])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
