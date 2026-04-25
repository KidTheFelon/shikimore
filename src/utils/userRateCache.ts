import { invoke } from '@tauri-apps/api/core';
import type { UserRateSimple } from '../types';

const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const userRateCache = new Map<string, { data: UserRateSimple | null; timestamp: number }>();
const pendingRequests = new Map<string, Promise<UserRateSimple | null>>();

function getCacheKey(targetId: number, targetType: string): string {
  return `${targetType}:${targetId}`;
}

function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_TTL;
}

export async function getCachedUserRate(targetId: number, targetType: 'Anime' | 'Manga'): Promise<UserRateSimple | null> {
  const key = getCacheKey(targetId, targetType);

  // Check cache first
  const cached = userRateCache.get(key);
  if (cached && !isExpired(cached.timestamp)) {
    console.log('[UserRateCache] Cache hit for', key);
    return cached.data;
  }

  // Check if there's already a pending request
  if (pendingRequests.has(key)) {
    console.log('[UserRateCache] Request pending for', key);
    return pendingRequests.get(key)!;
  }

  // Create new request
  const promise = (async () => {
    try {
      console.log('[UserRateCache] Fetching user rate for', key);
      const rate = await invoke<UserRateSimple | null>('get_user_rate', {
        targetId,
        targetType,
      });
      console.log('[UserRateCache] Received user rate:', rate);

      // Cache the result
      userRateCache.set(key, { data: rate, timestamp: Date.now() });
      return rate;
    } catch (error) {
      console.error('[UserRateCache] Failed to fetch user rate:', error);
      // Return null on error
      return null;
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, promise);
  return promise;
}

export function invalidateUserRate(targetId: number, targetType: 'Anime' | 'Manga'): void {
  const key = getCacheKey(targetId, targetType);
  userRateCache.delete(key);
  console.log('[UserRateCache] Invalidated cache for', key);
}

export function clearUserRateCache(): void {
  userRateCache.clear();
  pendingRequests.clear();
  console.log('[UserRateCache] Cleared all cache');
}
