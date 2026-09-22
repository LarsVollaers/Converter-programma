import { useCallback, useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { SearchBar } from "../components/downloader/SearchBar";
import { DurationFilter, type DurationFilterValue } from "../components/downloader/DurationFilter";
import { ResultsList } from "../components/downloader/ResultsList";
import { PreviewPlayer } from "../components/downloader/PreviewPlayer";
import { DownloadsHistoryPanel } from "../components/downloader/DownloadsHistoryPanel";
import {
  downloadMedia,
  onDownloadProgress,
  resolveStreamUrl,
  searchMedia,
} from "../lib/downloader";
import { loadCachedResults, saveCachedResults } from "../lib/searchCache";
import {
  addDownloadHistoryEntry,
  loadDownloadHistory,
  removeDownloadHistoryEntry,
} from "../lib/downloadHistory";
import type {
  ConvertSettings,
  DownloadHistoryEntry,
  DownloadJob,
  DownloadSource,
  SearchResult,
} from "../types";

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isUrlQuery(q: string): boolean {
  return /^https?:\/\//i.test(q.trim());
}

interface DownloaderViewProps {
  settings: ConvertSettings;
  outputDir: string | null;
  onChooseOutputDir: () => void;
}

export function DownloaderView({
  settings,
  outputDir,
  onChooseOutputDir,
}: DownloaderViewProps) {
  const [source, setSource] = useState<DownloadSource>("youtube");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cacheFetchedAt, setCacheFetchedAt] = useState<number | null>(null);
  const [durationFilter, setDurationFilter] = useState<DurationFilterValue>("all");
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [history, setHistory] = useState<DownloadHistoryEntry[]>([]);

  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadDownloadHistory());
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const unlistenPromise = onDownloadProgress((payload) => {
      setDownloadJobs((prev) =>
        prev.map((j) =>
          j.id === payload.job_id
            ? {
                ...j,
                percent: payload.percent,
                status: payload.status === "error" ? "error" : j.status,
              }
            : j,
        ),
      );
    });
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  const runSearch = useCallback(
    async (forceRefresh: boolean) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const isUrl = isUrlQuery(trimmed);
      const cacheKey = isUrl ? `url:${trimmed}` : `${source}:${trimmed}`;

      if (!forceRefresh) {
        const cached = loadCachedResults(cacheKey);
        if (cached) {
          setResults(cached.results);
          setCacheFetchedAt(cached.fetchedAt);
          setSearchError(null);
          return;
        }
      }

      setLoading(true);
      setSearchError(null);
      try {
        const found = await searchMedia(trimmed, source, isUrl);
        setResults(found);
        setCacheFetchedAt(null);
        saveCachedResults(cacheKey, found);
      } catch (err) {
        setSearchError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [query, source],
  );

  const handleDownload = useCallback(
    async (result: SearchResult) => {
      if (!outputDir) return;
      const jobId = makeId();
      setDownloadJobs((prev) => [
        ...prev.filter((j) => j.result.id !== result.id),
        { id: jobId, result, status: "running", percent: 0 },
      ]);
      try {
        const outputPath = await downloadMedia(
          jobId,
          result.webpageUrl,
          outputDir,
          settings,
          result.title,
        );
        setDownloadJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "done", percent: 100 } : j,
          ),
        );
        const entry: DownloadHistoryEntry = {
          id: jobId,
          title: result.title,
          uploader: result.uploader,
          source: result.source,
          outputPath,
          thumbnail: result.thumbnail,
          finishedAt: Date.now(),
        };
        setHistory(addDownloadHistoryEntry(entry));
      } catch (err) {
        setDownloadJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: "error", error: String(err) }
              : j,
          ),
        );
      }
    },
    [outputDir, settings],
  );

  const handlePreview = useCallback(
    async (result: SearchResult) => {
      if (previewResult?.id === result.id) {
        setPreviewResult(null);
        setPreviewStreamUrl(null);
        setPreviewError(null);
        return;
      }
      setPreviewResult(result);
      setPreviewStreamUrl(null);
      setPreviewError(null);
      setPreviewLoadingId(result.id);
      try {
        const url = await resolveStreamUrl(result.webpageUrl);
        setPreviewStreamUrl(url);
      } catch {
        setPreviewError("failed");
      } finally {
        setPreviewLoadingId(null);
      }
    },
    [previewResult],
  );

  const filteredResults = results.filter((r) => {
    if (durationFilter === "all") return true;
    if (r.durationSeconds == null) return true;
    return durationFilter === "short"
      ? r.durationSeconds < 600
      : r.durationSeconds >= 600;
  });

  const settingsHint =
    settings.outputFormat === "mp3"
      ? `MP3 ${settings.bitrateKbps}kbps`
      : settings.outputFormat.toUpperCase();

  return (
    <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200/80">
          Alleen voor eigen gebruik — gebruik dit binnen de voorwaarden van
          het platform waar je van downloadt. Spotify wordt bewust niet
          ondersteund.
        </div>

        <SearchBar
          source={source}
          onSourceChange={setSource}
          query={query}
          onQueryChange={setQuery}
          onSearch={() => runSearch(false)}
          loading={loading}
        />

        <div className="flex items-center justify-between">
          <DurationFilter value={durationFilter} onChange={setDurationFilter} />
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            {!outputDir && (
              <button
                type="button"
                onClick={onChooseOutputDir}
                className="text-amber-300 hover:underline"
              >
                Kies eerst een uitvoermap
              </button>
            )}
            <span>Downloads: {settingsHint}</span>
          </div>
        </div>

        {cacheFetchedAt && (
          <p className="text-[11px] text-white/40">
            Resultaten uit cache (
            {new Date(cacheFetchedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            ) —{" "}
            <button
              type="button"
              onClick={() => runSearch(true)}
              className="text-emerald-400 hover:underline"
            >
              Vernieuwen
            </button>
          </p>
        )}
        {searchError && (
          <p className="text-[11px] text-rose-300">{searchError}</p>
        )}

        <ResultsList
          results={filteredResults}
          downloadJobs={downloadJobs}
          previewingId={previewResult?.id ?? null}
          previewLoadingId={previewLoadingId}
          onPreview={handlePreview}
          onDownload={handleDownload}
        />

        <PreviewPlayer
          result={previewResult}
          streamUrl={previewStreamUrl}
          error={previewError}
          onClose={() => {
            setPreviewResult(null);
            setPreviewStreamUrl(null);
            setPreviewError(null);
          }}
        />
      </div>

      <div className="min-h-0">
        <DownloadsHistoryPanel
          entries={history}
          onRemove={(id) => setHistory(removeDownloadHistoryEntry(id))}
        />
      </div>
    </div>
  );
}
