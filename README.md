# Shikimore

Десктопное приложение для работы с Shikimori API на базе React + TypeScript + Tauri + shikicrate.

## Требования

- Node.js 18+
- Rust 1.70+
- Tauri CLI

## Установка

```bash
# Установка зависимостей фронтенда
npm install

# Установка Tauri CLI (если еще не установлен)
cargo install tauri-cli
```

## Разработка

```bash
npm run tauri dev
```

## Сборка

```bash
npm run tauri build
```

## Структура проекта

- `src/` - React фронтенд
- `src-tauri/` - Rust бэкенд с Tauri
- `src-tauri/src/main.rs` - Tauri команды и интеграция с shikicrate
