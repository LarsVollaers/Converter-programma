import type { ConvertSettings } from "../types";

const SETTINGS_KEY = "converter.settings";
const OUTPUT_DIR_KEY = "converter.outputDir";
const ACTIVE_TAB_KEY = "converter.activeTab";

const DEFAULT_SETTINGS: ConvertSettings = {
  outputFormat: "mp3",
  bitrateKbps: 192,
  sampleRate: 44100,
};

export function loadSettings(): ConvertSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ConvertSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadOutputDir(): string | null {
  return localStorage.getItem(OUTPUT_DIR_KEY);
}

export function saveOutputDir(dir: string): void {
  localStorage.setItem(OUTPUT_DIR_KEY, dir);
}

export type ActiveTab = "converter" | "downloader";

export function loadActiveTab(): ActiveTab {
  return localStorage.getItem(ACTIVE_TAB_KEY) === "downloader"
    ? "downloader"
    : "converter";
}

export function saveActiveTab(tab: ActiveTab): void {
  localStorage.setItem(ACTIVE_TAB_KEY, tab);
}
