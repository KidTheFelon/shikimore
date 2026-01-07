import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { 
  ContentItem, 
  ContentType, 
  SortOption, 
  SearchResult, 
  ApiError 
} from '../types';

interface SearchParams {
  query: string;
  contentType: ContentType;
  kindFilter?: string;
  statusFilter?: string;
  genreFilter?: string;
  studioFilter?: string;
  sortBy: SortOption;
  limit: number;
}

export function useShikimoriApi() {
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const activeSearchParamsRef = useRef<string>("");

  const search = useCallback(async (params: SearchParams, isNewSearch = true) => {
    const { query, contentType, kindFilter, statusFilter, genreFilter, studioFilter, sortBy, limit } = params;
    
    const searchParamsKey = JSON.stringify({ query, contentType, kindFilter, statusFilter, genreFilter, studioFilter, sortBy });
    
    if (isNewSearch) {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setHasMore(true);
      setContentList([]);
      activeSearchParamsRef.current = searchParamsKey;
    } else {
      setLoadingMore(true);
    }

    try {
      let result: SearchResult<any>;
      const page = isNewSearch ? 1 : currentPage + 1;

      if (contentType === "anime") {
        result = await api.searchAnime({
          query, page, limit, kind: kindFilter, status: statusFilter, genre: genreFilter, studio: studioFilter, order: sortBy
        });
      } else if (contentType === "manga") {
        result = await api.searchManga({
          query, page, limit, kind: kindFilter, status: statusFilter, genre: genreFilter, publisher: studioFilter, order: sortBy
        });
      } else if (contentType === "characters") {
        result = await api.searchCharacters({ query, page, limit });
      } else {
        result = await api.searchPeople({ query, limit });
      }

      // Если за время запроса параметры поиска изменились, игнорируем результат
      if (activeSearchParamsRef.current !== searchParamsKey && isNewSearch) return;

      if (isNewSearch) {
        setContentList(result.items);
      } else {
        setContentList(prev => [...prev, ...result.items]);
        setCurrentPage(page);
      }
      
      setHasMore(result.items.length === limit);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Произошла ошибка при загрузке данных");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage]);

  return {
    contentList,
    setContentList,
    loading,
    loadingMore,
    error,
    setError,
    currentPage,
    setCurrentPage,
    hasMore,
    setHasMore,
    search
  };
}
