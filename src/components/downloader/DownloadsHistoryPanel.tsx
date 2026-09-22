import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { DownloadHistoryEntry } from "../../types";

interface DownloadsHistoryPanelProps {
  entries: DownloadHistoryEntry[];
  onRemove: (id: string) => void;
}

export function DownloadsHistoryPanel({
  entries,
  onRemove,
}: DownloadsHistoryPanelProps) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
        Downloads ({entries.length})
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-white/30">Nog geen downloads</p>
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/80">{entry.title}</p>
                <p className="text-[11px] text-white/40">
                  {new Date(entry.finishedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revealItemInDir(entry.outputPath)}
                title="Open map"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/[0.06]"
              >
                📁
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                title="Verwijder uit lijst"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
