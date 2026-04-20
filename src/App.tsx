import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import Header from "./components/Header";
import Search from "./components/Search";
import ContentList from "./components/ContentList";
import DetailView from "./components/DetailView";
import CharacterDetailView from "./components/CharacterDetailView";
import { ToastContainer } from "./components/Toast";
import type {
  ContentType,
  SortOption,
  ContentItem,
  AnimeDetail,
  MangaDetail,
  CharacterDetail,
  SearchResult,
  Toast,
  ApiError
} from "./types";
import "./styles/globals.css";

function App() {
  // Basic state
  const [contentType, setContentType] = useState<ContentType>("anime");
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(20);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // UI state
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: ContentType; id: number } | null>(null);
  const [detailData, setDetailData] = useState<AnimeDetail | MangaDetail | CharacterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cardColors, setCardColors] = useState<Record<number, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const debounceTimerRef = useRef<number | null>(null);

  // Load saved search and history
  useEffect(() => {
    const history = localStorage.getItem("shikimore_search_history");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch {
        // ignore
      }
    }
    // Load initial content on startup
    fetchContent(contentType, "", 1, kindFilter, false);
  }, []);

  // Save search
  useEffect(() => {
    if (searchQuery) {
      localStorage.setItem("shikimore_last_search", searchQuery);
    }
  }, [searchQuery]);

  // Toast notifications
  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  // Handle image load for accent colors
  const handleImageLoad = async (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => {
    const url = e.currentTarget.src;
    if (url && !cardColors[id]) {
      try {
        const color = await invoke<string>("get_accent_color", { url });
        setCardColors(prev => ({ ...prev, [id]: color }));
      } catch (err) {
        // Ignore color errors
      }
    }
  };

  // Keyboard shortcuts
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
      // Arrow navigation for cards
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && contentItemsRef.current.length > 0) {
        const currentIndex = contentItemsRef.current.findIndex(
          (el) => el === document.activeElement
        );
        if (currentIndex !== -1) {
          e.preventDefault();
          const nextIndex = e.key === "ArrowDown" 
            ? Math.min(currentIndex + 1, contentItemsRef.current.length - 1)
            : Math.max(currentIndex - 1, 0);
          contentItemsRef.current[nextIndex]?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contentList.length]);

  // Scroll tracking for header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsHeaderScrolled(scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // API error handling
  const handleApiError = (err: unknown): string => {
    if (typeof err === "object" && err !== null && "kind" in err) {
      const apiError = err as ApiError;
      let message = apiError.message;

      // Добавляем специфичную информацию для разных типов ошибок
      if (apiError.kind === "rate_limit" && apiError.retry_after) {
        message += ` (Повторить через ${apiError.retry_after} сек)`;
      } else if (apiError.kind === "graphql" && apiError.details) {
        // Можно добавить логирование деталей для отладки
        console.debug("GraphQL error details:", apiError.details);
      } else if (apiError.kind === "http" && apiError.details) {
        const details = apiError.details as { status?: number; url?: string };
        if (details.status) {
          message += ` (Статус: ${details.status})`;
        }
      } else if (apiError.kind === "api" && apiError.details) {
        const details = apiError.details as { status?: number };
        if (details.status) {
          message += ` (Статус: ${details.status})`;
        }
      }

      return message;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return "Ошибка загрузки контента";
  };

  // Content fetching
  const fetchContent = useCallback(async (
    type: ContentType,
    query: string,
    page: number,
    kind: string,
    append: boolean = false
  ) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }
    
    try {
      let result: SearchResult<ContentItem>;
      
      // Map sortBy to API order values
      const getOrderValue = () => {
        if (sortBy === "score") return "ranked";
        if (sortBy === "title") return "name";
        return "id"; // relevance = default sort by id
      };
      
      if (type === "anime") {
        result = await invoke<SearchResult<any>>("search_anime", {
          query,
          page,
          limit,
          kind: kind || undefined,
          order: getOrderValue(),
        });
      } else if (type === "manga") {
        result = await invoke<SearchResult<any>>("search_manga", {
          query,
          page,
          limit,
          kind: kind || undefined,
          order: getOrderValue(),
        });
      } else if (type === "characters") {
        result = await invoke<SearchResult<any>>("search_characters", {
          page,
          limit,
          ids: undefined,
        });
      } else {
        result = await invoke<SearchResult<any>>("search_people", {
          query,
          limit,
        });
      }
      
      if (append) {
        setContentList(prev => [...prev, ...result.items]);
      } else {
        setContentList(result.items);
      }
      
      setHasMore(result.items.length === limit);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      if (!append) {
        setContentList([]);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [limit, sortBy]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      if (searchQuery || contentType === "characters") {
        setCurrentPage(1);
        setHasMore(true);
        fetchContent(contentType, searchQuery, 1, kindFilter, false);
        if (searchQuery && !searchHistory.includes(searchQuery)) {
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
  }, [searchQuery, kindFilter, sortBy, contentType, fetchContent, searchHistory]);

  // Lazy pagination
  useEffect(() => {
    const handleScroll = () => {
      if (!loading && !loadingMore && hasMore && (searchQuery || contentType === "characters") && contentList.length > 0) {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        // Load next page when 80% to the end
        if (scrollTop + windowHeight >= documentHeight * 0.8) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchContent(contentType, searchQuery, nextPage, kindFilter, true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, loadingMore, hasMore, searchQuery, currentPage, kindFilter, contentType, fetchContent, contentList.length]);

  // Event handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setHasMore(true);
    setContentList([]);
    setShowHistory(value.length === 0 && searchHistory.length > 0);
  };

  const handleSearchFocus = () => {
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      fetchContent(contentType, searchQuery, 1, kindFilter);
    }
  };

  const handleContentTypeChange = (newType: ContentType) => {
    setContentType(newType);
    setContentList([]);
    setCurrentPage(1);
    setHasMore(true);
    setKindFilter("");
    fetchContent(newType, "", 1, "", false);
  };

  const handleKindChange = (value: string) => {
    setKindFilter(value);
    setCurrentPage(1);
    setHasMore(true);
    setContentList([]);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
    setHasMore(true);
    setContentList([]);
  };

  const handleHistorySelect = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
    searchInputRef.current?.blur();
  };

  const handleContentClick = (item: ContentItem) => {
    // Determine item type
    const isAnime = "episodes" in item;
    const isManga = ("volumes" in item || "chapters" in item) && !isAnime;
    const isCharacter = "name" in item && !isAnime && !isManga && (("is_anime" in item) || ("is_manga" in item) || ("is_ranobe" in item));
    
    if (isAnime || isManga || isCharacter) {
      const type = isAnime ? "anime" : isManga ? "manga" : "characters";
      
      // Set basic data for immediate display
      if (isAnime) {
        const basicDetail: AnimeDetail = {
          id: item.id,
          title: (item as any).title,
          url: (item as any).url,
          poster_url: (item as any).poster_url,
          description: (item as any).description,
          score: (item as any).score,
          kind: (item as any).kind,
          status: (item as any).status,
        } as AnimeDetail;
        setDetailData(basicDetail);
      } else if (isManga) {
        const basicDetail: MangaDetail = {
          id: item.id,
          title: (item as any).title,
          url: (item as any).url,
          poster_url: (item as any).poster_url,
          description: (item as any).description,
          score: (item as any).score,
          kind: (item as any).kind,
          status: (item as any).status,
        } as MangaDetail;
        setDetailData(basicDetail);
      } else {
        const basicDetail: CharacterDetail = {
          id: item.id,
          name: (item as any).name,
          russian: (item as any).russian,
          url: (item as any).url,
          poster_url: (item as any).poster_url,
          description: (item as any).description,
          synonyms: [],
          character_roles: [],
        } as CharacterDetail;
        setDetailData(basicDetail);
      }
      
      setSelectedItem({ type, id: item.id });
    } else {
      // For people, open external link
      const url = (item as any).url;
      if (url) {
        openUrl(url);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedItem(null);
    setDetailData(null);
    setDetailError(null);
  };

  // Detail fetching
  useEffect(() => {
    if (selectedItem) {
      setLoadingDetail(true);
      setDetailError(null);
      
      const fetchDetails = async () => {
        try {
          let detail;
          if (selectedItem.type === "anime") {
            detail = await invoke<AnimeDetail>("get_anime_by_id", { id: selectedItem.id });
          } else if (selectedItem.type === "manga") {
            detail = await invoke<MangaDetail>("get_manga_by_id", { id: selectedItem.id });
          } else if (selectedItem.type === "characters") {
            detail = await invoke<CharacterDetail>("get_character_details", { id: selectedItem.id });
          }
          setDetailData(detail || null);
        } catch (err) {
          const errorMessage = handleApiError(err);
          setDetailError(errorMessage);
          showToast(errorMessage, "error");
        } finally {
          setLoadingDetail(false);
        }
      };
      
      fetchDetails();
    }
  }, [selectedItem, showToast]);

  const handleRetry = () => {
    fetchContent(contentType, searchQuery, currentPage, kindFilter);
  };

  // Close history when clicking outside
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

  return (
    <div className={`container ${selectedItem ? "containerDetail" : ""}`}>
      <Header
        isScrolled={isHeaderScrolled}
        hasSelectedItem={!!selectedItem}
        onBackToList={handleBackToList}
      />

      {selectedItem ? (
        selectedItem.type === "characters" ? (
          <CharacterDetailView
            data={detailData as CharacterDetail}
            loading={loadingDetail}
            error={detailError}
            onBack={handleBackToList}
            onNavigate={(type: ContentType, id: number) => {
              setSelectedItem({ type, id });
              setDetailData(null);
            }}
          />
        ) : (
          <DetailView
            data={detailData as AnimeDetail | MangaDetail}
            type={selectedItem.type as "anime" | "manga"}
            loading={loadingDetail}
            error={detailError}
            onBack={handleBackToList}
            onNavigate={(type: ContentType, id: number) => {
              setSelectedItem({ type, id });
              setDetailData(null);
            }}
            onSearchGenre={(_genreId, genreName) => {
              setSelectedItem(null);
              setDetailData(null);
              setContentType(selectedItem!.type as ContentType);
              setSearchQuery(genreName);
            }}
            onSearchStudio={(_studioId, studioName) => {
              setSelectedItem(null);
              setDetailData(null);
              setContentType("anime");
              setSearchQuery(studioName);
            }}
            onSearchPublisher={(_publisherId, publisherName) => {
              setSelectedItem(null);
              setDetailData(null);
              setContentType("manga");
              setSearchQuery(publisherName);
            }}
          />
        )
      ) : (
        <>
          <Search
            query={searchQuery}
            onQueryChange={handleSearchChange}
            contentType={contentType}
            onContentTypeChange={handleContentTypeChange}
            kindFilter={kindFilter}
            onKindChange={handleKindChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            searchHistory={searchHistory}
            showHistory={showHistory}
            onHistorySelect={handleHistorySelect}
            onSearchFocus={handleSearchFocus}
            onSearchKeyDown={handleSearchKeyDown}
          />

          <ContentList
            items={contentList}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            onContentClick={handleContentClick}
            cardColors={cardColors}
            onImageLoad={handleImageLoad}
          />

          {error && (
            <div className="retry-container">
              <button onClick={handleRetry} className="retry-btn">
                Retry
              </button>
            </div>
          )}
        </>
      )}

      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}

export default App;
