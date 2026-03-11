import { cn } from "../utils/cn";
import { InfoIcon } from "./InfoIcon";

interface Props {
  seed: string;
  width: number;
  height: number;
  numImages: number;
  theme: "dark" | "light";
  onSeedChange: (v: string) => void;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onNumImagesChange: (v: number) => void;
  onUseScreenResolution: () => void;
}

const DIMENSION_PRESETS = [
  { label: "Square", w: 512, h: 512 },
  { label: "Portrait", w: 512, h: 768 },
  { label: "Landscape", w: 768, h: 512 },
  { label: "Wide", w: 1024, h: 576 },
];

const NUM_OPTIONS = [1, 2, 3, 4];
const DIMENSION_STEP = 64;
const MIN_DIMENSION = 256;
const MAX_DIMENSION = 2048;

function normalizeDimension(value: number) {
  const rounded = Math.round(value / DIMENSION_STEP) * DIMENSION_STEP;
  return Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, rounded));
}

function getScreenResolution() {
  if (typeof window === "undefined") {
    return { width: 1024, height: 1024 };
  }

  return {
    width: normalizeDimension(window.innerWidth),
    height: normalizeDimension(window.innerHeight),
  };
}

export function ParameterPanel({
  seed,
  width,
  height,
  numImages,
  theme,
  onSeedChange,
  onWidthChange,
  onHeightChange,
  onNumImagesChange,
  onUseScreenResolution,
}: Props) {
  const isLight = theme === "light";
  const activePreset = DIMENSION_PRESETS.find((p) => p.w === width && p.h === height);
  const screenResolution = getScreenResolution();
  const isScreenPresetActive = width === screenResolution.width && height === screenResolution.height;

  return (
    <div className="space-y-5">
      {/* Dimension Presets */}
      <div>
        <label className={cn("flex items-center gap-1.5 text-sm font-medium uppercase tracking-widest mb-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
          Dimensions
          <InfoIcon tooltip="choose or customize the width and height of generated images. larger dimensions take longer to generate." theme={theme} />
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {DIMENSION_PRESETS.map((preset) => {
            const isActive = activePreset?.label === preset.label;
            return (
              <button
                key={preset.label}
                onClick={() => {
                  onWidthChange(preset.w);
                  onHeightChange(preset.h);
                }}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 px-2 text-xs transition-all duration-200 cursor-pointer",
                  isActive
                    ? (isLight ? "border-[#2D3142] text-white" : "border-violet-500 bg-violet-500/10 text-violet-300")
                    : (isLight ? "border-[#cfc7ff] bg-white text-zinc-700 hover:border-[#2D3142] hover:text-zinc-900" : "border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200")
                )}
                style={isLight && isActive ? { backgroundColor: "#2D3142" } : undefined}
              >
                {/* Mini aspect ratio visualizer */}
                <div className="flex items-center justify-center h-5">
                  <div
                    className={cn(
                      "rounded-sm border",
                      isActive
                        ? (isLight ? "border-white/80" : "border-violet-400")
                        : (isLight ? "border-zinc-400 group-hover:border-zinc-600" : "border-zinc-500 group-hover:border-zinc-400")
                    )}
                    style={{
                      width: `${Math.round((preset.w / Math.max(preset.w, preset.h)) * 20)}px`,
                      height: `${Math.round((preset.h / Math.max(preset.w, preset.h)) * 20)}px`,
                    }}
                  />
                </div>
                <span className="font-medium">{preset.label}</span>
                <span className={cn("text-xs", isActive ? (isLight ? "text-white/80" : "text-violet-400") : (isLight ? "text-zinc-500" : "text-zinc-500"))}>
                  {preset.w}×{preset.h}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom W/H */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-2", isLight ? "bg-[#f3f1ff] border-[#cfc7ff]" : "bg-zinc-800/50 border-zinc-700/60")}>
            <span className={cn("text-xs font-medium uppercase", isLight ? "text-zinc-500" : "text-zinc-500")}>W</span>
            <input
              type="number"
              value={width}
              min={256}
              max={2048}
              step={64}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              className={cn("w-full bg-transparent text-sm outline-none", isLight ? "text-zinc-900" : "text-zinc-200")}
            />
          </div>
          <div className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-2", isLight ? "bg-[#f3f1ff] border-[#cfc7ff]" : "bg-zinc-800/50 border-zinc-700/60")}>
            <span className={cn("text-xs font-medium uppercase", isLight ? "text-zinc-500" : "text-zinc-500")}>H</span>
            <input
              type="number"
              value={height}
              min={256}
              max={2048}
              step={64}
              onChange={(e) => onHeightChange(Number(e.target.value))}
              className={cn("w-full bg-transparent text-sm outline-none", isLight ? "text-zinc-900" : "text-zinc-200")}
            />
          </div>
        </div>

        <button
          onClick={onUseScreenResolution}
          className={cn(
            "mt-2 w-full rounded-lg border px-2.5 py-2 text-xs transition-colors cursor-pointer",
            isScreenPresetActive
              ? (isLight ? "border-[#2D3142] text-white" : "border-violet-500 bg-violet-500/10 text-violet-300")
                : (isLight ? "border-[#cfc7ff] bg-white text-zinc-700 hover:border-[#2D3142] hover:text-zinc-900" : "border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:border-violet-500/50 hover:text-violet-300")
          )}
          style={isLight && isScreenPresetActive ? { backgroundColor: "#2D3142" } : undefined}
        >
          Use screen resolution ({screenResolution.width}x{screenResolution.height})
        </button>
      </div>

      {/* Number of Images */}
      <div>
        <label className={cn("flex items-center gap-1.5 text-sm font-medium uppercase tracking-widest mb-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
          Images
          <InfoIcon tooltip="choose how many images to generate at once. more images take longer but give you more options. you can also enter a custom number." theme={theme} />
        </label>
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {NUM_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onNumImagesChange(n)}
                className={cn(
                  "flex-1 rounded-xl border py-2 text-sm font-semibold transition-all duration-200 cursor-pointer",
                  numImages === n
                    ? (isLight ? "border-[#2D3142] text-white" : "border-violet-500 bg-violet-500/10 text-violet-300")
                    : (isLight ? "border-[#cfc7ff] bg-white text-zinc-700 hover:border-[#2D3142] hover:text-zinc-900" : "border-zinc-700/60 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200")
                )}
                style={isLight && numImages === n ? { backgroundColor: "#2D3142" } : undefined}
              >
                {n}
              </button>
            ))}
          </div>
          <div className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-2", isLight ? "bg-[#f3f1ff] border-[#cfc7ff]" : "bg-zinc-800/50 border-zinc-700/60")}>
            <span className="text-xs text-zinc-500 font-medium uppercase whitespace-nowrap">Custom</span>
            <input
              type="number"
              value={numImages}
              min={1}
              max={50000}
              onChange={(e) => onNumImagesChange(Number(e.target.value) || 1)}
              className={cn("w-full bg-transparent text-sm outline-none", isLight ? "text-zinc-900" : "text-zinc-200")}
              placeholder="1-50000"
            />
          </div>
        </div>
      </div>

      {/* Seed */}
      <div>
        <label className={cn("flex items-center gap-1.5 text-sm font-medium uppercase tracking-widest mb-2", isLight ? "text-zinc-600" : "text-zinc-400")}>
          Seed
          <InfoIcon tooltip="use the same seed to reproduce consistent results. leave empty for random variations." theme={theme} />
        </label>
        <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors", isLight ? "border-[#cfc7ff] bg-white focus-within:border-[#2D3142]" : "border-zinc-700/60 bg-zinc-800/50 focus-within:border-violet-500/60")}>
          <svg className={cn("h-3.5 w-3.5 shrink-0", isLight ? "text-zinc-500" : "text-zinc-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707" />
          </svg>
          <input
            type="text"
            placeholder="Random"
            value={seed}
            onChange={(e) => onSeedChange(e.target.value)}
            className={cn("w-full bg-transparent text-sm outline-none", isLight ? "text-zinc-900 placeholder-zinc-500" : "text-zinc-200 placeholder-zinc-600")}
          />
          <button
            onClick={() => onSeedChange(String(Math.floor(Math.random() * 999999)))}
            title="Randomize seed"
            className={cn("transition-colors cursor-pointer", isLight ? "text-zinc-500 hover:text-[#2D3142]" : "text-zinc-600 hover:text-violet-400")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
