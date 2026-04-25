import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { handleApiError } from "../utils/api";
import { logger } from "../utils/logger";
import type { Anime } from "../types";

interface ReleaseItem extends Anime {
  aired_on?: {
    year?: number;
    month?: number;
    day?: number;
    date?: string;
  };
}

export function useReleases() {
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const fetchReleases = useCallback(async (mode: 'week' | 'month' = 'week') => {
    console.log('[useReleases] fetchReleases called with mode:', mode);
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const endDate = new Date(today);
      
      if (mode === 'week') {
        endDate.setDate(today.getDate() + 7);
      } else {
        endDate.setMonth(today.getMonth() + 1);
      }

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log('[useReleases] Date range:', startDateStr, 'to', endDateStr);
      await logger.debug(`[Frontend] Fetching releases: ${startDateStr} to ${endDateStr}`);

      // Получаем аниме, которые выйдут в указанный период
      // Используем order по aired_on и фильтр по статусу "anons" или "ongoing"
      const result = await invoke<{ items: Anime[] }>("search_anime", {
        query: "",
        page: 1,
        limit: 100,
        kind: undefined,
        genres: undefined,
        order: "aired_on",
        status: undefined, // Получаем все статусы, фильтруем на клиенте
      });

      console.log('[useReleases] API result items:', result.items.length);
      await logger.debug(`[Frontend] Total animes from API: ${result.items.length}`);

      // Логируем первые 3 аниме для отладки
      if (result.items.length > 0) {
        console.log('[useReleases] Sample anime 1:', result.items[0]);
        console.log('[useReleases] Sample anime 1 aired_on:', result.items[0].aired_on);
        await logger.debug(`[Frontend] Sample anime 1: ${JSON.stringify(result.items[0])}`);
        if (result.items.length > 1) {
          console.log('[useReleases] Sample anime 2:', result.items[1]);
          console.log('[useReleases] Sample anime 2 aired_on:', result.items[1].aired_on);
          await logger.debug(`[Frontend] Sample anime 2: ${JSON.stringify(result.items[1])}`);
        }
      }

      // Фильтруем по дате релиза на клиенте
      // Показываем аниме с датой выхода в будущем
      const filteredReleases = result.items.filter((anime: any) => {
        if (!anime.aired_on?.date) {
          return false;
        }
        
        const releaseDate = new Date(anime.aired_on.date);
        return releaseDate >= today;
      });

      // Ограничиваем количество: 20 для недели, 50 для месяца
      const limit = mode === 'week' ? 20 : 50;
      const limitedReleases = filteredReleases.slice(0, limit);

      console.log('[useReleases] Filtered releases:', filteredReleases.length, 'Limited to:', limitedReleases.length);
      await logger.debug(`[Frontend] Found ${filteredReleases.length} releases, showing ${limitedReleases.length} for ${mode}`);
      setReleases(limitedReleases);
    } catch (err) {
      console.error('[useReleases] Error:', err);
      const errorMessage = handleApiError(err);
      await logger.error(`[Frontend] Error fetching releases: ${errorMessage}`);
      setError(errorMessage);
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[useReleases] useEffect triggered, viewMode:', viewMode);
    fetchReleases(viewMode);
  }, [viewMode, fetchReleases]);

  return {
    releases,
    loading,
    error,
    viewMode,
    setViewMode,
    refetch: () => fetchReleases(viewMode),
  };
}
