import { useState, useCallback, useEffect, useRef } from "react";
import type { SortOption } from "../types";

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Load search history on mount
  useEffect(() => {
    const history = localStorage.getItem("shikimore_search_history");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save search query
  useEffect(() => {
    if (searchQuery) {
      localStorage.setItem("shikimore_last_search", searchQuery);
    }
  }, [searchQuery]);

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

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setShowHistory(value.length === 0 && searchHistory.length > 0);
  }, [searchHistory.length]);

  const handleSearchFocus = useCallback(() => {
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  }, [searchHistory.length]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  }, []);

  const handleKindChange = useCallback((value: string) => {
    setKindFilter(value);
  }, []);

  const handleGenreChange = useCallback((value: string) => {
    setGenreFilter(prev => {
      if (value === "") {
        return [];
      }
      if (prev.includes(value)) {
        return prev.filter(g => g !== value);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, value];
    });
  }, []);

  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value);
  }, []);

  const handleHistorySelect = useCallback((query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  }, []);

  const handleHistoryClose = useCallback(() => {
    setShowHistory(false);
  }, []);

  const addToHistory = useCallback((query: string) => {
    if (query && !searchHistory.includes(query)) {
      const newHistory = [query, ...searchHistory.filter((q) => q !== query)].slice(0, 5);
      setSearchHistory(newHistory);
      localStorage.setItem("shikimore_search_history", JSON.stringify(newHistory));
    }
  }, [searchHistory]);

  const resetFilters = useCallback(() => {
    setKindFilter("");
    setGenreFilter([]);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    kindFilter,
    setKindFilter,
    genreFilter,
    setGenreFilter,
    sortBy,
    setSortBy,
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
  };
}
