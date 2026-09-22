import type { SearchResult } from "../types";

const MONTHS_NL = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

export type ResultGroupItem =
  | { kind: "year"; year: number }
  | { kind: "day"; label: string }
  | { kind: "result"; result: SearchResult };

export function groupResultsByDate(results: SearchResult[]): ResultGroupItem[] {
  const dated = results
    .filter((r) => r.timestamp != null)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const undated = results.filter((r) => r.timestamp == null);

  const items: ResultGroupItem[] = [];
  let lastYear: number | null = null;
  let lastDayKey: string | null = null;

  for (const result of dated) {
    const date = new Date((result.timestamp as number) * 1000);
    const year = date.getFullYear();
    const dayKey = `${year}-${date.getMonth()}-${date.getDate()}`;

    if (year !== lastYear) {
      items.push({ kind: "year", year });
      lastYear = year;
      lastDayKey = null;
    }
    if (dayKey !== lastDayKey) {
      items.push({
        kind: "day",
        label: `${MONTHS_NL[date.getMonth()]} ${date.getDate()}`,
      });
      lastDayKey = dayKey;
    }
    items.push({ kind: "result", result });
  }

  if (undated.length > 0) {
    items.push({ kind: "day", label: "Onbekende datum" });
    for (const result of undated) items.push({ kind: "result", result });
  }

  return items;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--:--";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatCount(count: number | null): string | null {
  if (count == null) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}
