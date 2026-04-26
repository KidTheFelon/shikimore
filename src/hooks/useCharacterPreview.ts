import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { handleApiError } from "../utils/api";
import { logger } from "../utils/logger";
import type { CharacterDetail } from "../types";

export function useCharacterPreview() {
  const [previewData, setPreviewData] = useState<CharacterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const fetchCharacterPreview = useCallback(async (characterId: number) => {
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

        const character = await invoke<CharacterDetail>(
          "get_character_details",
          {
            id: characterId,
          },
        );

        if (!abortController.signal.aborted) {
          setPreviewData(character);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          const errorMessage = handleApiError(err);
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
    fetchCharacterPreview,
    clearPreview,
    cleanup,
  };
}
