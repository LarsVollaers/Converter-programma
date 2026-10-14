import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ConvertSettings, DownloadSource, SearchResult } from "../types";

export interface DownloadProgressPayload {
  job_id: string;
  percent: number;
  status: "running" | "done" | "error";
}

export function checkYtdlp(): Promise<string> {
  return invoke("check_ytdlp");
}

export function searchMedia(
  query: string,
  source: DownloadSource,
  isUrl: boolean,
): Promise<SearchResult[]> {
  return invoke("search_media", { query, source, isUrl });
}

export function resolveStreamUrl(url: string): Promise<string> {
  return invoke("resolve_stream_url", { url });
}

export function downloadMedia(
  jobId: string,
  url: string,
  outputDir: string,
  settings: ConvertSettings,
  outputName?: string,
): Promise<string> {
  return invoke("download_media", {
    options: {
      job_id: jobId,
      url,
      output_dir: outputDir,
      output_format: settings.outputFormat,
      bitrate_kbps: settings.outputFormat === "mp3" ? settings.bitrateKbps : null,
      sample_rate: settings.sampleRate,
      output_name: outputName ?? null,
    },
  });
}

export function onDownloadProgress(
  callback: (payload: DownloadProgressPayload) => void,
): Promise<UnlistenFn> {
  return listen<DownloadProgressPayload>("download://progress", (event) => {
    callback(event.payload);
  });
}
