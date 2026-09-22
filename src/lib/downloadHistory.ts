import type { DownloadHistoryEntry } from "../types";

const STORAGE_KEY = "converter.downloadHistory";
const MAX_ENTRIES = 200;

export function loadDownloadHistory(): DownloadHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DownloadHistoryEntry[];
  } catch {
    return [];
  }
}

export function addDownloadHistoryEntry(
  entry: DownloadHistoryEntry,
): DownloadHistoryEntry[] {
  const current = loadDownloadHistory();
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeDownloadHistoryEntry(id: string): DownloadHistoryEntry[] {
  const next = loadDownloadHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearDownloadHistory(): DownloadHistoryEntry[] {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}
