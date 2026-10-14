import { openUrl } from "@tauri-apps/plugin-opener";
import type { DownloadJob, SearchResult } from "../../types";
import { formatCount, formatDuration, groupResultsByDate } from "../../lib/dateGroups";

interface ResultsListProps {
  results: SearchResult[];
  downloadJobs: DownloadJob[];
  previewingId: string | null;
  previewLoadingId: string | null;
  onPreview: (result: SearchResult) => void;
  onDownload: (result: SearchResult) => void;
}

function jobFor(jobs: DownloadJob[], resultId: string): DownloadJob | undefined {
  return jobs.find((j) => j.result.id === resultId);
}

export function ResultsList({
  results,
  downloadJobs,
  previewingId,
  previewLoadingId,
  onPreview,
  onDownload,
}: ResultsListProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-10 text-sm text-white/30">
        Geen resultaten
      </div>
    );
  }

  const items = groupResultsByDate(results);

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
      {items.map((item, i) => {
        if (item.kind === "year") {
          return (
            <p
              key={`y-${item.year}-${i}`}
              className="mt-3 text-sm font-semibold text-white/70 first:mt-0"
            >
              {item.year}
            </p>
          );
        }
        if (item.kind === "day") {
          return (
            <p
              key={`d-${item.label}-${i}`}
              className="mt-2 text-[11px] font-medium uppercase tracking-wide text-white/30"
            >
              {item.label}
            </p>
          );
        }

        const result = item.result;
        const job = jobFor(downloadJobs, result.id);
        const isPreviewing = previewingId === result.id;
        const isPreviewLoading = previewLoadingId === result.id;
        const viewCount = formatCount(result.viewCount);
        const likeCount = formatCount(result.likeCount);

        return (
          <div
            key={result.id}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 hover:border-white/10"
          >
            <div className="flex items-center gap-3">
              {result.thumbnail ? (
                <img
                  src={result.thumbnail}
                  alt=""
                  className="h-11 w-11 flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-11 w-11 flex-shrink-0 rounded-lg bg-white/5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/90">{result.title}</p>
                <p className="truncate text-[11px] text-white/40">
                  {result.uploader} · {formatDuration(result.durationSeconds)}
                  {viewCount ? ` · ${viewCount} views` : ""}
                  {likeCount ? ` · ${likeCount} likes` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onPreview(result)}
                disabled={isPreviewLoading}
                title="Voorluisteren"
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-sm transition-colors ${
                  isPreviewing
                    ? "border-[#198754] bg-[#198754]/15 text-emerald-300"
                    : "border-white/10 text-white/60 hover:bg-white/[0.06]"
                }`}
              >
                {isPreviewLoading ? "…" : isPreviewing ? "⏸" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => openUrl(result.webpageUrl)}
                title="Open origineel"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/[0.06]"
              >
                ⧉
              </button>
              <button
                type="button"
                onClick={() => onDownload(result)}
                disabled={job?.status === "running" || job?.status === "done"}
                className="flex-shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {job?.status === "running"
                  ? `${Math.round(job.percent)}%`
                  : job?.status === "done"
                    ? "Gedownload"
                    : job?.status === "error"
                      ? "Opnieuw"
                      : "Downloaden"}
              </button>
            </div>
            {job?.status === "error" && job.error && (
              <p className="mt-1.5 pl-[56px] text-[11px] text-rose-300/80">
                {job.error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
