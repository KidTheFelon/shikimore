import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

type HexColor = `#${string}`;

interface UseAccentColorReturn {
  cardColors: Record<number, HexColor>;
  loadImageColor: (url: string, id: number) => Promise<void>;
  handleImageLoad: (e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => Promise<void>;
  resetColors: () => void;
  getColor: (id: number) => HexColor;
}

const MAX_CACHE_SIZE = 100;
const DEBOUNCE_MS = 100;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 300;

const isValidHexColor = (color: string): color is HexColor => 
  /^#[0-9A-Fa-f]{6}$/.test(color);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useAccentColor(): UseAccentColorReturn {
  const [cardColors, setCardColors] = useState<Record<number, HexColor>>({});
  const urlCache = useRef<Map<string, HexColor>>(new Map());
  const cacheOrder = useRef<string[]>([]);
  const abortControllers = useRef<Map<number, AbortController>>(new Map());
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortControllers.current.forEach(controller => controller.abort());
      abortControllers.current.clear();
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  const addToCache = useCallback((url: string, color: HexColor) => {
    if (urlCache.current.has(url)) {
      cacheOrder.current = cacheOrder.current.filter(u => u !== url);
    } else if (cacheOrder.current.length >= MAX_CACHE_SIZE) {
      const oldestUrl = cacheOrder.current.shift();
      if (oldestUrl) urlCache.current.delete(oldestUrl);
    }
    urlCache.current.set(url, color);
    cacheOrder.current.push(url);
  }, []);

  const fetchColorWithRetry = useCallback(async (
    url: string,
    signal: AbortSignal,
    retries = MAX_RETRIES
  ): Promise<string | null> => {
    for (let i = 0; i <= retries; i++) {
      try {
        const color = await invoke<string>("get_accent_color", { url });
        if (signal.aborted) return null;
        return color;
      } catch (err) {
        if (signal.aborted) return null;
        if (i === retries) throw err;
        await sleep(RETRY_DELAY_MS * (i + 1));
      }
    }
    return null;
  }, []);

  const loadImageColor = useCallback(async (url: string, id: number) => {
    if (!url) return;

    const cachedColor = urlCache.current.get(url);
    if (cachedColor) {
      if (isMounted.current) {
        setCardColors(prev => {
          if (prev[id]) return prev;
          return { ...prev, [id]: cachedColor };
        });
      }
      return;
    }

    const existingTimer = debounceTimers.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      setCardColors(prev => {
        if (prev[id]) return prev;
        return { ...prev, [id]: "#000000" };
      });

      const controller = new AbortController();
      abortControllers.current.set(id, controller);
      debounceTimers.current.delete(id);

      try {
        const color = await fetchColorWithRetry(url, controller.signal);
        
        if (!isMounted.current || controller.signal.aborted || !color) return;

        if (!isValidHexColor(color)) {
          if (import.meta.env.DEV) {
            console.error("Invalid hex color format:", color);
          }
          return;
        }

        addToCache(url, color);
        setCardColors(prev => ({ ...prev, [id]: color }));
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Failed to get accent color after retries:", err);
        }
      } finally {
        abortControllers.current.delete(id);
      }
    }, DEBOUNCE_MS);

    debounceTimers.current.set(id, timer);
  }, [addToCache, fetchColorWithRetry]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>, id: number) => {
    const url = e.currentTarget.src;
    return loadImageColor(url, id);
  }, [loadImageColor]);

  const resetColors = useCallback(() => {
    setCardColors({});
    urlCache.current.clear();
    cacheOrder.current = [];
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current.clear();
    debounceTimers.current.forEach(timer => clearTimeout(timer));
    debounceTimers.current.clear();
  }, []);

  const getColor = useCallback((id: number): HexColor => {
    return cardColors[id] || "#000000";
  }, [cardColors]);

  return {
    cardColors,
    loadImageColor,
    handleImageLoad,
    resetColors,
    getColor,
  };
}
