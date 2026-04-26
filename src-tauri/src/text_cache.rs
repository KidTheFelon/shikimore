use rusqlite::{params, Connection, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const CACHE_TTL_SECONDS: i64 = 7 * 24 * 60 * 60; // 7 дней

pub struct CacheMetrics {
    hits: AtomicU64,
    misses: AtomicU64,
}

impl CacheMetrics {
    fn new() -> Self {
        Self {
            hits: AtomicU64::new(0),
            misses: AtomicU64::new(0),
        }
    }

    pub fn record_hit(&self) {
        self.hits.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_miss(&self) {
        self.misses.fetch_add(1, Ordering::Relaxed);
    }

    pub fn get_stats(&self) -> (u64, u64) {
        (
            self.hits.load(Ordering::Relaxed),
            self.misses.load(Ordering::Relaxed),
        )
    }
}

pub struct TextCache {
    conn: Mutex<Connection>,
    metrics: CacheMetrics,
}

impl TextCache {
    pub fn new(db_path: PathBuf) -> SqliteResult<Self> {
        let conn = Connection::open(&db_path)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS text_cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON text_cache(created_at)",
            [],
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
            metrics: CacheMetrics::new(),
        })
    }

    pub fn get(&self, key: &str) -> SqliteResult<Option<String>> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT value FROM text_cache WHERE key = ?1 AND created_at > ?2")?;

        let result = stmt.query_row(params![key, now - CACHE_TTL_SECONDS], |row| row.get(0));

        match result {
            Ok(value) => {
                self.metrics.record_hit();
                Ok(Some(value))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                self.metrics.record_miss();
                Ok(None)
            }
            Err(e) => Err(e),
        }
    }

    pub fn set(&self, key: &str, value: &str) -> SqliteResult<()> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO text_cache (key, value, created_at) VALUES (?1, ?2, ?3)",
            params![key, value, now],
        )?;

        Ok(())
    }

    pub fn clear_expired(&self) -> SqliteResult<usize> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let conn = self.conn.lock().unwrap();
        let deleted = conn.execute(
            "DELETE FROM text_cache WHERE created_at < ?1",
            params![now - CACHE_TTL_SECONDS],
        )?;

        Ok(deleted)
    }
    pub fn invalidate(&self, key: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM text_cache WHERE key = ?1", [key])?;
        Ok(())
    }

    pub fn invalidate_pattern(&self, pattern: &str) -> SqliteResult<usize> {
        let conn = self.conn.lock().unwrap();
        let deleted = conn.execute("DELETE FROM text_cache WHERE key LIKE ?1", [pattern])?;
        Ok(deleted)
    }

    pub fn get_metrics(&self) -> (u64, u64) {
        self.metrics.get_stats()
    }
}

pub fn get_cache_db_path() -> Result<PathBuf, String> {
    let mut db_path =
        std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    db_path.pop(); // Remove exe filename
    db_path.push("text_cache.db");
    Ok(db_path)
}

pub fn cache_key_anime(id: i64) -> String {
    format!("anime:{}", id)
}

pub fn cache_key_manga(id: i64) -> String {
    format!("manga:{}", id)
}

pub fn cache_key_user_rate(user_id: i64, target_id: i64, target_type: &str) -> String {
    format!("user_rate:{}:{}:{}", user_id, target_id, target_type)
}
