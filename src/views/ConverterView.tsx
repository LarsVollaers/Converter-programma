import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { DropZone } from "../components/DropZone";
import { SettingsPanel } from "../components/SettingsPanel";
import { QueueList } from "../components/QueueList";
import { HistoryPanel } from "../components/HistoryPanel";
import { cancelJob, checkFfmpeg, convertFile, onProgress } from "../lib/convert";
import { addHistoryEntry, clearHistory, loadHistory } from "../lib/history";
import type { ConversionJob, ConvertSettings, HistoryEntry } from "../types";

function fileStem(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ConverterViewProps {
  settings: ConvertSettings;
  onSettingsChange: (settings: ConvertSettings) => void;
  outputDir: string | null;
  onChooseOutputDir: () => void;
}

export function ConverterView({
  settings,
  onSettingsChange,
  outputDir,
  onChooseOutputDir,
}: ConverterViewProps) {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ffmpegStatus, setFfmpegStatus] = useState<
    "checking" | "ok" | "missing"
  >("checking");
  const [isConverting, setIsConverting] = useState(false);
  const activeJobId = useRef<string | null>(null);

  useEffect(() => {
    if (!isTauri()) {
      setFfmpegStatus("missing");
      setHistory(loadHistory());
      return;
    }
    checkFfmpeg()
      .then(() => setFfmpegStatus("ok"))
      .catch(() => setFfmpegStatus("missing"));
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const unlistenPromise = onProgress((payload) => {
      if (payload.job_id !== activeJobId.current) return;
      setJobs((prev) =>
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

  useEffect(() => {
    setJobs((prev) =>
      prev.map((j) => (j.status === "queued" ? { ...j, settings } : j)),
    );
  }, [settings]);

  const addFiles = useCallback(
    (paths: string[]) => {
      setJobs((prev) => {
        const existing = new Set(prev.map((j) => j.inputPath));
        const newJobs: ConversionJob[] = paths
          .filter((p) => !existing.has(p))
          .map((p) => ({
            id: makeId(),
            inputPath: p,
            inputName: fileName(p),
            outputName: fileStem(p),
            status: "queued",
            percent: 0,
            settings,
            createdAt: Date.now(),
          }));
        return [...prev, ...newJobs];
      });
    },
    [settings],
  );

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const renameJob = useCallback((id: string, name: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, outputName: name } : j)),
    );
  }, []);

  const startAll = useCallback(async () => {
    if (!outputDir || isConverting) return;
    setIsConverting(true);
    const queue = jobs.filter((j) => j.status === "queued");
    for (const job of queue) {
      activeJobId.current = job.id;
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "running", percent: 0 } : j,
        ),
      );
      try {
        const outputPath = await convertFile(
          job.id,
          job.inputPath,
          outputDir,
          job.settings,
          job.outputName,
        );
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: "done", percent: 100, outputPath }
              : j,
          ),
        );
        const entry: HistoryEntry = {
          id: job.id,
          inputName: job.outputName,
          outputPath,
          outputFormat: job.settings.outputFormat,
          bitrateKbps:
            job.settings.outputFormat === "mp3"
              ? job.settings.bitrateKbps
              : undefined,
          sampleRate: job.settings.sampleRate,
          finishedAt: Date.now(),
        };
        setHistory(addHistoryEntry(entry));
      } catch (err) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: "error", error: String(err) }
              : j,
          ),
        );
      }
    }
    activeJobId.current = null;
    setIsConverting(false);
  }, [jobs, outputDir, isConverting]);

  const cancelAll = useCallback(async () => {
    if (activeJobId.current) {
      await cancelJob(activeJobId.current).catch(() => {});
    }
    setJobs((prev) =>
      prev.map((j) =>
        j.status === "running" || j.status === "queued"
          ? { ...j, status: "canceled" }
          : j,
      ),
    );
    setIsConverting(false);
  }, []);

  const queuedCount = jobs.filter((j) => j.status === "queued").length;

  return (
    <div className="grid flex-1 grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-col gap-4">
        {ffmpegStatus === "missing" && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">
            ffmpeg niet gevonden — installeer ffmpeg en zorg dat het in PATH
            staat
          </div>
        )}
        <DropZone onFiles={addFiles} />
        <QueueList jobs={jobs} onRemove={removeJob} onRename={renameJob} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={
              queuedCount === 0 ||
              !outputDir ||
              isConverting ||
              ffmpegStatus !== "ok"
            }
            onClick={startAll}
            className="flex-1 rounded-xl bg-[#198754] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#12a74d] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            {isConverting
              ? "Bezig met converteren…"
              : `Converteer${queuedCount ? ` (${queuedCount})` : ""}`}
          </button>
          {isConverting && (
            <button
              type="button"
              onClick={cancelAll}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.06]"
            >
              Annuleer
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          outputDir={outputDir}
          onChooseOutputDir={onChooseOutputDir}
        />
        <div className="min-h-0 flex-1">
          <HistoryPanel entries={history} onClear={() => setHistory(clearHistory())} />
        </div>
      </div>
    </div>
  );
}
