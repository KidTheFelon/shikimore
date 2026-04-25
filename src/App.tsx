import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "./utils/logger";
import { applyTheme, getSavedTheme } from "./utils/theme";
import Header from "./components/layout/Header";
import Search from "./components/layout/Search";
import ContentList from "./components/lists/ContentList";
import BottomBar from "./components/layout/BottomBar";
import DetailView from "./components/detail/DetailView";
import CharacterDetailView from "./components/detail/CharacterDetailView";
import UserRatesList from "./components/lists/UserRatesList";
import { ToastContainer } from "./components/ui/Toast";
import LoginScreen from "./components/auth/LoginScreen";
import ProfileScreen from "./components/auth/ProfileScreen";
import { useContent } from "./hooks/useContent";
import { useSearch } from "./hooks/useSearch";
import { useDetail } from "./hooks/useDetail";
import { useAuth } from "./hooks/useAuth";
import { useAccentColor } from "./hooks/useAccentColor";
import type {
  ContentType,
  SortOption,
  AnimeDetail,
  MangaDetail,
  CharacterDetail,
  Toast,
  ContentItem
} from "./types";
import "./styles/globals.css";
import "./App.css";

function App() {
  const [contentType, setContentType] = useState<ContentType>("anime");
  const [userRatesFilter, setUserRatesFilter] = useState<{ status: string; type: 'anime' | 'manga' } | null>(null);

  // Auth hook
  const {
    isAuthenticated,
    user,
    loading: authLoading,
    logout,
    checkAuth,
  } = useAuth();

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

  // Navigation stack for back/forward navigation
  const [navStack, setNavStack] = useState<Array<{ type: ContentType; id: number }>>([]);
  const [forwardStack, setForwardStack] = useState<Array<{ type: ContentType; id: number }>>([]);
  const MAX_NAV_STACK_SIZE = 10;

  const clearNavStack = useCallback(() => {
    setNavStack([]);
    setForwardStack([]);
  }, []);

  const handleNavigate = useCallback((type: ContentType, id: number) => {
    // Push current item to stack if navigating to a different item
    if (selectedItem && (selectedItem.type !== type || selectedItem.id !== id)) {
      setNavStack(prev => {
        const newStack = [...prev, selectedItem];
        // Limit stack size to prevent memory issues
        return newStack.length > MAX_NAV_STACK_SIZE ? newStack.slice(-MAX_NAV_STACK_SIZE) : newStack;
      });
      // Clear forward stack when navigating to new item
      setForwardStack([]);
    }
    setSelectedItem({ type, id });
    setDetailData(null);
  }, [selectedItem, setSelectedItem, setDetailData]);

  const handleBack = useCallback(() => {
    if (navStack.length > 0) {
      // Pop from stack and navigate back
      const prevItem = navStack[navStack.length - 1];
      setNavStack(prev => prev.slice(0, -1));
      // Push current item to forward stack
      if (selectedItem) {
        setForwardStack(prev => [...prev, selectedItem]);
      }
      setSelectedItem(prevItem);
      setDetailData(null);
    } else {
      // Stack is empty, go back to list
      handleBackToList();
      clearNavStack();
    }
  }, [navStack, selectedItem, handleBackToList, setSelectedItem, setDetailData, clearNavStack]);

  const handleForward = useCallback(() => {
    if (forwardStack.length > 0) {
      // Pop from forward stack and navigate forward
      const nextItem = forwardStack[forwardStack.length - 1];
      setForwardStack(prev => prev.slice(0, -1));
      // Push current item to nav stack
      if (selectedItem) {
        setNavStack(prev => [...prev, selectedItem]);
      }
      setSelectedItem(nextItem);
      setDetailData(null);
    }
  }, [forwardStack, selectedItem, setSelectedItem, setDetailData]);

  // UI state (остаётся в App)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const { cardColors, handleImageLoad } = useAccentColor();
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
    logger.info(`[Frontend] App started, loading initial content for ${contentType}`);
    fetchContent(contentType, "", 1, kindFilter, genreFilter, sortBy, false);
  }, [contentType]);

  // Initialize theme on startup
  useEffect(() => {
    const savedTheme = getSavedTheme();
    if (savedTheme) {
      applyTheme(savedTheme);
    }
  }, []);

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


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (selectedItem) {
          handleBack();
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
  }, [selectedItem, searchInputRef, handleBack, setSearchQuery, contentList.length]);

  // Mouse button shortcuts (back/forward buttons)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Button 3 = back, Button 4 = forward
      if (e.button === 3) {
        e.preventDefault();
        if (selectedItem) {
          handleBack();
        }
      } else if (e.button === 4) {
        e.preventDefault();
        handleForward();
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [selectedItem, handleBack, handleForward]);

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
      logger.info("[Frontend] Connection restored");
      showToast("Соединение восстановлено", "success");
    };

    const handleOffline = () => {
      logger.warn("[Frontend] Connection lost");
      showToast("Нет соединения с интернетом", "error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      logger.warn("[Frontend] Starting offline");
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
      clearNavStack();
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

  const handleContentClickWithReset = useCallback((item: ContentItem) => {
    // Reset user rates filter when navigating to details
    if (userRatesFilter) {
      setUserRatesFilter(null);
    }
    // Clear nav stack when clicking from list
    clearNavStack();

    // Determine content type from item
    const isAnime = "episodes" in item;
    const isManga = ("volumes" in item || "chapters" in item) && !isAnime;
    const newType = isAnime ? "anime" : isManga ? "manga" : "characters";

    // Change content type if currently in profile or user_rates
    if (contentType === "profile" || contentType === "user_rates") {
      setContentType(newType as ContentType);
    }

    handleContentClick(item);
  }, [handleContentClick, userRatesFilter, clearNavStack, contentType]);

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
            onBack={handleBack}
            onNavigate={handleNavigate}
            hasParentView={navStack.length > 0}
          />
        ) : (
          <DetailView
            data={detailData as AnimeDetail | MangaDetail}
            type={selectedItem.type as "anime" | "manga"}
            loading={loadingDetail}
            error={detailError}
            onBack={handleBack}
            onNavigate={handleNavigate}
            user={user}
            onSearchGenre={(genreId, _genreName) => {
              setSelectedItem(null);
              setDetailData(null);
              clearNavStack();
              setContentType(selectedItem!.type as ContentType);
              setGenreFilter([genreId.toString()]);
              setSearchQuery("");
            }}
            onSearchStudio={(_studioId, studioName) => {
              setSelectedItem(null);
              setDetailData(null);
              clearNavStack();
              setContentType("anime");
              setSearchQuery(studioName);
            }}
            onSearchPublisher={(_publisherId, publisherName) => {
              setSelectedItem(null);
              setDetailData(null);
              clearNavStack();
              setContentType("manga");
              setSearchQuery(publisherName);
            }}
          />
        )
      ) : contentType === "profile" ? (
        authLoading ? (
          <div className="loading-screen">Загрузка...</div>
        ) : !isAuthenticated ? (
          <LoginScreen
            onAuthSuccess={checkAuth}
            onClose={() => {
              clearNavStack();
              setContentType("anime");
            }}
          />
        ) : user ? (
          <ProfileScreen
            user={user}
            onLogout={() => {
              logout();
              clearNavStack();
              setContentType("anime");
            }}
            onNavigateToRates={(status, type) => {
              clearNavStack();
              setUserRatesFilter({ status, type });
              setContentType("user_rates");
            }}
            onContentClick={handleContentClickWithReset}
          />
        ) : (
          <div className="loading-screen">Загрузка данных пользователя...</div>
        )
      ) : contentType === "user_rates" && userRatesFilter ? (
          <UserRatesList
            status={userRatesFilter.status}
            type={userRatesFilter.type}
            onBack={() => {
              setUserRatesFilter(null);
              clearNavStack();
              setContentType("profile");
            }}
            onContentClick={handleContentClickWithReset}
            user={user}
          />
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
            onHistorySelect={handleHistorySelect}
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
