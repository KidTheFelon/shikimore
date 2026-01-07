import React, { useRef } from 'react';
import { 
  ContentItem, 
  ContentType, 
  AppSettings, 
  Genre, 
  Studio, 
  Publisher,
  SortOption
} from '../types';
import { FilterBar } from './FilterBar';
import { ContentCard } from './ContentCard';
import { SkeletonCard } from './common/SkeletonCard';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorIcon, EmptyIcon } from './icons';

interface MainScreenProps {
  contentType: ContentType;
  setContentType: (type: ContentType) => void;
  contentList: ContentItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onRetry: () => void;
  onItemClick: (item: ContentItem) => void;
  settings: AppSettings | null;
  
  // Search & Filter Props
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchHistory: string[];
  setSearchHistory: (h: string[]) => void;
  showHistory: boolean;
  setShowHistory: (s: boolean) => void;
  isSearching: boolean;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSearchFocus: () => void;
  handleHistorySelect: (query: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  
  showFilters: boolean;
  setShowFilters: (s: boolean) => void;
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
  setShowGenres: (s: boolean) => void;
  genreFilter: string;
  setGenreFilter: (f: string) => void;
  allGenres: Genre[];
  expandedLetters: string[];
  setExpandedLetters: (l: string[] | ((prev: string[]) => string[])) => void;
  handleGenreToggle: (g: Genre) => void;
  
  sortBy: SortOption;
  handleSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  
  // Intersection Observer
  lastElementRef: (node: HTMLDivElement | null) => void;
  
  // Methods for FilterBar reset
  setCurrentPage: (p: number) => void;
  setHasMore: (h: boolean) => void;
  setContentList: (l: ContentItem[]) => void;
  
  // Accent colors for cards
  cardColors: Record<number, string>;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => void;
  onCopyLink: (e: React.MouseEvent, url: string) => void;
}

export const MainScreen: React.FC<MainScreenProps> = (props) => {
  const contentItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <>
      <FilterBar 
        searchQuery={props.searchQuery}
        setSearchQuery={props.setSearchQuery}
        contentType={props.contentType}
        isSearching={props.isSearching}
        showHistory={props.showHistory}
        searchHistory={props.searchHistory}
        setSearchHistory={props.setSearchHistory}
        handleSearchChange={props.handleSearchChange}
        handleSearchKeyDown={props.handleSearchKeyDown}
        handleSearchFocus={props.handleSearchFocus}
        handleHistorySelect={props.handleHistorySelect}
        searchInputRef={props.searchInputRef}
        showFilters={props.showFilters}
        setShowFilters={props.setShowFilters}
        kindFilter={props.kindFilter}
        handleKindChange={props.handleKindChange}
        statusFilter={props.statusFilter}
        handleStatusChange={props.handleStatusChange}
        studioFilter={props.studioFilter}
        studioInput={props.studioInput}
        handleStudioChange={props.handleStudioChange}
        handleStudioKeyDown={props.handleStudioKeyDown}
        isSearchingStudios={props.isSearchingStudios}
        showStudioSuggestions={props.showStudioSuggestions}
        studioSuggestions={props.studioSuggestions}
        handleStudioSelect={props.handleStudioSelect}
        showGenres={props.showGenres}
        setShowGenres={props.setShowGenres}
        genreFilter={props.genreFilter}
        setGenreFilter={props.setGenreFilter}
        allGenres={props.allGenres}
        expandedLetters={props.expandedLetters}
        setExpandedLetters={props.setExpandedLetters}
        handleGenreToggle={props.handleGenreToggle}
        sortBy={props.sortBy}
        handleSortChange={props.handleSortChange}
        setCurrentPage={props.setCurrentPage}
        setHasMore={props.setHasMore}
        setContentList={props.setContentList}
      />

      {props.loading && (
        <div className="status-message loading" role="status" aria-live="polite">
          <LoadingSpinner aria-label="Загрузка" />
        </div>
      )}

      {props.error && (
        <div className="status-message error" role="alert">
          <ErrorIcon />
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ошибка</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', opacity: 0.9 }}>{props.error}</p>
          <button
            onClick={props.onRetry}
            className="retry-btn"
            aria-label="Повторить попытку"
          >
            Повторить попытку
          </button>
        </div>
      )}

      {!props.loading && !props.error && props.contentList.length === 0 && (props.searchQuery || props.contentType === "characters") && (
        <div className="status-message empty">
          <EmptyIcon />
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ничего не найдено</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
            Попробуйте изменить запрос или фильтры
          </p>
        </div>
      )}

      {!props.loading && !props.error && props.contentList.length === 0 && !props.searchQuery && props.contentType !== "characters" && (
        <div className="status-message empty">
          <EmptyIcon />
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Начните поиск</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
            {props.contentType === "anime" ? "Введите название аниме в поле поиска" :
             props.contentType === "manga" ? "Введите название манги в поле поиска" :
             "Введите имя в поле поиска"}
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
                  onClick={() => props.setSearchQuery(example)}
                  type="button"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {props.loading && (
        <div className="anime-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!props.loading && !props.error && props.contentList.length > 0 && (
        <>
          <div className="results-count">
            Найдено: {props.contentList.length} {props.contentList.length === 1 ? 'результат' : 'результатов'}
            {props.hasMore && ' • Прокрутите вниз для загрузки'}
          </div>
          <div className={`anime-list ${props.settings?.view_mode === 'list' ? 'view-list' : 'view-grid'}`} role="list">
            {props.contentList.map((item, index) => (
              <ContentCard 
                key={item.id}
                item={item}
                settings={props.settings}
                cardColor={props.cardColors[item.id]}
                onItemClick={props.onItemClick}
                onCopyLink={props.onCopyLink}
                onImageLoad={props.onImageLoad}
                innerRef={(el) => {
                  if (index === props.contentList.length - 1) {
                    props.lastElementRef(el);
                  }
                  contentItemsRef.current[index] = el;
                }}
              />
            ))}
          </div>
        </>
      )}

      {props.loadingMore && (
        <div className="loading-more" style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
          <LoadingSpinner />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Загрузка...</p>
        </div>
      )}
    </>
  );
};
