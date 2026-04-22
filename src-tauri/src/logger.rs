use flexi_logger::{Duplicate, FileSpec, Logger, WriteMode};

pub fn init_logger() -> Result<(), Box<dyn std::error::Error>> {
    // Auto-detect debug/release mode
    let log_level = if cfg!(debug_assertions) {
        std::env::var("LOG_LEVEL").unwrap_or_else(|_| "debug".to_string())
    } else {
        std::env::var("LOG_LEVEL").unwrap_or_else(|_| "info".to_string())
    };

    Logger::try_with_str(&log_level)?
        .log_to_file(FileSpec::default()
            .directory("logs")
            .basename("shikimore"))
        .write_mode(WriteMode::Direct)
        .duplicate_to_stderr(Duplicate::Info)
        .start()?;

    Ok(())
}

#[tauri::command]
pub fn log_message(level: String, message: String) {
    match level.as_str() {
        "error" => log::error!("{}", message),
        "warn" => log::warn!("{}", message),
        "info" => log::info!("{}", message),
        "debug" => log::debug!("{}", message),
        "trace" => log::trace!("{}", message),
        _ => log::info!("{}", message),
    }
}
