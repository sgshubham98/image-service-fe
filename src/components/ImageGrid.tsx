import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GeneratedImage, HistoryEntry } from "../types";
import { cn } from "../utils/cn";

interface Props {
  entry: HistoryEntry;
  onToggleSelect: (entryId: string, imageId: string) => void;
  onDownloadSelected: (entryId: string) => void;
  onDownloadAll: (entryId: string) => void;
  theme: "dark" | "light";
}

const PREVIEW_SCALE = 0.35;
const MIN_TILE_WIDTH = 120;
const MAX_TILE_WIDTH = 420;

function getScaledTileWidth(sourceWidth: number) {
  const scaled = Math.round(sourceWidth * PREVIEW_SCALE);
  return Math.max(MIN_TILE_WIDTH, Math.min(MAX_TILE_WIDTH, scaled));
}

async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function ImageCard({
  image,
  index,
  onToggle,
  entryId,
  imageWidth,
  aspectRatio,
  onOpenPreview,
  theme,
}: {
  image: GeneratedImage;
  index: number;
  onToggle: () => void;
  entryId: string;
  imageWidth: number;
  aspectRatio: number;
  onOpenPreview: () => void;
  theme: "dark" | "light";
}) {
  const isLight = theme === "light";
  const [loaded, setLoaded] = useState(false);
  const safeAspectRatio = Math.max(0.1, aspectRatio);
  const safeWidth = getScaledTileWidth(imageWidth);

  return (
    <>
      <div
        className={cn(
          "group relative rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer",
          image.selected
            ? "border-violet-500 shadow-lg shadow-violet-900/30"
            : isLight ? "border-transparent hover:border-[#2D3142]" : "border-transparent hover:border-zinc-600"
        )}
        style={{ width: `${safeWidth}px`, aspectRatio: String(safeAspectRatio) }}
      >
        {/* Keep shimmer mounted and fade it out to avoid abrupt transitions. */}
        <div
          className={cn(
            "absolute inset-0 shimmer transition-opacity duration-700 ease-out",
            loaded ? "opacity-0" : "opacity-100"
          )}
        />

        <div
          className={cn("relative h-full w-full overflow-hidden", isLight ? "bg-zinc-200/70" : "bg-zinc-900/80")}
          onClick={onOpenPreview}
        >
          <img
            src={image.url}
            alt=""
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 h-full w-full object-cover blur-md scale-110 transition-opacity duration-700 ease-out",
              loaded ? "opacity-45" : "opacity-0"
            )}
          />
          <img
            src={image.url}
            alt={`Generated image ${index + 1}`}
            className={cn(
              "relative z-10 h-full w-full object-contain transition-all duration-700 ease-out",
              loaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
            )}
            onLoad={(e) => {
              const target = e.currentTarget;
              if (typeof target.decode === "function") {
                target.decode().catch(() => undefined).finally(() => setLoaded(true));
                return;
              }
              setLoaded(true);
            }}
          />
        </div>

        {/* Overlay controls */}
        <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 via-transparent to-black/30">
          {/* Select checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={cn(
              "self-start h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer",
              image.selected ? "bg-violet-500 border-violet-400" : "bg-black/40 border-zinc-400 hover:border-white"
            )}
          >
            {image.selected && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Bottom actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium bg-black/50 rounded-md px-1.5 py-0.5">
              #{index + 1}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onOpenPreview(); }}
                className="h-6 w-6 rounded-lg bg-black/50 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                title="View full size"
              >
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(image.url, `imagify-${entryId}-${index + 1}.jpg`);
                }}
                className="h-6 w-6 rounded-lg bg-black/50 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                title="Download"
              >
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Selected indicator */}
        {image.selected && (
          <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
        )}
      </div>

    </>
  );
}

export function ImageGrid({ entry, onToggleSelect, onDownloadSelected, onDownloadAll, theme }: Props) {
  const isLight = theme === "light";
  const selectedCount = entry.images.filter((i) => i.selected).length;
  const plannedCount = Math.max(entry.params.numImages, entry.images.length);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const activePreview = previewIndex !== null ? entry.images[previewIndex] : null;
  const aspectRatio = useMemo(() => {
    const safeWidth = Math.max(1, entry.params.width);
    const safeHeight = Math.max(1, entry.params.height);
    return safeWidth / safeHeight;
  }, [entry.params.width, entry.params.height]);
  const safeAspectRatio = Math.max(0.1, aspectRatio);
  const safeWidth = getScaledTileWidth(entry.params.width);

  const handlePrev = () => {
    if (entry.images.length === 0) return;
    setPreviewIndex((prev) => {
      if (prev === null) return 0;
      return (prev - 1 + entry.images.length) % entry.images.length;
    });
  };

  const handleNext = () => {
    if (entry.images.length === 0) return;
    setPreviewIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % entry.images.length;
    });
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Action bar */}
      {entry.images.length > 0 && (
        <div className="flex items-center justify-between">
          <span className={cn("text-xs", isLight ? "text-zinc-600" : "text-zinc-500")}>
            {selectedCount > 0 ? `${selectedCount} selected` : `${entry.images.length} image${entry.images.length > 1 ? "s" : ""}`}
          </span>
          <div className="flex gap-2">
            {selectedCount > 0 && (
              <button
                onClick={() => onDownloadSelected(entry.id)}
                className={cn("flex items-center gap-1 text-xs transition-colors cursor-pointer", isLight ? "text-indigo-600 hover:text-indigo-700" : "text-violet-400 hover:text-violet-300")}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download selected
              </button>
            )}
            <button
              onClick={() => onDownloadAll(entry.id)}
              className={cn("flex items-center gap-1 text-xs transition-colors cursor-pointer", isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-200")}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              All
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-start">
        {entry.images.map((img, i) => (
          <ImageCard
            key={img.id}
            image={img}
            index={i}
            entryId={entry.id}
            imageWidth={entry.params.width}
            aspectRatio={aspectRatio}
            onOpenPreview={() => setPreviewIndex(i)}
            onToggle={() => onToggleSelect(entry.id, img.id)}
            theme={theme}
          />
        ))}
        {/* Generating placeholders for streaming effect */}
        {entry.isGenerating &&
          Array.from({ length: entry.params.numImages - entry.images.length }).map((_, i) => (
            <div
              key={`loading-${i}`}
              className={cn("relative rounded-xl overflow-hidden flex items-center justify-center", isLight ? "bg-zinc-200/70" : "bg-zinc-900/80")}
              style={{ width: `${safeWidth}px`, aspectRatio: String(safeAspectRatio) }}
            >
              <div className="absolute inset-0 shimmer" />
              <span className="h-5 w-5 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
            </div>
          ))}
      </div>

      {activePreview && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="relative w-[min(92vw,1080px)] h-[min(84vh,760px)] rounded-2xl border border-zinc-700/70 bg-zinc-950/95 shadow-2xl shadow-black/60 p-3 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 left-3 z-20 rounded-md bg-black/60 px-2 py-1 text-xs text-zinc-300">
              {previewIndex !== null ? `${previewIndex + 1} / ${entry.images.length}` : ""}
            </div>

            <div className="relative h-full w-full rounded-xl overflow-hidden border border-zinc-800/70">
              <img
                src={activePreview.url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover blur-xl scale-110 opacity-30"
              />
              <img
                src={activePreview.url}
                alt={`Preview ${previewIndex !== null ? previewIndex + 1 : 1}`}
                className="relative z-10 h-full w-full object-contain"
              />
            </div>

            {entry.images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-xl bg-black/65 border border-zinc-700/70 text-zinc-200 hover:bg-black/80 transition-colors cursor-pointer"
                  title="Previous image"
                >
                  <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-xl bg-black/65 border border-zinc-700/70 text-zinc-200 hover:bg-black/80 transition-colors cursor-pointer"
                  title="Next image"
                >
                  <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <div className="absolute top-3 right-3 flex gap-2 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(activePreview.url, `imagify-${entry.id}-${(previewIndex ?? 0) + 1}.jpg`);
                }}
                className="h-8 w-8 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                title="Download image"
              >
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(null);
                }}
                className="h-8 w-8 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                title="Close"
              >
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
