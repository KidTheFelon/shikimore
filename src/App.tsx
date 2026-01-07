import { useState, useEffect, useCallback, useRef } from "react";
import { open as openUrl } from "@tauri-apps/plugin-shell";

// Components
import DetailView from "./components/DetailView";
import CharacterDetailView from "./components/CharacterDetailView";
import SettingsView from "./components/SettingsView";
import { MainScreen } from "./components/MainScreen";
import { FloatingTabs } from "./components/FloatingTabs";
import { TitleBar } from "./components/TitleBar";
import { ToastContainer } from "./components/common/Toast";

// Hooks & Services
import { api } from "./services/api";
import { useAppSettings } from "./hooks/useAppSettings";
import { useShikimoriApi } from "./hooks/useShikimoriApi";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";

// Types
import { 
  ContentItem, 
  ContentType, 
  AnimeDetail, 
  MangaDetail, 
  CharacterDetail,
  Genre,
  Studio,
  Publisher,
  SortOption,
  Toast,
  ApiError
} from "./types";

import "./App.css";

function App() {
  const { settings, updateSettings } = useAppSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [contentType, setContentType] = useState<ContentType>("anime");
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [studioFilter, setStudioFilter] = useState<string>("");
  const [studioInput, setStudioInput] = useState<string>("");
  const [genreFilter, setGenreFilter] = useState<string>("");
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [studioSuggestions, setStudioSuggestions] = useState<Studio[] | Publisher[]>([]);
  const [isSearchingStudios, setIsSearchingStudios] = useState(false);
  const [showStudioSuggestions, setShowStudioSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showGenres, setShowGenres] = useState(false);
  const [expandedLetters, setExpandedLetters] = useState<string[]>([]);
  
  // UI State
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cardColors, setCardColors] = useState<Record<number, string>>({});
  
  // Navigation State
  const [selectedItem, setSelectedItem] = useState<{ type: ContentType; id: number } | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<{ type: ContentType; id: number }[]>([]);
  const [detailData, setDetailData] = useState<AnimeDetail | MangaDetail | CharacterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Custom Hooks
  const {
    contentList,
    setContentList,
    loading,
    loadingMore,
    error,
    setError,
    setCurrentPage,
    hasMore,
    setHasMore,
    search
  } = useShikimoriApi();

  const { searchHistory, setSearchHistory, addToHistory } = useSearchHistory();
  
  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      search({
        query: searchQuery,
        contentType,
        kindFilter,
        statusFilter,
        genreFilter,
        studioFilter,
        sortBy,
        limit: 20
      }, false);
    }
  }, [loading, loadingMore, hasMore, search, searchQuery, contentType, kindFilter, statusFilter, genreFilter, studioFilter, sortBy]);

  const { lastElementRef } = useInfiniteScroll(handleLoadMore, hasMore, loading || loadingMore);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load last search
  useEffect(() => {
    const saved = localStorage.getItem("shikimore_last_search");
    if (saved) setSearchQuery(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("shikimore_last_search", searchQuery);
  }, [searchQuery]);

  // Fetch Genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genres = await api.getGenres();
        const genresByName = new Map<string, Genre & { ids: number[] }>();
        genres.forEach(g => {
          const key = g.russian || g.name;
          const existing = genresByName.get(key);
          if (existing) {
            if (!existing.ids.includes(g.id)) existing.ids.push(g.id);
          } else {
            genresByName.set(key, { ...g, ids: [g.id] } as any);
          }
        });
        setAllGenres(Array.from(genresByName.values()) as any);
      } catch (err) {
        console.error("Ошибка загрузки жанров:", err);
      }
    };
    fetchGenres();
  }, []);

  // Toast
  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Search logic
  const performSearch = useCallback((q: string = searchQuery) => {
    if (contentType === "characters" || contentType === "people") {
      if (!q.trim()) {
        setContentList([]);
        setHasMore(false);
        return;
      }
    }
    
    search({
      query: q,
      contentType,
      kindFilter,
      statusFilter,
      genreFilter,
      studioFilter,
      sortBy,
      limit: 20
    });
    
    if (q.trim()) addToHistory(q);
        setShowHistory(false);
  }, [searchQuery, contentType, kindFilter, statusFilter, genreFilter, studioFilter, sortBy, search, setContentList, setHasMore, addToHistory]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      performSearch();
      searchInputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setSearchQuery("");
      setShowHistory(false);
    }
  };

  const handleHistorySelect = (query: string) => {
    setSearchQuery(query);
    performSearch(query);
    setShowHistory(false);
  };

  const handleStudioSelect = (id: number, name: string) => {
    const newFilter = id.toString();
    setStudioFilter(newFilter);
    setStudioInput(name);
    setShowStudioSuggestions(false);
    
    // Передаем новый фильтр напрямую, чтобы не ждать обновления стейта
    search({
      query: searchQuery,
      contentType,
      kindFilter,
      statusFilter,
      genreFilter,
      studioFilter: newFilter,
      sortBy,
      limit: 20
    });
    
    if (searchQuery.trim()) addToHistory(searchQuery);
    setShowHistory(false);
  };

  // Studio Suggestions
  useEffect(() => {
    if (studioInput.length < 2 || studioInput === studioFilter) {
      setStudioSuggestions([]);
      setShowStudioSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingStudios(true);
        try {
        const results = contentType === "anime" 
          ? await api.searchStudios(studioInput)
          : await api.searchPublishers(studioInput);
          setStudioSuggestions(results);
          setShowStudioSuggestions(true);
        } catch (err) {
        console.error("Error fetching suggestions:", err);
        } finally {
          setIsSearchingStudios(false);
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [studioInput, contentType, studioFilter]);

  // Detail loading
  useEffect(() => {
    if (!selectedItem) {
      setDetailData(null);
      return;
    }

    const fetchDetail = async () => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
        let data;
        if (selectedItem.type === "anime") data = await api.getAnimeById(selectedItem.id);
        else if (selectedItem.type === "manga") data = await api.getMangaById(selectedItem.id);
        else data = await api.getCharacterDetails(selectedItem.id);
        setDetailData(data);
    } catch (err) {
        const apiErr = err as ApiError;
        setDetailError(apiErr.message || "Ошибка загрузки деталей");
    } finally {
      setLoadingDetail(false);
    }
    };

    fetchDetail();
  }, [selectedItem]);

  const handleContentClick = (item: ContentItem) => {
    const type = "title" in item ? (("episodes" in item) ? "anime" : "manga") : (("is_seyu" in item) ? "people" : "characters");
    if (type === "people" && "url" in item && item.url) {
      openUrl(item.url);
      return;
    }
    if (selectedItem) setNavigationHistory(prev => [...prev, selectedItem]);
    setSelectedItem({ type: type as ContentType, id: item.id });
  };

  const handleBack = () => {
    if (navigationHistory.length > 0) {
      const prev = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setSelectedItem(prev);
    } else {
      setSelectedItem(null);
    }
  };

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    setSelectedItem(null);
    setNavigationHistory([]);
    setContentList([]);
    setHasMore(true);
    setCurrentPage(1);
    setError(null);
  };

  const handleImageLoad = async (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => {
    const url = e.currentTarget.src;
    if (url && !cardColors[id]) {
      try {
        const color = await api.getAccentColor(url);
        setCardColors(prev => ({ ...prev, [id]: color }));
      } catch (err) {}
    }
  };

  const handleCopyLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    showToast("Ссылка скопирована");
  };

  return (
    <div className="app-container">
      <TitleBar />
      {selectedItem ? (
            selectedItem.type === "characters" ? (
          <CharacterDetailView
            data={detailData as CharacterDetail}
            loading={loadingDetail}
            error={detailError}
            onBack={handleBack}
            onNavigate={(type, id) => {
              setNavigationHistory(prev => [...prev, selectedItem]);
              setSelectedItem({ type, id });
            }}
            settings={settings}
          />
        ) : (
          <DetailView
            data={detailData as AnimeDetail | MangaDetail}
            type={selectedItem.type as "anime" | "manga"}
            loading={loadingDetail}
            error={detailError}
            onBack={handleBack}
            onNavigate={(type, id) => {
              setNavigationHistory(prev => [...prev, selectedItem]);
              setSelectedItem({ type, id });
            }}
            onSearchGenre={(id) => {
              setSelectedItem(null);
              setNavigationHistory([]);
              if (id !== -1) setGenreFilter(id.toString());
              performSearch();
            }}
            onSearchStudio={(id, name) => {
              setSelectedItem(null);
              setNavigationHistory([]);
              setStudioInput(name);
              setStudioFilter(id.toString());
              performSearch();
            }}
            settings={settings}
          />
        )
      ) : (
        <MainScreen 
          contentType={contentType}
          setContentType={handleContentTypeChange}
          contentList={contentList}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          hasMore={hasMore}
          onRetry={performSearch}
          onItemClick={handleContentClick}
          settings={settings}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchHistory={searchHistory}
          setSearchHistory={setSearchHistory}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          isSearching={loading}
          handleSearchChange={(e) => setSearchQuery(e.target.value)}
          handleSearchKeyDown={handleSearchKeyDown}
          handleSearchFocus={() => setShowHistory(true)}
          handleHistorySelect={handleHistorySelect}
          searchInputRef={searchInputRef}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          kindFilter={kindFilter}
          handleKindChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setKindFilter(e.target.value); }}
          statusFilter={statusFilter}
          handleStatusChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setStatusFilter(e.target.value); }}
          studioFilter={studioFilter}
          studioInput={studioInput}
          handleStudioChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudioInput(e.target.value)}
          handleStudioKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
          isSearchingStudios={isSearchingStudios}
          showStudioSuggestions={showStudioSuggestions}
          studioSuggestions={studioSuggestions}
          handleStudioSelect={handleStudioSelect}
          showGenres={showGenres}
          setShowGenres={setShowGenres}
          genreFilter={genreFilter}
          setGenreFilter={setGenreFilter}
          allGenres={allGenres}
          expandedLetters={expandedLetters}
          setExpandedLetters={setExpandedLetters}
          handleGenreToggle={(g: Genre) => {
            const genreIds = (g as any).ids || [g.id];
            const currentIds = genreFilter.split(",").filter(Boolean);
            const isAllSelected = genreIds.every((id: number) => currentIds.includes(id.toString()));
            const newIds = isAllSelected
              ? currentIds.filter(id => !genreIds.includes(Number(id)))
              : [...new Set([...currentIds, ...genreIds.map((id: number) => id.toString())])];
            setGenreFilter(newIds.join(","));
          }}
          sortBy={sortBy}
          handleSortChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSortBy(e.target.value as SortOption); }}
          lastElementRef={lastElementRef}
          setCurrentPage={setCurrentPage}
          setHasMore={setHasMore}
          setContentList={setContentList}
          cardColors={cardColors}
          onImageLoad={handleImageLoad}
          onCopyLink={handleCopyLink}
        />
      )}

        <FloatingTabs 
          contentType={contentType}
          selectedItem={selectedItem}
          handleContentTypeChange={handleContentTypeChange}
          setShowSettings={setShowSettings}
        />

      <ToastContainer toasts={toasts} />

      {showSettings && (
        <SettingsView 
          onClose={() => setShowSettings(false)} 
          onSettingsChange={updateSettings}
        />
      )}
    </div>
  );
}

export default App;
