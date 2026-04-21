import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import Header from "./components/Header";
import Search from "./components/Search";
import ContentList from "./components/ContentList";
import BottomBar from "./components/BottomBar";
import DetailView from "./components/DetailView";
import CharacterDetailView from "./components/CharacterDetailView";
import { ToastContainer } from "./components/Toast";
import { useContent } from "./hooks/useContent";
import { useSearch } from "./hooks/useSearch";
import { useDetail } from "./hooks/useDetail";
import type {
  ContentType,
  SortOption,
  AnimeDetail,
  MangaDetail,
  CharacterDetail,
  Toast
} from "./types";
import "./styles/globals.css";
import "./App.css";

function App() {
  const [contentType, setContentType] = useState<ContentType>("anime");
  
  // Custom hooks
  const {
    contentList,
    loading,
    loadingMore,
    error,
    currentPage,
    hasMore,
    fetchContent,
    resetContent,
    setCurrentPage,
  } = useContent(contentType);
  
  const {
    searchQuery,
    setSearchQuery,
    kindFilter,
    genreFilter,
    setGenreFilter,
    sortBy,
    searchHistory,
    showHistory,
    searchInputRef,
    debounceTimerRef,
    handleSearchChange,
    handleSearchFocus,
    handleSearchKeyDown,
    handleKindChange,
    handleGenreChange,
    handleSortChange,
    handleHistorySelect,
    handleHistoryClose,
    addToHistory,
    resetFilters,
  } = useSearch();
  
  const {
    selectedItem,
    detailData,
    loadingDetail,
    detailError,
    handleContentClick,
    handleBackToList,
    setSelectedItem,
    setDetailData,
  } = useDetail();
  
  // UI state (остаётся в App)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [cardColors, setCardColors] = useState<Record<number, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'exiting' | 'entering' | 'none'>('none');
  const [filterAnimationKey, setFilterAnimationKey] = useState(0);

  // Refs
  const contentItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const contentTypeChangeTimerRef = useRef<number | null>(null);

  // Load initial content on startup
  useEffect(() => {
    fetchContent(contentType, "", 1, kindFilter, genreFilter, sortBy, false);
  }, [contentType]);

  // Reset animation phase after content loads
  useEffect(() => {
    if (animationPhase === 'entering' && !loading && contentList.length > 0) {
      const timer = setTimeout(() => {
        setAnimationPhase('none');
        setSlideDirection(null);
        setExitDirection(null);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [animationPhase, loading, contentList.length]);

  // Reset filter animation after content loads
  useEffect(() => {
    if (filterAnimationKey > 0 && !loading && contentList.length > 0) {
      const timer = setTimeout(() => {
        setFilterAnimationKey(0);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [filterAnimationKey, loading, contentList.length]);

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
      }
      if (e.key === "Escape") {
        if (selectedItem) {
          handleBackToList();
        } else if (document.activeElement === searchInputRef.current) {
          setSearchQuery("");
          searchInputRef.current?.blur();
        }
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
  }, [selectedItem, searchInputRef, handleBackToList, setSearchQuery, contentList.length]);

  // Scroll tracking for header
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsHeaderScrolled(scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Online/offline handling
  useEffect(() => {
    const handleOnline = () => {
      showToast("Соединение восстановлено", "success");
    };

    const handleOffline = () => {
      showToast("Нет соединения с интернетом", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      showToast("Нет соединения с интернетом", "error");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      resetContent();
      fetchContent(contentType, searchQuery, 1, kindFilter, genreFilter, sortBy, false);
      addToHistory(searchQuery);
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, kindFilter, genreFilter, sortBy, contentType, fetchContent, addToHistory, resetContent]);

  // Lazy pagination
  useEffect(() => {
    const handleScroll = () => {
      if (!loading && !loadingMore && hasMore && (searchQuery || contentType === "characters") && contentList.length > 0) {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        if (scrollTop + windowHeight >= documentHeight * 0.8) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchContent(contentType, searchQuery, nextPage, kindFilter, genreFilter, sortBy, true);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, loadingMore, hasMore, searchQuery, currentPage, kindFilter, genreFilter, sortBy, contentType, fetchContent, contentList.length, setCurrentPage]);

  // Content type change with animation
  const handleContentTypeChange = (newType: ContentType) => {
    const typeOrder: ContentType[] = ["anime", "manga"];
    const currentIndex = typeOrder.indexOf(contentType);
    const newIndex = typeOrder.indexOf(newType);
    const enterDirection = newIndex > currentIndex ? "right" : "left";
    const exitDir = newIndex > currentIndex ? "left" : "right";

    setSlideDirection(enterDirection);
    setExitDirection(exitDir);
    setAnimationPhase('exiting');

    if (contentTypeChangeTimerRef.current) {
      clearTimeout(contentTypeChangeTimerRef.current);
    }
    contentTypeChangeTimerRef.current = window.setTimeout(() => {
      setContentType(newType);
      resetContent();
      resetFilters();
      setAnimationPhase('entering');
      fetchContent(newType, "", 1, "", [], sortBy, false);
    }, 300);
  };

  // Filter changes with animation
  const handleKindChangeWithAnim = (value: string) => {
    setFilterAnimationKey(prev => prev + 1);
    handleKindChange(value);
    resetContent();
  };

  const handleGenreChangeWithAnim = (value: string) => {
    setFilterAnimationKey(prev => prev + 1);
    handleGenreChange(value);
    resetContent();
  };

  const handleSortChangeWithAnim = (value: SortOption) => {
    setFilterAnimationKey(prev => prev + 1);
    handleSortChange(value);
    resetContent();
  };

  const handleHistorySelectWithReset = (query: string) => {
    handleHistorySelect(query);
    resetContent();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (contentTypeChangeTimerRef.current) {
        clearTimeout(contentTypeChangeTimerRef.current);
      }
    };
  }, []);

  const handleRetry = () => {
    fetchContent(contentType, searchQuery, currentPage, kindFilter, genreFilter, sortBy, false);
  };

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
            onSearchGenre={(genreId, _genreName) => {
              setSelectedItem(null);
              setDetailData(null);
              setContentType(selectedItem!.type as ContentType);
              setGenreFilter([genreId.toString()]);
              setSearchQuery("");
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
            kindFilter={kindFilter}
            onKindChange={handleKindChangeWithAnim}
            genreFilter={genreFilter}
            onGenreChange={handleGenreChangeWithAnim}
            sortBy={sortBy}
            onSortChange={handleSortChangeWithAnim}
            searchHistory={searchHistory}
            showHistory={showHistory}
            onHistorySelect={handleHistorySelectWithReset}
            onSearchFocus={handleSearchFocus}
            onSearchKeyDown={handleSearchKeyDown}
            onHistoryClose={handleHistoryClose}
          />

          <ContentList
            items={contentList}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            onContentClick={handleContentClick}
            cardColors={cardColors}
            onImageLoad={handleImageLoad}
            blurred={showHistory}
            slideDirection={slideDirection}
            exitDirection={exitDirection}
            animationPhase={animationPhase}
            filterAnimationKey={filterAnimationKey}
          />

          <BottomBar
            contentType={contentType}
            onContentTypeChange={handleContentTypeChange}
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
