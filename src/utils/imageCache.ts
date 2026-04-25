import { invoke } from '@tauri-apps/api/core';

const MAX_CACHE_SIZE = 200;
const imageCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

let hits = 0;
let misses = 0;

function evictOldest(): void {
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const firstKey = imageCache.keys().next().value;
    if (firstKey) {
      imageCache.delete(firstKey);
    }
  }
}

export async function getCachedImageUrl(url: string): Promise<string> {
  // Check memory cache first
  if (imageCache.has(url)) {
    hits++;
    const cached = imageCache.get(url)!;
    // Move to end (most recently used)
    imageCache.delete(url);
    imageCache.set(url, cached);
    return cached;
  }

  misses++;

  // Check if there's already a pending request for this URL
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)!;
  }

  // Create new request
  const promise = (async () => {
    try {
      const dataUrl = await invoke<string>('get_cached_image', { url });

      // Cache the result with LRU eviction
      evictOldest();
      imageCache.set(url, dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('[ImageCache] Failed to get cached image:', error);
      // Return original URL on error
      return url;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, promise);
  return promise;
}

export function clearImageCache(): void {
  imageCache.clear();
  pendingRequests.clear();
  hits = 0;
  misses = 0;
}

export function getImageCacheSize(): number {
  return imageCache.size;
}

export function getImageCacheMetrics() {
  const total = hits + misses;
  const hitRate = total > 0 ? (hits / total) * 100 : 0;
  return {
    hits,
    misses,
    total,
    hitRate,
    size: imageCache.size,
  };
}
