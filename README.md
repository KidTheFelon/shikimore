# Shikimore

Десктопное приложение для работы с Shikimori API на базе React + TypeScript + Tauri + shikicrate.

## Требования

- Node.js 18+
- Rust 1.70+
- Git (для работы с подмодулями)

## Установка

```bash
# Клонируй репозиторий с подмодулями
git clone --recursive <repository-url>
# Или если уже склонировал без --recursive
git submodule update --init --recursive

# Установка зависимостей фронтенда
npm install
```

Tauri CLI устанавливается автоматически как dev-зависимость через npm.

## Разработка

```bash
npm run tauri dev
```

## Тестирование

```bash
# Запуск тестов
npm test

# Запуск тестов с UI
npm run test:ui
```

## Сборка

```bash
npm run tauri build
```

## Структура проекта

- `src/` - React фронтенд
- `src-tauri/` - Rust бэкенд с Tauri
- `src-tauri/src/main.rs` - Tauri команды и интеграция с shikicrate
- `shikicrate/` - Git submodule, Rust клиент для Shikimori GraphQL API
