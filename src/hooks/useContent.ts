import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { handleApiError } from "../utils/api";
import { logger } from "../utils/logger";
import type { ContentType, ContentItem, SearchResult } from "../types";

export function useContent(contentType: ContentType) {
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const fetchContent = useCallback(async (
    type: ContentType,
    query: string,
    page: number,
    kind: string,
    genres: string[],
    sortBy: string,
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
      
      const getOrderValue = () => {
        if (sortBy === "score") return "ranked";
        if (sortBy === "title") return "name";
        if (sortBy === "id") return "id";
        if (sortBy === "popularity") return "popularity";
        if (sortBy === "aired_on") return "aired_on";
        if (sortBy === "episodes") return "episodes";
        if (sortBy === "status") return "status";
        if (sortBy === "random") return "random";
        if (sortBy === "created_at") return "created_at";
        if (sortBy === "updated_at") return "updated_at";
        return undefined;
      };
      
      if (type === "anime") {
        await logger.debug(`[Frontend] search_anime: query="${query}", page=${page}, kind=${kind}, genres=${genres.join(",")}`);
        result = await invoke<SearchResult<any>>("search_anime", {
          query,
          page,
          limit,
          kind: kind || undefined,
          genres: genres.length > 0 ? genres.join(",") : undefined,
          order: getOrderValue(),
        });
      } else if (type === "manga") {
        await logger.debug(`[Frontend] search_manga: query="${query}", page=${page}, kind=${kind}, genres=${genres.join(",")}`);
        result = await invoke<SearchResult<any>>("search_manga", {
          query,
          page,
          limit,
          kind: kind || undefined,
          genres: genres.length > 0 ? genres.join(",") : undefined,
          order: getOrderValue(),
        });
      } else if (type === "characters") {
        await logger.debug(`[Frontend] search_characters: page=${page}`);
        result = await invoke<SearchResult<any>>("search_characters", {
          page,
          limit,
          ids: undefined,
        });
      } else {
        await logger.debug(`[Frontend] search_people: query="${query}"`);
        result = await invoke<SearchResult<any>>("search_people", {
          query,
          limit,
        });
      }
      
      if (append) {
        setContentList(prev => [...prev, ...result.items]);
      } else {
        setContentList(result.items);
        try {
          localStorage.setItem(`shikimore_cache_${contentType}_${query}`, JSON.stringify(result.items));
        } catch {
          // Ignore storage errors
        }
      }

      await logger.debug(`[Frontend] Fetched ${result.items.length} items for ${type} (page ${page})`);
      setHasMore(result.items.length === limit);
    } catch (err) {
      const errorMessage = handleApiError(err);
      await logger.error(`[Frontend] API error in ${type}: ${errorMessage}`);
      if (!append && !navigator.onLine) {
        await logger.warn(`[Frontend] Offline, using cache for ${type}`);
        try {
          const cached = localStorage.getItem(`shikimore_cache_${contentType}_${query}`);
          if (cached) {
            const cachedItems = JSON.parse(cached);
            setContentList(cachedItems);
            setError(null);
            return;
          }
        } catch {
          // Ignore cache errors
        }
      }
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
  }, [limit, contentType]);

  const resetContent = useCallback(() => {
    setContentList([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    contentList,
    loading,
    loadingMore,
    error,
    currentPage,
    hasMore,
    limit,
    fetchContent,
    resetContent,
    setCurrentPage,
  };
}
