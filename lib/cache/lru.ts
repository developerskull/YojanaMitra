import { getEnv } from '@/lib/env';

/**
 * Storage-agnostic cache interface so Redis / Upstash can replace the
 * in-memory LRU implementation later without rewriting API handlers.
 */
export interface ResponseCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
  stats(): { size: number; maxEntries: number; hits: number; misses: number };
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryLRUCache<T> implements ResponseCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly defaultTtlMs: number
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    // Refresh recency (Map preserves insertion order)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  stats() {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

export interface CachedChatResponse {
  lang: string;
  isCodeMixed: boolean;
  profile: Record<string, unknown>;
  schemes: unknown[];
  citations: unknown[];
  answerText: string;
  followups: string[];
  degradedMode: boolean;
}

let chatCacheSingleton: ResponseCache<CachedChatResponse> | null = null;

export function getChatResponseCache(): ResponseCache<CachedChatResponse> {
  if (!chatCacheSingleton) {
    const env = getEnv();
    chatCacheSingleton = new InMemoryLRUCache<CachedChatResponse>(
      env.CACHE_MAX_ENTRIES,
      env.CACHE_TTL_MS
    );
  }
  return chatCacheSingleton;
}
