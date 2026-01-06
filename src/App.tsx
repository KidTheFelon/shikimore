import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";

interface Anime {
  id: number;
  title: string;
  url?: string;
  poster_url?: string;
  description?: string;
  score?: number;
  kind?: string;
  status?: string;
  episodes?: number;
}

interface SearchResult {
  items: Anime[];
  page: number;
  limit: number;
}

type SortOption = "relevance" | "score" | "title";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function App() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(20);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const animeItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  const appWindow = getCurrentWindow();

  // Загрузка сохраненного поиска и истории
  useEffect(() => {
    const saved = localStorage.getItem("shikimore_last_search");
    if (saved) {
      setSearchQuery(saved);
    }
    const history = localStorage.getItem("shikimore_search_history");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch {
        // ignore
      }
    }
  }, []);

  // Сохранение поиска
  useEffect(() => {
    if (searchQuery) {
      localStorage.setItem("shikimore_last_search", searchQuery);
    }
  }, [searchQuery]);

  // Toast уведомления
  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowHistory(true);
      }
      if (e.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          setSearchQuery("");
          searchInputRef.current?.blur();
        }
        setShowHistory(false);
      }
      // Навигация по карточкам стрелками
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && animeItemsRef.current.length > 0) {
        const currentIndex = animeItemsRef.current.findIndex(
          (el) => el === document.activeElement
        );
        if (currentIndex !== -1) {
          e.preventDefault();
          const nextIndex = e.key === "ArrowDown" 
            ? Math.min(currentIndex + 1, animeItemsRef.current.length - 1)
            : Math.max(currentIndex - 1, 0);
          animeItemsRef.current[nextIndex]?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [animeList.length]);

  // Закрытие истории при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        showHistory &&
        !target.closest(".search-input-wrapper") &&
        !target.closest(".search-history")
      ) {
        setShowHistory(false);
      }
    };

    if (showHistory) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showHistory]);

  // Отслеживание прокрутки для уменьшения header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsHeaderScrolled(scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchAnime = useCallback(async (query: string, page: number, kind: string, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    
    try {
      const result = await invoke<SearchResult>("search_anime", {
        query,
        page,
        limit,
        kind: kind || undefined,
      });
      
      let sorted = [...result.items];
      if (sortBy === "score") {
        sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (sortBy === "title") {
        sorted.sort((a, b) => a.title.localeCompare(b.title));
      }
      
      if (append) {
        setAnimeList(prev => [...prev, ...sorted]);
      } else {
        setAnimeList(sorted);
      }
      
      setHasMore(result.items.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка при загрузке";
      setError(errorMessage);
      if (!append) {
        setAnimeList([]);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [limit, sortBy]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (searchQuery) {
      setIsSearching(true);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setIsSearching(false);
      if (searchQuery) {
        setCurrentPage(1);
        setHasMore(true);
        fetchAnime(searchQuery, 1, kindFilter, false);
        if (!searchHistory.includes(searchQuery)) {
          const newHistory = [searchQuery, ...searchHistory.filter((q) => q !== searchQuery)].slice(0, 5);
          setSearchHistory(newHistory);
          localStorage.setItem("shikimore_search_history", JSON.stringify(newHistory));
        }
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, kindFilter, fetchAnime, searchHistory]);

  // Ленивая пагинация при прокрутке
  useEffect(() => {
    const handleScroll = () => {
      if (!loading && !loadingMore && hasMore && searchQuery && animeList.length > 0) {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        // Загружаем следующую страницу когда дошли до 80% от конца
        if (scrollTop + windowHeight >= documentHeight * 0.8) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchAnime(searchQuery, nextPage, kindFilter, true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, loadingMore, hasMore, searchQuery, currentPage, kindFilter, fetchAnime, animeList.length]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    setHasMore(true);
    setAnimeList([]);
    setShowHistory(e.target.value.length === 0 && searchHistory.length > 0);
  };

  const handleSearchFocus = () => {
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      fetchAnime(searchQuery, 1, kindFilter);
    }
  };

  const handleKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setKindFilter(e.target.value);
    setCurrentPage(1);
    setHasMore(true);
    setAnimeList([]);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
    setCurrentPage(1);
    setHasMore(true);
    setAnimeList([]);
  };

  const handleRetry = () => {
    fetchAnime(searchQuery, currentPage, kindFilter);
  };

  const handleAnimeClick = (anime: Anime) => {
    if (anime.url) {
      window.open(anime.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyLink = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Ссылка скопирована", "success");
    } catch (err) {
      showToast("Не удалось скопировать ссылку", "error");
      console.error("Failed to copy:", err);
    }
  };

  const handleHistorySelect = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
    searchInputRef.current?.blur();
  };

  const SearchIcon = () => (
    <svg className="search-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 19L14.65 14.65"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const ExternalLinkIcon = () => (
    <svg className="anime-link-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2H14V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10L14 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 9V14H2V2H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const ErrorIcon = () => (
    <svg className="status-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const EmptyIcon = () => (
    <svg className="status-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const SkeletonCard = () => (
    <div className="anime-item">
      <div className="skeleton skeleton-poster" />
      <div className="anime-content">
        <div className="skeleton skeleton-text short" />
        <div className="skeleton skeleton-text medium" />
        <div className="skeleton-meta">
          <div className="skeleton skeleton-badge" />
          <div className="skeleton skeleton-badge" />
        </div>
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text short" />
      </div>
    </div>
  );

  const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 3.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v1a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h1v1zM4 4.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H4z"/>
    </svg>
  );

  return (
    <div className="container">
      <header className={`header ${isHeaderScrolled ? "header-scrolled" : ""}`} data-tauri-drag-region>
        <div className="header-content">
          <div className="header-text">
            <h1>Shikimore</h1>
            {!isHeaderScrolled && (
              <p className="header-subtitle">
                Нажмите <kbd>Ctrl+K</kbd> для быстрого поиска
              </p>
            )}
          </div>
        </div>
        <div className="window-controls">
          <button
            className="window-control-btn"
            onClick={(e) => {
              e.stopPropagation();
              appWindow.minimize().catch(console.error);
            }}
            title="Свернуть"
            aria-label="Свернуть"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="window-control-btn"
            onClick={(e) => {
              e.stopPropagation();
              appWindow.toggleMaximize().catch(console.error);
            }}
            title="Развернуть"
            aria-label="Развернуть"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 2h8v8H2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="window-control-btn window-control-close"
            onClick={(e) => {
              e.stopPropagation();
              appWindow.close().catch(console.error);
            }}
            title="Закрыть"
            aria-label="Закрыть"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="search-controls">
        <div className="search-input-wrapper">
          <SearchIcon />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Поиск аниме... (Enter для поиска)"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={handleSearchFocus}
            aria-label="Поиск аниме"
            aria-describedby="search-hint"
          />
          {isSearching && (
            <div className="search-indicator" aria-label="Поиск..." />
          )}
          {showHistory && searchHistory.length > 0 && (
            <div className="search-history">
              <div className="search-history-header">Недавние запросы</div>
              {searchHistory.map((query, idx) => (
                <button
                  key={idx}
                  className="search-history-item"
                  onClick={() => handleHistorySelect(query)}
                  type="button"
                >
                  <SearchIcon />
                  {query}
                </button>
              ))}
            </div>
          )}
          <span id="search-hint" className="sr-only">
            Используйте Enter для поиска, Esc для очистки
          </span>
        </div>
        <select
          className="kind-filter"
          value={kindFilter}
          onChange={handleKindChange}
          aria-label="Фильтр по типу"
        >
          <option value="">Все типы</option>
          <option value="tv">TV</option>
          <option value="movie">Movie</option>
          <option value="ova">OVA</option>
          <option value="ona">ONA</option>
          <option value="special">Special</option>
          <option value="music">Music</option>
        </select>
        <select
          className="kind-filter sort-filter"
          value={sortBy}
          onChange={handleSortChange}
          aria-label="Сортировка"
          title="Сортировка результатов"
        >
          <option value="relevance">По релевантности</option>
          <option value="score">По рейтингу</option>
          <option value="title">По названию</option>
        </select>
      </div>

      {loading && (
        <div className="status-message loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-label="Загрузка" />
        </div>
      )}

      {error && (
        <div className="status-message error" role="alert">
          <ErrorIcon />
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ошибка</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', opacity: 0.9 }}>{error}</p>
          <button
            onClick={handleRetry}
            className="retry-btn"
            aria-label="Повторить попытку"
          >
            Повторить попытку
          </button>
        </div>
      )}

      {!loading && !error && animeList.length === 0 && searchQuery && (
        <div className="status-message empty">
          <EmptyIcon />
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ничего не найдено</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
            Попробуйте изменить запрос или фильтры
          </p>
        </div>
      )}

      {!loading && !error && animeList.length === 0 && !searchQuery && (
        <div className="status-message empty">
          <EmptyIcon />
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Начните поиск</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
            Введите название аниме в поле поиска
          </p>
          <div className="search-examples">
            <p style={{ margin: '1.5rem 0 0.75rem', fontSize: '0.9rem', opacity: 0.7 }}>
              Попробуйте найти:
            </p>
            <div className="example-queries">
              {["Наруто", "Атака титанов", "Ван Пис", "Демон-убийца"].map((example) => (
                <button
                  key={example}
                  className="example-query-btn"
                  onClick={() => setSearchQuery(example)}
                  type="button"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="anime-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && !error && animeList.length > 0 && (
        <>
          <div className="results-count">
            Найдено: {animeList.length} {animeList.length === 1 ? 'результат' : 'результатов'}
            {hasMore && ' • Прокрутите вниз для загрузки'}
          </div>
          <div className="anime-list" role="list">
            {animeList.map((anime, index) => (
              <div
                key={anime.id}
                ref={(el) => {
                  animeItemsRef.current[index] = el;
                }}
                className="anime-item"
                role="listitem"
                onClick={() => handleAnimeClick(anime)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleAnimeClick(anime);
                  }
                }}
                tabIndex={0}
                aria-label={`${anime.title}, рейтинг ${anime.score || "неизвестен"}`}
              >
                <div className="anime-poster-wrapper">
                  {anime.poster_url ? (
                    <img
                      src={anime.poster_url}
                      alt={anime.title}
                      className="anime-poster"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="anime-poster-placeholder" style={{ display: anime.poster_url ? 'none' : 'flex' }}>
                    Нет изображения
                  </div>
                </div>
                <div className="anime-content">
                  <h3 className="anime-title">{anime.title}</h3>
                  <div className="anime-meta">
                    {anime.score && (
                      <span className="anime-score">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        {anime.score.toFixed(1)}
                      </span>
                    )}
                    {anime.kind && (
                      <span className="anime-kind">{anime.kind.toUpperCase()}</span>
                    )}
                    {anime.status && (
                      <span className="anime-status">{anime.status}</span>
                    )}
                    {anime.episodes && (
                      <span className="anime-episodes">{anime.episodes} эп.</span>
                    )}
                  </div>
                  {anime.description && (
                    <p className="anime-description">{anime.description}</p>
                  )}
                  {anime.url && (
                    <div className="anime-actions">
                      <a
                        href={anime.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="anime-link"
                        onClick={(e) => e.stopPropagation()}
                        title="Открыть на Shikimori"
                        aria-label="Открыть на Shikimori"
                      >
                        Открыть на Shikimori
                        <ExternalLinkIcon />
                      </a>
                      <button
                        onClick={(e) => handleCopyLink(e, anime.url!)}
                        className="copy-link-btn"
                        title="Копировать ссылку"
                        aria-label="Копировать ссылку"
                      >
                        <CopyIcon />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {loadingMore && (
        <div className="loading-more" style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
          <div className="loading-spinner" aria-label="Загрузка" />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Загрузка...</p>
        </div>
      )}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === "success" && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM4.5 4.5a.5.5 0 01.707 0L8 7.293l2.793-2.793a.5.5 0 11.707.707L8.707 8l2.793 2.793a.5.5 0 01-.707.707L8 8.707l-2.793 2.793a.5.5 0 01-.707-.707L7.293 8 4.5 5.207a.5.5 0 010-.707z" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
