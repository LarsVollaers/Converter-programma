import type { DownloadSource } from "../../types";

interface SearchBarProps {
  source: DownloadSource;
  onSourceChange: (source: DownloadSource) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  loading: boolean;
}

export function SearchBar({
  source,
  onSourceChange,
  query,
  onQueryChange,
  onSearch,
  loading,
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex overflow-hidden rounded-xl border border-white/10">
        {(["youtube", "soundcloud"] as DownloadSource[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSourceChange(s)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              source === s
                ? "bg-[#198754]/20 text-emerald-300"
                : "bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
            }`}
          >
            {s === "youtube" ? "YouTube" : "SoundCloud"}
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
        placeholder="Zoeken... of plak een profiel-/kanaal-url voor hun feed"
        spellCheck={false}
        className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-[#198754]"
      />
      <button
        type="button"
        onClick={onSearch}
        disabled={loading || query.trim().length === 0}
        className="rounded-xl bg-[#198754] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#12a74d] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
      >
        {loading ? "Zoeken…" : "Zoeken"}
      </button>
    </div>
  );
}
