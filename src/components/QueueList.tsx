import type { ConversionJob } from "../types";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

interface QueueListProps {
  jobs: ConversionJob[];
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function StatusBadge({ status }: { status: ConversionJob["status"] }) {
  const styles: Record<ConversionJob["status"], string> = {
    queued: "bg-white/10 text-white/50",
    running: "bg-[#198754]/20 text-emerald-300",
    done: "bg-[#198754]/25 text-emerald-300",
    error: "bg-rose-500/20 text-rose-300",
    canceled: "bg-amber-500/20 text-amber-300",
  };
  const labels: Record<ConversionJob["status"], string> = {
    queued: "Wachtrij",
    running: "Bezig",
    done: "Klaar",
    error: "Fout",
    canceled: "Geannuleerd",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function QueueList({ jobs, onRemove, onRename }: QueueListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-10 text-sm text-white/30">
        Nog geen bestanden toegevoegd
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {job.status === "queued" ? (
                <input
                  value={job.outputName}
                  onChange={(e) => onRename(job.id, e.target.value)}
                  spellCheck={false}
                  className="w-full truncate border-b border-transparent bg-transparent text-sm font-medium text-white/90 outline-none hover:border-white/15 focus:border-[#198754]"
                  title={job.inputName}
                />
              ) : (
                <p className="truncate text-sm font-medium text-white/90">
                  {job.outputName}
                </p>
              )}
              <p className="text-[11px] text-white/40">
                {job.settings.outputFormat.toUpperCase()}
                {job.settings.outputFormat === "mp3"
                  ? ` · ${job.settings.bitrateKbps}kbps`
                  : ""}{" "}
                · {job.settings.sampleRate / 1000}kHz
              </p>
            </div>
            <StatusBadge status={job.status} />
            {job.status === "done" && job.outputPath && (
              <button
                type="button"
                onClick={() => revealItemInDir(job.outputPath!)}
                className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/[0.06]"
              >
                Open map
              </button>
            )}
            {(job.status === "queued" || job.status === "error") && (
              <button
                type="button"
                onClick={() => onRemove(job.id)}
                className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/40 hover:bg-white/[0.06] hover:text-white/70"
              >
                Verwijder
              </button>
            )}
          </div>
          {job.status === "running" && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-[#198754] transition-all"
                style={{ width: `${job.percent}%` }}
              />
            </div>
          )}
          {job.status === "error" && job.error && (
            <p className="mt-1 text-[11px] text-rose-300/80">{job.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}
