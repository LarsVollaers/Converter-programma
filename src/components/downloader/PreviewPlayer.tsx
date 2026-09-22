import { useEffect, useRef } from "react";
import type { SearchResult } from "../../types";

interface PreviewPlayerProps {
  result: SearchResult | null;
  streamUrl: string | null;
  error: string | null;
  onClose: () => void;
}

export function PreviewPlayer({
  result,
  streamUrl,
  error,
  onClose,
}: PreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (streamUrl && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [streamUrl]);

  if (!result) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-xs text-white/70">
        {error ? (
          <span className="text-rose-300">
            Kon geen preview laden voor "{result.title}"
          </span>
        ) : (
          <>Nu speelt: {result.title}</>
        )}
      </span>
      {streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          controls
          className="h-8"
          style={{ maxWidth: 280 }}
        />
      )}
      <button
        type="button"
        onClick={onClose}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white/70"
      >
        ×
      </button>
    </div>
  );
}
