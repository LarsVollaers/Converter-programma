import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { HistoryEntry } from "../types";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onClear: () => void;
}

export function HistoryPanel({ entries, onClear }: HistoryPanelProps) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Geschiedenis
        </p>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-white/40 hover:text-white/70"
          >
            Wis geschiedenis
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-white/30">Nog geen conversies</p>
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/10"
            >
              <p className="truncate text-sm text-white/80">
                {entry.inputName}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[11px] text-white/40">
                  {entry.outputFormat.toUpperCase()}
                  {entry.bitrateKbps ? ` · ${entry.bitrateKbps}kbps` : ""} ·{" "}
                  {new Date(entry.finishedAt).toLocaleString()}
                </p>
                <button
                  type="button"
                  onClick={() => revealItemInDir(entry.outputPath)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/[0.06]"
                >
                  Open map
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
