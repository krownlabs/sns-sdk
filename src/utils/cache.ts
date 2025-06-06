import { CacheEntry } from '../types';
import { CACHE_CONFIG } from './constants';

/**
 * Simple in-memory cache with TTL support
 */
export class Cache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private defaultTTL: number = CACHE_CONFIG.DEFAULT_TTL,
    private maxEntries: number = CACHE_CONFIG.MAX_ENTRIES
  ) {
    this.startCleanupInterval();
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    // Remove oldest entries if we're at capacity
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

/**
 * Generate cache key for domain resolution
 */
export function generateResolutionCacheKey(domain: string): string {
  return `resolution:${domain.toLowerCase()}`;
}

/**
 * Generate cache key for reverse resolution
 */
export function generateReverseResolutionCacheKey(address: string): string {
  return `reverse:${address.toLowerCase()}`;
}

/**
 * Generate cache key for domain availability
 */
export function generateAvailabilityCacheKey(domain: string): string {
  return `availability:${domain.toLowerCase()}`;
}

/**
 * Generate cache key for domain records
 */
export function generateRecordsCacheKey(tokenId: string): string {
  return `records:${tokenId}`;
}

/**
 * Generate cache key for pricing
 */
export function generatePricingCacheKey(domain: string, years: number): string {
  return `pricing:${domain.toLowerCase()}:${years}`;
}