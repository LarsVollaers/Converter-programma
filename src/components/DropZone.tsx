import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { ACCEPTED_INPUT_EXTENSIONS } from "../types";

interface DropZoneProps {
  onFiles: (paths: string[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [isHovering, setIsHovering] = useState(false);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "over") {
          setIsHovering(true);
        } else if (event.payload.type === "drop") {
          setIsHovering(false);
          const accepted = event.payload.paths.filter((p) =>
            ACCEPTED_INPUT_EXTENSIONS.includes(
              p.split(".").pop()?.toLowerCase() ?? "",
            ),
          );
          if (accepted.length > 0) onFilesRef.current(accepted);
        } else {
          setIsHovering(false);
        }
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, []);

  const browse = useCallback(async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Video / Audio",
          extensions: ACCEPTED_INPUT_EXTENSIONS,
        },
      ],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    onFilesRef.current(paths);
  }, []);

  return (
    <button
      type="button"
      onClick={browse}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        isHovering
          ? "border-[#198754] bg-[#198754]/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-8 w-8 text-white/40"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16.5V4.5m0 0-4 4m4-4 4 4M4 16.5v2.25A2.25 2.25 0 0 0 6.25 21h11.5a2.25 2.25 0 0 0 2.25-2.25V16.5"
        />
      </svg>
      <p className="text-sm font-medium text-white/80">
        Sleep bestanden hierheen of klik om te bladeren
      </p>
      <p className="text-xs text-white/40">
        Ondersteund: {ACCEPTED_INPUT_EXTENSIONS.join(", ").toUpperCase()}
      </p>
    </button>
  );
}
