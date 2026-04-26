import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { handleApiError } from "../utils/api";
import { logger } from "../utils/logger";
import type { AnimeDetail, MangaDetail } from "../types";

export function useAnimePreview() {
  const [previewData, setPreviewData] = useState<AnimeDetail | MangaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const fetchAnimePreview = useCallback(async (id: number, type: 'anime' | 'manga') => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Delay loading to avoid fetching on quick mouse movements
    hoverTimeoutRef.current = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        await logger.debug(`[useAnimePreview] Fetching preview for ${type} id=${id}`);
        let data;
        if (type === 'anime') {
          data = await invoke<AnimeDetail>("get_anime_by_id", { id });
        } else {
          data = await invoke<MangaDetail>("get_manga_by_id", { id });
        }

        if (!abortController.signal.aborted) {
          setPreviewData(data);
          await logger.debug(`[useAnimePreview] Successfully fetched preview for ${type} id=${id}`);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          const errorMessage = handleApiError(err);
          await logger.error(`[useAnimePreview] Error fetching preview for ${type} id=${id}: ${errorMessage}`);
          setError(errorMessage);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300); // 300ms delay before fetching
  }, []);

  const clearPreview = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPreviewData(null);
    setLoading(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    clearPreview();
  }, [clearPreview]);

  return {
    previewData,
    loading,
    error,
    fetchAnimePreview,
    clearPreview,
    cleanup,
  };
}
