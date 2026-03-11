import { useState } from "react";

interface Props {
  tooltip: string;
  theme?: "dark" | "light";
}

export function InfoIcon({ tooltip, theme = "dark" }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isLight = theme === "light";

  return (
    <div className="relative inline-block group">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors cursor-help ${
          isLight
            ? "bg-[#e1dcff] hover:bg-[#d4ceff] text-[#2D3142]"
            : "bg-zinc-700/60 hover:bg-violet-600/40 text-zinc-400 hover:text-violet-300"
        }`}
        aria-label="More information"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {showTooltip && (
        <div className={`absolute left-0 top-full mt-2 w-48 rounded-lg px-3 py-2 text-sm shadow-lg backdrop-blur z-50 pointer-events-none ${
          isLight
            ? "bg-white border border-[#cfc7ff] text-zinc-700"
            : "bg-zinc-900/95 border border-zinc-700/80 text-zinc-300"
        }`}>
          {tooltip}
          <div
            className={`absolute -top-1 left-4 w-2 h-2 transform -rotate-45 ${
              isLight
                ? "bg-white border-l border-t border-[#cfc7ff]"
                : "bg-zinc-900/95 border-l border-t border-zinc-700/80"
            }`}
          />
        </div>
      )}
    </div>
  );
}
