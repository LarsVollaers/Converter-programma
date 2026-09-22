import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ConvertSettings } from "../types";

export interface ProgressPayload {
  job_id: string;
  percent: number;
  status: "running" | "done" | "error";
}

export function checkFfmpeg(): Promise<string> {
  return invoke("check_ffmpeg");
}

export function convertFile(
  jobId: string,
  inputPath: string,
  outputDir: string,
  settings: ConvertSettings,
  outputName?: string,
): Promise<string> {
  return invoke("convert_file", {
    options: {
      job_id: jobId,
      input_path: inputPath,
      output_dir: outputDir,
      output_format: settings.outputFormat,
      bitrate_kbps: settings.outputFormat === "mp3" ? settings.bitrateKbps : null,
      sample_rate: settings.sampleRate,
      output_name: outputName ?? null,
    },
  });
}

export function cancelJob(jobId: string): Promise<void> {
  return invoke("cancel_job", { jobId });
}

export function onProgress(
  callback: (payload: ProgressPayload) => void,
): Promise<UnlistenFn> {
  return listen<ProgressPayload>("convert://progress", (event) => {
    callback(event.payload);
  });
}
