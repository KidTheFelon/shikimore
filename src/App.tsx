import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import DetailView from "./components/DetailView";
import CharacterDetailView from "./components/CharacterDetailView";
import "./App.css";

interface ApiError {
  kind: "validation" | "http" | "graphql" | "rate_limit" | "api" | "serialization" | "not_found";
  message: string;
  retry_after?: number;
}

export interface Date {
  year?: number;
  month?: number;
  day?: number;
  date?: string;
}

export interface Genre {
  id: number;
  name: string;
  russian?: string;
  kind?: string;
}

export interface Studio {
  id: number;
  name: string;
  image_url?: string;
}

export interface Publisher {
  id: number;
  name: string;
}

export interface ExternalLink {
  id?: number;
  kind: string;
  url: string;
  created_at?: string;
  updated_at?: string;
}

export interface PersonRole {
  id: number;
  roles_ru?: string[];
  roles_en?: string[];
  person: Person;
}

export interface CharacterRole {
  id: number;
  roles_ru?: string[];
  roles_en?: string[];
  character: Character;
}

export interface Poster {
  main?: string;
  original?: string;
  preview?: string;
  x96?: string;
  x48?: string;
}

export interface RelatedAnime {
  id?: number;
  name?: string;
  russian?: string;
  image?: Poster;
}

export interface RelatedManga {
  id?: number;
  name?: string;
  russian?: string;
  image?: Poster;
}

export interface Related {
  id: number;
  anime?: RelatedAnime;
  manga?: RelatedManga;
  relation_kind: string;
  relation_text?: string;
}

export interface Video {
  id: number;
  url?: string;
  name?: string;
  kind?: string;
  player_url?: string;
  image_url?: string;
}

export interface Screenshot {
  id: number;
  original_url?: string;
  x166_url?: string;
  x332_url?: string;
}

export interface ScoreStat {
  score: number;
  count: number;
}

export interface StatusStat {
  status: string;
  count: number;
}

interface Anime {
  id: number;
  title: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  score?: number;
  kind?: string;
  status?: string;
  episodes?: number;
  episodes_aired?: number;
}

interface Manga {
  id: number;
  title: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  score?: number;
  kind?: string;
  status?: string;
  volumes?: number;
  chapters?: number;
}

export interface AnimeDetail {
  id: number;
  mal_id?: number;
  title: string;
  russian?: string;
  license_name_ru?: string;
  english?: string;
  japanese?: string;
  synonyms?: string[];
  url?: string;
  poster_url?: string;
  description?: string;
  description_html?: string;
  description_source?: string;
  score?: number;
  kind?: string;
  rating?: string;
  status?: string;
  episodes?: number;
  episodes_aired?: number;
  duration?: number;
  aired_on?: Date;
  released_on?: Date;
  season?: string;
  next_episode_at?: string;
  is_censored?: boolean;
  genres?: Genre[];
  studios?: Studio[];
  external_links?: ExternalLink[];
  person_roles?: PersonRole[];
  character_roles?: CharacterRole[];
  related?: Related[];
  videos?: Video[];
  screenshots?: Screenshot[];
  scores_stats?: ScoreStat[];
  statuses_stats?: StatusStat[];
  fansubbers?: string[];
  fandubbers?: string[];
  licensors?: string[];
}

export interface MangaDetail {
  id: number;
  mal_id?: number;
  title: string;
  russian?: string;
  license_name_ru?: string;
  english?: string;
  japanese?: string;
  synonyms?: string[];
  url?: string;
  poster_url?: string;
  description?: string;
  description_html?: string;
  description_source?: string;
  score?: number;
  kind?: string;
  status?: string;
  volumes?: number;
  chapters?: number;
  aired_on?: Date;
  released_on?: Date;
  is_censored?: boolean;
  genres?: Genre[];
  publishers?: Publisher[];
  external_links?: ExternalLink[];
  person_roles?: PersonRole[];
  character_roles?: CharacterRole[];
  related?: Related[];
  scores_stats?: ScoreStat[];
  statuses_stats?: StatusStat[];
  licensors?: string[];
}

interface Character {
  id: number;
  name: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  description?: string;
  is_anime?: boolean;
  is_manga?: boolean;
  is_ranobe?: boolean;
}

export interface CharacterDetail {
  id: number;
  name: string;
  russian?: string;
  japanese?: string;
  synonyms: string[];
  url?: string;
  poster_url?: string;
  description?: string;
  description_html?: string;
  character_roles: CharacterRoleDetail[];
}

export interface CharacterRoleDetail {
  id: number;
  roles_ru: string[];
  anime?: Anime;
  manga?: Manga;
}

interface Person {
  id: number;
  name: string;
  russian?: string;
  url?: string;
  poster_url?: string;
  is_seyu?: boolean;
  is_mangaka?: boolean;
  is_producer?: boolean;
  website?: string;
}

type ContentItem = Anime | Manga | Character | Person;

interface SearchResult<T> {
  items: T[];
  page: number;
  limit: number;
}

export type ContentType = "anime" | "manga" | "characters" | "people";
type SortOption = "relevance" | "score" | "title";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function App() {
  const [contentType, setContentType] = useState<ContentType>("anime");
  // ... existing state ...

  const formatStatus = (status?: string) => {
    const statuses: Record<string, string> = {
      anons: "Анонсировано",
      ongoing: "Онгоинг",
      released: "Выпущено",
    };
    return status ? statuses[status] || status : null;
  };

  const formatKind = (kind?: string) => {
    const kinds: Record<string, string> = {
      tv: "ТВ",
      movie: "Фильм",
      ova: "OVA",
      ona: "ONA",
      special: "Спешл",
      music: "Клип",
      tv_13: "ТВ-13",
      tv_24: "ТВ-24",
      tv_48: "ТВ-48",
      manga: "Манга",
      manhwa: "Манхва",
      manhua: "Маньхуа",
      novel: "Ранобэ",
      one_shot: "Ваншот",
      doujin: "Додзинси",
    };
    return kind ? kinds[kind] || kind.toUpperCase() : null;
  };

  const [contentList, setContentList] = useState<ContentItem[]>([]);
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
  const [selectedItem, setSelectedItem] = useState<{ type: ContentType; id: number } | null>(null);
  const [detailData, setDetailData] = useState<AnimeDetail | MangaDetail | CharacterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [cardColors, setCardColors] = useState<Record<number, string>>({});

  const handleImageLoad = async (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => {
    const url = e.currentTarget.src;
    if (url && !cardColors[id]) {
      try {
        const color = await invoke<string>("get_accent_color", { url });
        setCardColors(prev => ({ ...prev, [id]: color }));
      } catch (err) {
        // Игнорируем ошибки получения цвета
      }
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentItemsRef = useRef<(HTMLDivElement | null)[]>([]);
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

  const handleApiError = (err: unknown): string => {
    if (typeof err === "object" && err !== null && "kind" in err) {
      const apiError = err as ApiError;
      if (apiError.kind === "rate_limit" && apiError.retry_after) {
        return `${apiError.message} (повторить через ${apiError.retry_after} сек)`;
      }
      return apiError.message;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return "Ошибка при загрузке";
  };

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
      
      if (type === "anime") {
        console.log("Вызов search_anime с параметрами:", { query, page, limit, kind: kind || undefined });
        try {
          result = await invoke<SearchResult<Anime>>("search_anime", {
            query,
            page,
            limit,
            kind: kind || undefined,
          });
          console.log("search_anime успешно, получено результатов:", result.items.length);
        } catch (invokeErr) {
          console.error("Ошибка при вызове search_anime:", invokeErr);
          throw invokeErr;
        }
      } else if (type === "manga") {
        result = await invoke<SearchResult<Manga>>("search_manga", {
          query,
          page,
          limit,
          kind: kind || undefined,
        });
      } else if (type === "characters") {
        result = await invoke<SearchResult<Character>>("search_characters", {
          page,
          limit,
          ids: undefined,
        });
      } else {
        result = await invoke<SearchResult<Person>>("search_people", {
          query,
          limit,
        });
      }
      
      let sorted = [...result.items];
      if (sortBy === "score") {
        sorted.sort((a, b) => {
          const scoreA = "score" in a ? (a.score || 0) : 0;
          const scoreB = "score" in b ? (b.score || 0) : 0;
          return scoreB - scoreA;
        });
      } else if (sortBy === "title") {
        sorted.sort((a, b) => {
          const titleA = "title" in a ? a.title : "name" in a ? a.name : "";
          const titleB = "title" in b ? b.title : "name" in b ? b.name : "";
          return titleA.localeCompare(titleB);
        });
      }
      
      if (append) {
        setContentList(prev => [...prev, ...sorted]);
      } else {
        setContentList(sorted);
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

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (searchQuery) {
      setIsSearching(true);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setIsSearching(false);
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
  }, [searchQuery, kindFilter, contentType, fetchContent, searchHistory]);

  // Ленивая пагинация при прокрутке
  useEffect(() => {
    const handleScroll = () => {
      if (!loading && !loadingMore && hasMore && (searchQuery || contentType === "characters") && contentList.length > 0) {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        // Загружаем следующую страницу когда дошли до 80% от конца
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
    setHasMore(true);
    setContentList([]);
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
      fetchContent(contentType, searchQuery, 1, kindFilter);
    }
  };

  const handleKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setKindFilter(e.target.value);
    setCurrentPage(1);
    setHasMore(true);
    setContentList([]);
  };

  const handleContentTypeChange = (newType: ContentType) => {
    setContentType(newType);
    setContentList([]);
    setCurrentPage(1);
    setHasMore(true);
    setKindFilter("");
    if (newType === "characters") {
      fetchContent(newType, "", 1, "", false);
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
    setCurrentPage(1);
    setHasMore(true);
    setContentList([]);
  };

  const handleRetry = () => {
    fetchContent(contentType, searchQuery, currentPage, kindFilter);
  };

  const fetchAnimeDetails = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await invoke<AnimeDetail>("get_anime_by_id", { id });
      setDetailData(detail);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setDetailError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoadingDetail(false);
    }
  }, [showToast]);

  const fetchMangaDetails = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await invoke<MangaDetail>("get_manga_by_id", { id });
      setDetailData(detail);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setDetailError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoadingDetail(false);
    }
  }, [showToast]);

  const fetchCharacterDetails = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await invoke<CharacterDetail>("get_character_details", { id });
      setDetailData(detail);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setDetailError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setLoadingDetail(false);
    }
  }, [showToast]);

  const handleBackToList = () => {
    setSelectedItem(null);
    setDetailData(null);
    setDetailError(null);
  };

  const handleContentClick = (item: ContentItem) => {
    console.log("Клик по элементу:", item);
    
    // Проверяем тип элемента более надежным способом
    // В аниме есть episodes, в манге - volumes или chapters
    const isAnime = "episodes" in item;
    const isManga = ("volumes" in item || "chapters" in item) && !isAnime;
    const isCharacter = "name" in item && !isAnime && !isManga && !("is_seyu" in item);
    
    console.log("Определение типа:", { isAnime, isManga, isCharacter, id: item.id });
    
    if (isAnime || isManga || isCharacter) {
      const type = isAnime ? "anime" : isManga ? "manga" : "characters";
      console.log(`Открытие экрана деталей для ${type} (ID: ${item.id})`);
      
      // Используем данные из списка для быстрого отображения
      if (isAnime) {
        const basicDetail: AnimeDetail = {
          id: item.id,
          title: "title" in item ? item.title : "",
          url: "url" in item ? item.url : undefined,
          poster_url: "poster_url" in item ? item.poster_url : undefined,
          description: "description" in item ? item.description : undefined,
          score: "score" in item ? item.score : undefined,
          kind: "kind" in item ? item.kind : undefined,
          status: "status" in item ? item.status : undefined,
        } as AnimeDetail;
        setDetailData(basicDetail);
      } else if (isManga) {
        const basicDetail: MangaDetail = {
          id: item.id,
          title: "title" in item ? item.title : "",
          url: "url" in item ? item.url : undefined,
          poster_url: "poster_url" in item ? item.poster_url : undefined,
          description: "description" in item ? item.description : undefined,
          score: "score" in item ? item.score : undefined,
          kind: "kind" in item ? item.kind : undefined,
          status: "status" in item ? item.status : undefined,
        } as MangaDetail;
        setDetailData(basicDetail);
      } else {
        const basicDetail: CharacterDetail = {
          id: item.id,
          name: "name" in item ? item.name : "",
          russian: "russian" in item ? item.russian : undefined,
          url: "url" in item ? item.url : undefined,
          poster_url: "poster_url" in item ? item.poster_url : undefined,
          description: "description" in item ? item.description : undefined,
          synonyms: [],
          character_roles: [],
        } as CharacterDetail;
        setDetailData(basicDetail);
      }
      
      setSelectedItem({ type, id: item.id });
    } else {
      // Для людей открываем ссылку
      const url = "url" in item ? item.url : undefined;
      if (url) {
        openUrl(url);
      }
    }
  };

  // Загрузка деталей при выборе элемента
  useEffect(() => {
    if (selectedItem) {
      if (selectedItem.type === "anime") {
        fetchAnimeDetails(selectedItem.id);
      } else if (selectedItem.type === "manga") {
        fetchMangaDetails(selectedItem.id);
      } else if (selectedItem.type === "characters") {
        fetchCharacterDetails(selectedItem.id);
      }
    }
  }, [selectedItem, fetchAnimeDetails, fetchMangaDetails, fetchCharacterDetails]);

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
    <div className={`container ${selectedItem ? "container-detail" : ""}`}>
      <header className={`header ${(isHeaderScrolled || selectedItem) ? "header-scrolled" : ""}`} data-tauri-drag-region>
        <div className="header-content">
          <div className="header-text" onClick={handleBackToList} style={{ cursor: 'pointer' }}>
            <h1>Shikimore</h1>
            {!isHeaderScrolled && !selectedItem && (
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
          <div className="search-controls">
            <div className="content-type-tabs">
              <button
                className={`content-type-tab ${contentType === "anime" ? "active" : ""}`}
                onClick={() => handleContentTypeChange("anime")}
                type="button"
              >
                Аниме
              </button>
              <button
                className={`content-type-tab ${contentType === "manga" ? "active" : ""}`}
                onClick={() => handleContentTypeChange("manga")}
                type="button"
              >
                Манга
              </button>
              <button
                className={`content-type-tab ${contentType === "characters" ? "active" : ""}`}
                onClick={() => handleContentTypeChange("characters")}
                type="button"
              >
                Персонажи
              </button>
              <button
                className={`content-type-tab ${contentType === "people" ? "active" : ""}`}
                onClick={() => handleContentTypeChange("people")}
                type="button"
              >
                Люди
              </button>
            </div>
            <div className="search-input-wrapper">
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder={
                  contentType === "anime" ? "Поиск аниме... (Enter для поиска)" :
                  contentType === "manga" ? "Поиск манги... (Enter для поиска)" :
                  contentType === "characters" ? "Поиск персонажей... (Enter для поиска)" :
                  "Поиск людей... (Enter для поиска)"
                }
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={handleSearchFocus}
                aria-label={`Поиск ${contentType === "anime" ? "аниме" : contentType === "manga" ? "манги" : contentType === "characters" ? "персонажей" : "людей"}`}
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
            <div className="search-controls-row">
            {(contentType === "anime" || contentType === "manga") && (
              <select
                className="kind-filter"
                value={kindFilter}
                onChange={handleKindChange}
                aria-label="Фильтр по типу"
              >
                <option value="">Все типы</option>
                {contentType === "anime" ? (
                  <>
                    <option value="tv">TV</option>
                    <option value="movie">Movie</option>
                    <option value="ova">OVA</option>
                    <option value="ona">ONA</option>
                    <option value="special">Special</option>
                    <option value="music">Music</option>
                  </>
                ) : (
                  <>
                    <option value="manga">Manga</option>
                    <option value="novel">Novel</option>
                    <option value="one_shot">One Shot</option>
                    <option value="doujin">Doujin</option>
                    <option value="manhwa">Manhwa</option>
                    <option value="manhua">Manhua</option>
                  </>
                )}
              </select>
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

          {!loading && !error && contentList.length === 0 && (searchQuery || contentType === "characters") && (
            <div className="status-message empty">
              <EmptyIcon />
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ничего не найдено</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
                Попробуйте изменить запрос или фильтры
              </p>
            </div>
          )}

          {!loading && !error && contentList.length === 0 && !searchQuery && contentType !== "characters" && (
            <div className="status-message empty">
              <EmptyIcon />
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Начните поиск</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
                {contentType === "anime" ? "Введите название аниме в поле поиска" :
                 contentType === "manga" ? "Введите название манги в поле поиска" :
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

          {!loading && !error && contentList.length > 0 && (
            <>
              <div className="results-count">
                Найдено: {contentList.length} {contentList.length === 1 ? 'результат' : 'результатов'}
                {hasMore && ' • Прокрутите вниз для загрузки'}
              </div>
          <div className="anime-list" role="list">
            {contentList.map((item, index) => {
              const russianTitle = "russian" in item ? item.russian : undefined;
              const originalTitle = "title" in item ? item.title : "name" in item ? item.name : "";
              const displayTitle = russianTitle || originalTitle;
              const subTitle = russianTitle && russianTitle !== originalTitle ? originalTitle : undefined;
              
              // Расчет параметров бегущей строки
              const marqueeParams = (text: string) => {
                const charWidth = 9.5; 
                const textWidth = text.length * charWidth;
                const containerWidth = 210; // Увеличил запас, чтобы короткие не крутились
                const isLong = textWidth > containerWidth;
                
                if (!isLong) {
                  return { isLong: false, style: {} };
                }

                const moveDistance = textWidth + 32; 
                const totalDuration = (moveDistance / 50) / 0.7;
                
                return { 
                  isLong: true, 
                  style: { "--marquee-duration": `${totalDuration}s` } as React.CSSProperties 
                };
              };

              const titleParams = marqueeParams(displayTitle);
              const subTitleParams = subTitle ? marqueeParams(subTitle) : { isLong: false, style: {} };
              
              const url = "url" in item ? item.url : undefined;
              const posterUrl = "poster_url" in item ? item.poster_url : undefined;
              const score = "score" in item ? item.score : undefined;
              
              const episodes = "episodes" in item ? item.episodes : undefined;
              const aired = "episodes_aired" in item ? item.episodes_aired : undefined;
              
              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    contentItemsRef.current[index] = el;
                  }}
                  className="anime-item"
                  role="listitem"
                  onClick={() => handleContentClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleContentClick(item);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`${displayTitle}, ${score ? `рейтинг ${score.toFixed(1)}` : "без рейтинга"}`}
                >
                  <div className="anime-poster-wrapper">
                    {score !== undefined && (
                      <div className="anime-card-score">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                        {score.toFixed(1)}
                      </div>
                    )}
                    {("kind" in item) && item.kind && (
                      <div className="anime-card-kind">
                        {formatKind(item.kind as string)}
                      </div>
                    )}
                    {/* Счетчик эпизодов для онгоингов или если есть инфа о вышедших сериях */}
                    {("episodes" in item) && (typeof aired === 'number' || item.status === "ongoing") && (aired !== undefined || episodes !== undefined) && (
                      <div 
                        className="anime-card-episodes"
                        style={{ background: cardColors[item.id] || 'rgba(40, 40, 60, 0.85)' }}
                      >
                        {typeof aired === 'number' ? `${aired} / ${episodes || "?"} эп.` : `${episodes || "?"} эп.`}
                      </div>
                    )}
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={displayTitle}
                        className="anime-poster"
                        loading="lazy"
                        onLoad={(e) => handleImageLoad(e, item.id)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="anime-poster-placeholder" style={{ display: posterUrl ? 'none' : 'flex' }}>
                      Нет изображения
                    </div>
                  </div>
                  <div className="anime-content">
                    <div className="anime-title-container">
                      <div className={`anime-marquee-inner ${titleParams.isLong ? 'is-marquee' : ''}`} style={titleParams.style}>
                        <h3 className="anime-title">{displayTitle}</h3>
                        {titleParams.isLong && <h3 className="anime-title spacer">{displayTitle}</h3>}
                      </div>
                    </div>
                    {subTitle && (
                      <div className="anime-title-container">
                        <div className={`anime-marquee-inner ${subTitleParams.isLong ? 'is-marquee' : ''}`} style={subTitleParams.style}>
                          <p className="anime-russian">{subTitle}</p>
                          {subTitleParams.isLong && <p className="anime-russian spacer">{subTitle}</p>}
                        </div>
                      </div>
                    )}
                    <div className="anime-meta-simple">
                      {("kind" in item || "status" in item) && (
                        <span>
                          {item.kind ? formatKind(item.kind) : ""}
                          {item.kind && item.status ? " • " : ""}
                          {item.status ? formatStatus(item.status) : ""}
                          {("episodes" in item) && (episodes || typeof aired === 'number') ? (
                            <>
                              {" • "}
                              {typeof aired === 'number'
                                ? `${aired} / ${episodes || "?"} эп.` 
                                : `${episodes || "?"} эп.`}
                            </>
                          ) : null}
                          {("chapters" in item) && item.chapters ? ` • ${item.chapters} гл.` : null}
                        </span>
                      )}
                    </div>
                    {url && (
                          <div className="anime-actions">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="anime-link"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openUrl(url);
                              }}
                              title="Открыть на Shikimori"
                              aria-label="Открыть на Shikimori"
                            >
                              Открыть на Shikimori
                              <ExternalLinkIcon />
                            </a>
                            <button
                              onClick={(e) => handleCopyLink(e, url)}
                              className="copy-link-btn"
                              title="Копировать ссылку"
                              aria-label="Копировать ссылку"
                            >
                              <CopyIcon />
                            </button>
                          </div>
                        )}
                        {"website" in item && item.website && (
                          <div className="anime-actions">
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="anime-link"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openUrl(item.website as string);
                              }}
                              title="Официальный сайт"
                            >
                              Официальный сайт
                              <ExternalLinkIcon />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {loadingMore && (
            <div className="loading-more" style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
              <div className="loading-spinner" aria-label="Загрузка" />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Загрузка...</p>
            </div>
          )}
        </>
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
