import type { SearchCacheEntry, SearchResult } from "../types";

const STORAGE_KEY = "converter.searchCache";
const MAX_ENTRIES = 30;

type CacheMap = Record<string, SearchCacheEntry>;

function loadAll(): CacheMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheMap;
  } catch {
    return {};
  }
}

function saveAll(cache: CacheMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function loadCachedResults(key: string): SearchCacheEntry | null {
  return loadAll()[key] ?? null;
}

export function saveCachedResults(key: string, results: SearchResult[]): void {
  const cache = loadAll();
  cache[key] = { fetchedAt: Date.now(), results };
  const keys = Object.keys(cache);
  if (keys.length > MAX_ENTRIES) {
    const oldest = keys
      .sort((a, b) => cache[a].fetchedAt - cache[b].fetchedAt)
      .slice(0, keys.length - MAX_ENTRIES);
    for (const k of oldest) delete cache[k];
  }
  saveAll(cache);
}
