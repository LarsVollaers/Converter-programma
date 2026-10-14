import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ConverterView } from "./views/ConverterView";
import { DownloaderView } from "./views/DownloaderView";
import {
  loadActiveTab,
  loadOutputDir,
  loadSettings,
  saveActiveTab,
  saveOutputDir,
  saveSettings,
  type ActiveTab,
} from "./lib/persist";
import type { ConvertSettings } from "./types";

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "converter", label: "Converter" },
  { id: "downloader", label: "Downloaden" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(loadActiveTab);
  const [settings, setSettings] = useState<ConvertSettings>(loadSettings);
  const [outputDir, setOutputDir] = useState<string | null>(loadOutputDir);

  useEffect(() => {
    saveActiveTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (outputDir) saveOutputDir(outputDir);
  }, [outputDir]);

  const chooseOutputDir = async () => {
    const dir = await open({ directory: true });
    if (typeof dir === "string") setOutputDir(dir);
  };

  return (
    <div className="flex h-screen flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">
            Video to audio and downloader
          </h1>
          <p className="text-xs text-white/40">
            {activeTab === "converter"
              ? "Video en audio converteren naar MP3, WAV of FLAC"
              : "Zoeken en downloaden van YouTube en SoundCloud"}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#198754]/20 text-emerald-300"
                  : "bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "converter" ? (
        <ConverterView
          settings={settings}
          onSettingsChange={setSettings}
          outputDir={outputDir}
          onChooseOutputDir={chooseOutputDir}
        />
      ) : (
        <DownloaderView
          settings={settings}
          outputDir={outputDir}
          onChooseOutputDir={chooseOutputDir}
        />
      )}
    </div>
  );
}
