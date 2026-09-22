import type { HistoryEntry } from "../types";

const STORAGE_KEY = "converter.history";
const MAX_ENTRIES = 200;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const current = loadHistory();
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): HistoryEntry[] {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}
