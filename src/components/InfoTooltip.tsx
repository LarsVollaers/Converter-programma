import { useState } from "react";

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-label="Uitleg"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-white/50 hover:border-emerald-400/60 hover:text-emerald-300"
      >
        ?
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-[9999] mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#111] p-2.5 text-[11px] leading-snug text-white/70 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
