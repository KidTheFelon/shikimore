import React from 'react';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorIcon, EmptyIcon } from './icons';
import { Genre, Studio, Publisher, ContentType } from '../types';

// Reuse existing SearchIcon if available, or define here
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  contentType: ContentType;
  isSearching: boolean;
  showHistory: boolean;
  searchHistory: string[];
  setSearchHistory: (history: string[]) => void;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSearchFocus: () => void;
  handleHistorySelect: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  kindFilter: string;
  handleKindChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  statusFilter: string;
  handleStatusChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  studioFilter: string;
  studioInput: string;
  handleStudioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStudioKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isSearchingStudios: boolean;
  showStudioSuggestions: boolean;
  studioSuggestions: (Studio | Publisher)[];
  handleStudioSelect: (id: number, name: string) => void;
  
  showGenres: boolean;
  setShowGenres: (show: boolean) => void;
  genreFilter: string;
  setGenreFilter: (filter: string) => void;
  allGenres: Genre[];
  expandedLetters: string[];
  setExpandedLetters: (letters: string[] | ((prev: string[]) => string[])) => void;
  handleGenreToggle: (genre: Genre) => void;
  
  sortBy: string;
  handleSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setContentList: (list: any[]) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery, setSearchQuery, contentType, isSearching, showHistory, searchHistory, setSearchHistory,
  handleSearchChange, handleSearchKeyDown, handleSearchFocus, handleHistorySelect, searchInputRef,
  showFilters, setShowFilters, kindFilter, handleKindChange, statusFilter, handleStatusChange,
  studioFilter, studioInput, handleStudioChange, handleStudioKeyDown, isSearchingStudios, showStudioSuggestions,
  studioSuggestions, handleStudioSelect, showGenres, setShowGenres, genreFilter, setGenreFilter,
  allGenres, expandedLetters, setExpandedLetters, handleGenreToggle, sortBy, handleSortChange,
  setCurrentPage, setHasMore, setContentList
}) => {
  return (
    <div className="search-controls">
      <div className="search-bar-wrapper liquid-search">
        <div className="search-icon-wrapper">
          <SearchIcon />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder={
            contentType === "anime" ? "Поиск аниме..." : 
            contentType === "manga" ? "Поиск манги..." : 
            contentType === "characters" ? "Поиск персонажей..." : "Поиск..."
          }
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          onFocus={handleSearchFocus}
          aria-label={`Поиск ${contentType === "anime" ? "аниме" : "манги"}`}
          aria-describedby="search-hint"
        />
        {searchQuery && (
          <button 
            className="search-clear-btn" 
            onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
            aria-label="Очистить поиск"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4L4 12M4 4l8 8" />
            </svg>
          </button>
        )}
        {isSearching && (
          <div className="search-indicator" aria-label="Поиск..." />
        )}
        {showHistory && searchHistory.length > 0 && (
          <div className="search-history">
            <div className="search-history-header">
              <span>Недавние запросы</span>
              <button 
                className="clear-history-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchHistory([]);
                  localStorage.removeItem("shikimore_search_history");
                }}
                type="button"
              >
                Очистить всё
              </button>
            </div>
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
      
      <div className={`filters-spoiler ${showFilters ? "is-expanded" : ""}`}>
        <button 
          type="button"
          className={`filters-toggle-btn ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'transform 0.3s', transform: showFilters ? 'rotate(180deg)' : 'rotate(0)' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {showFilters ? "Скрыть фильтры" : "Дополнительные фильтры"}
          {(kindFilter || statusFilter || studioFilter || genreFilter || sortBy !== "relevance") && (
            <span className="filter-dot" />
          )}
        </button>
        
        <div className="filters-expand-wrapper">
          <div className="search-controls-row">
            {(contentType === "anime" || contentType === "manga") && (
              <>
              <select
                className="kind-filter"
                value={kindFilter}
                onChange={handleKindChange}
                aria-label="Фильтр по типу"
              >
                <option value="">Все типы</option>
                {contentType === "anime" ? (
                  <>
                    <option value="tv">ТВ</option>
                    <option value="movie">Фильм</option>
                    <option value="ova">OVA</option>
                    <option value="ona">ONA</option>
                    <option value="special">Спешл</option>
                    <option value="tv_special">ТВ-спешл</option>
                    <option value="music">Клип</option>
                  </>
                ) : (
                  <>
                    <option value="manga">Манга</option>
                    <option value="novel">Ранобэ</option>
                    <option value="one_shot">Ваншот</option>
                    <option value="doujin">Додзинси</option>
                    <option value="manhwa">Манхва</option>
                    <option value="manhua">Маньхуа</option>
                  </>
                )}
              </select>
              <select
                className="kind-filter"
                value={statusFilter}
                onChange={handleStatusChange}
                aria-label="Фильтр по статусу"
              >
                <option value="">Все статусы</option>
                <option value="anons">Анонс</option>
                <option value="ongoing">Онгоинг</option>
                <option value="released">Вышло</option>
              </select>
              <div className="filter-wrapper">
                <input
                  type="text"
                  className="kind-filter studio-filter-input"
                  placeholder={contentType === "anime" ? "Студия..." : "Изд-во..."}
                  value={studioInput}
                  onChange={handleStudioChange}
                  onKeyDown={handleStudioKeyDown}
                  onFocus={() => {
                    if (studioSuggestions.length > 0) {
                      // Handled by parent logic usually
                    }
                  }}
                  title={contentType === "anime" ? "Поиск по названию или ID студии" : "Поиск по названию или ID издательства"}
                />
                {isSearchingStudios && (
                  <div className="search-indicator studio-indicator" />
                )}
                {showStudioSuggestions && studioSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {studioSuggestions.map((s) => (
                      <button
                        key={s.id}
                        className="search-history-item"
                        onClick={() => handleStudioSelect(s.id, s.name)}
                        type="button"
                      >
                        <span className="suggestion-name">{s.name}</span>
                        <span className="suggestion-id">ID: {s.id}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showStudioSuggestions && studioSuggestions.length === 0 && studioInput.length >= 2 && !isSearchingStudios && (
                  <div className="suggestions-dropdown">
                    <div className="search-history-item no-results">
                      Ничего не найдено
                    </div>
                  </div>
                )}
              </div>
              <div className="filter-wrapper">
                <button
                  type="button"
                  className={`kind-filter genre-toggle-btn ${showGenres ? "active" : ""} ${genreFilter ? "has-filters" : ""}`}
                  onClick={() => setShowGenres(!showGenres)}
                >
                  Жанры
                  {genreFilter && (
                    <span className="genre-count">
                      {genreFilter.split(",").filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
              </>
            )}
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
        </div>
      </div>
      
      {showGenres && (contentType === "anime" || contentType === "manga") && (
        <div className="genres-spoiler-content">
          {allGenres.length === 0 ? (
            <div className="status-message loading-mini">
              <LoadingSpinner size="small" />
              <span>Загрузка жанров...</span>
            </div>
          ) : (
            <div className="genres-by-letters">
              <div className="letters-selector">
                {Array.from(new Set(
                  allGenres
                    .filter(g => {
                      const kind = g.kind?.toLowerCase();
                      if (kind === "genre") return true;
                      const target = contentType === "anime" ? "anime" : "manga";
                      return kind === target;
                    })
                    .map(g => (g.russian || g.name)[0].toUpperCase())
                )).sort().map(letter => (
                  <button
                    key={letter}
                    className={`letter-btn ${expandedLetters.includes(letter) ? "active" : ""}`}
                    onClick={() => {
                      setExpandedLetters((prev: string[]) => 
                        prev.includes(letter) 
                          ? prev.filter(l => l !== letter) 
                          : [...prev, letter]
                      );
                    }}
                    type="button"
                  >
                    {letter}
                  </button>
                ))}
              </div>
              
              {expandedLetters.length > 0 && (
                <div className="expanded-genres-area">
                  {expandedLetters.sort().map(letter => (
                    <div key={letter} className="expanded-letter-group">
                      <div className="group-header">{letter}</div>
                      <div className="genres-grid">
                        {(() => {
                          const selectedGenreIds = genreFilter.split(",");
                          return allGenres
                            .filter(g => {
                              const kind = g.kind?.toLowerCase();
                              const target = contentType === "anime" ? "anime" : "manga";
                              const matchKind = kind === "genre" || kind === target;
                              return matchKind && (g.russian || g.name)[0].toUpperCase() === letter;
                            })
                            .sort((a, b) => (a.russian || a.name).localeCompare(b.russian || b.name))
                            .map(g => {
                              const genreIds = (g as any).ids || [g.id];
                              const isSelected = genreIds.some((id: number) => selectedGenreIds.includes(id.toString()));
                              return (
                                <button
                                  key={g.id}
                                  className={`genre-mini-chip clickable ${isSelected ? "active" : ""}`}
                                  onClick={() => handleGenreToggle(g)}
                                  type="button"
                                >
                                  {g.russian || g.name}
                                </button>
                              );
                            });
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="genres-spoiler-actions">
            {genreFilter && (
              <button 
                className="clear-genres-btn"
                onClick={() => {
                  setGenreFilter("");
                  setCurrentPage(1);
                  setHasMore(true);
                  setContentList([]);
                }}
              >
                Сбросить все жанры ({genreFilter.split(",").filter(Boolean).length})
              </button>
            )}
            {expandedLetters.length > 0 && (
              <button 
                className="clear-genres-btn secondary"
                onClick={() => setExpandedLetters([])}
              >
                Свернуть все буквы
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
