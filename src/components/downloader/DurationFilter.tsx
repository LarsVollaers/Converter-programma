export type DurationFilterValue = "all" | "short" | "long";

interface DurationFilterProps {
  value: DurationFilterValue;
  onChange: (value: DurationFilterValue) => void;
}

const OPTIONS: { value: DurationFilterValue; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "short", label: "< 10 min" },
  { value: "long", label: "≥ 10 min" },
];

export function DurationFilter({ value, onChange }: DurationFilterProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-white/40">Duur</span>
      <div className="flex overflow-hidden rounded-lg border border-white/10">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 font-medium transition-colors ${
              value === o.value
                ? "bg-[#198754]/20 text-emerald-300"
                : "bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
