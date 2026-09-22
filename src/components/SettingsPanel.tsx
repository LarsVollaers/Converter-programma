import type { ConvertSettings, OutputFormat, SampleRate } from "../types";
import { InfoTooltip } from "./InfoTooltip";

interface SettingsPanelProps {
  settings: ConvertSettings;
  onChange: (settings: ConvertSettings) => void;
  outputDir: string | null;
  onChooseOutputDir: () => void;
}

const FORMATS: { value: OutputFormat; label: string; hint: string }[] = [
  { value: "mp3", label: "MP3", hint: "Compact, lossy" },
  { value: "wav", label: "WAV", hint: "Ongecomprimeerd" },
  { value: "flac", label: "FLAC", hint: "Lossless" },
];

const BITRATES: (128 | 192 | 320)[] = [128, 192, 320];

const SAMPLE_RATES: { value: SampleRate; label: string }[] = [
  { value: 22050, label: "22.05 kHz — Radio" },
  { value: 44100, label: "44.1 kHz — CD" },
  { value: 48000, label: "48 kHz — Professional" },
];

function SectionLabel({ text, tooltip }: { text: string; tooltip: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
        {text}
      </p>
      <InfoTooltip text={tooltip} />
    </div>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  outputDir,
  onChooseOutputDir,
}: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div>
        <SectionLabel
          text="Uitvoerformaat"
          tooltip="Dit is het bestandstype dat je uiteindelijk krijgt. MP3 is klein en werkt overal, maar verliest een klein beetje kwaliteit. WAV is heel groot maar perfect. FLAC zit er tussenin: even goed als WAV, maar kleiner."
        />
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onChange({ ...settings, outputFormat: f.value })}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                settings.outputFormat === f.value
                  ? "border-[#198754] bg-[#198754]/15 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
              }`}
            >
              <div className="text-sm font-semibold">{f.label}</div>
              <div className="text-[11px] text-white/40">{f.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {settings.outputFormat === "mp3" && (
        <div>
          <SectionLabel
            text="Bitrate"
            tooltip="Hoe hoger het getal, hoe beter het geluid klinkt — maar het bestand wordt ook groter. 128 is prima voor gewoon luisteren, 192 is een goede middenweg, 320 klinkt het best."
          />
          <div className="grid grid-cols-3 gap-2">
            {BITRATES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onChange({ ...settings, bitrateKbps: b })}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  settings.bitrateKbps === b
                    ? "border-[#198754] bg-[#198754]/15 text-white"
                    : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                {b} kbps
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel
          text="Sample rate"
          tooltip="Dit bepaalt hoe vaak het geluid per seconde gemeten wordt. Hoger = preciezer geluid. 44.1 kHz is de normale kwaliteit van een muziek-cd en werkt voor bijna alles goed."
        />
        <div className="flex flex-col gap-2">
          {SAMPLE_RATES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ ...settings, sampleRate: s.value })}
              className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                settings.sampleRate === s.value
                  ? "border-[#198754] bg-[#198754]/15 text-white"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel
          text="Uitvoermap"
          tooltip="De map op je computer waar de omgezette bestanden worden opgeslagen. Klik erop om een map te kiezen."
        />
        <button
          type="button"
          onClick={onChooseOutputDir}
          className="w-full truncate rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-sm text-white/70 hover:bg-white/[0.05]"
          title={outputDir ?? undefined}
        >
          {outputDir ?? "Kies een map…"}
        </button>
      </div>
    </div>
  );
}
