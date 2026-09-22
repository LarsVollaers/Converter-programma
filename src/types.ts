export type OutputFormat = "mp3" | "wav" | "flac";

export type SampleRate = 44100 | 22050 | 48000;

export type JobStatus =
  | "queued"
  | "running"
  | "done"
  | "error"
  | "canceled";

export interface ConvertSettings {
  outputFormat: OutputFormat;
  bitrateKbps: 128 | 192 | 320;
  sampleRate: SampleRate;
}

export interface ConversionJob {
  id: string;
  inputPath: string;
  inputName: string;
  outputName: string;
  status: JobStatus;
  percent: number;
  outputPath?: string;
  error?: string;
  settings: ConvertSettings;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  inputName: string;
  outputPath: string;
  outputFormat: OutputFormat;
  bitrateKbps?: number;
  sampleRate: SampleRate;
  finishedAt: number;
}

export type DownloadSource = "youtube" | "soundcloud";

export interface SearchResult {
  id: string;
  title: string;
  uploader: string;
  durationSeconds: number | null;
  thumbnail: string | null;
  webpageUrl: string;
  timestamp: number | null; // unix seconds
  viewCount: number | null;
  likeCount: number | null;
  source: DownloadSource;
}

export type DownloadJobStatus = "running" | "done" | "error";

export interface DownloadJob {
  id: string;
  result: SearchResult;
  status: DownloadJobStatus;
  percent: number;
  error?: string;
}

export interface DownloadHistoryEntry {
  id: string;
  title: string;
  uploader: string;
  source: DownloadSource;
  outputPath: string;
  thumbnail: string | null;
  finishedAt: number;
}

export interface SearchCacheEntry {
  fetchedAt: number;
  results: SearchResult[];
}

export const ACCEPTED_INPUT_EXTENSIONS = [
  // video
  "mkv",
  "mp4",
  "mov",
  "avi",
  "wmv",
  "flv",
  "webm",
  "m4v",
  "mpg",
  "mpeg",
  "ts",
  "m2ts",
  "3gp",
  "ogv",
  // audio
  "m4a",
  "aac",
  "wma",
  "ogg",
  "opus",
  "aiff",
  "amr",
  "wav",
  "mp3",
  "flac",
];
