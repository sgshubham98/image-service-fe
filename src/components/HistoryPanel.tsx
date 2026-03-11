import { useState } from "react";
import { HistoryEntry } from "../types";
import { ConfirmModal } from "./ConfirmModal";
import { ImageGrid } from "./ImageGrid";

interface Props {
  history: HistoryEntry[];
  onToggleSelect: (entryId: string, imageId: string) => void;
  onDownloadSelected: (entryId: string) => void;
  onDownloadAll: (entryId: string) => void;
  onReusePrompt: (entry: HistoryEntry) => void;
  onRemoveEntry: (entryId: string) => void;
  onClearHistory: () => void;
  onViewBatch: (batchId: string) => void;
  theme: "dark" | "light";
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

export function HistoryPanel({ history, onToggleSelect, onDownloadSelected, onDownloadAll, onReusePrompt, onRemoveEntry, onClearHistory, onViewBatch, theme }: Props) {
  const isLight = theme === "light";
  const [confirmAction, setConfirmAction] = useState<{ type: "clear" | "remove"; entryId?: string } | null>(null);
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isLight ? "bg-[#f3f1ff]" : "bg-zinc-800/60"}`}>
          <svg className={`h-7 w-7 ${isLight ? "text-[#2D3142]" : "text-zinc-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <div>
          <p className={`text-base font-medium ${isLight ? "text-zinc-700" : "text-zinc-500"}`}>No generations yet</p>
          <p className={`text-sm mt-1 ${isLight ? "text-zinc-600" : "text-zinc-600"}`}>Enter a prompt and hit Generate to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-sm font-medium uppercase tracking-widest ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
          History · {history.length}
        </h2>
        <button
          onClick={() => setConfirmAction({ type: "clear" })}
          className={`text-xs transition-colors cursor-pointer ${isLight ? "text-zinc-600 hover:text-rose-600" : "text-zinc-600 hover:text-red-400"}`}
        >
          Clear all
        </button>
      </div>

      {history.map((entry) => (
        <div
          key={entry.id}
          className={`rounded-2xl border backdrop-blur p-4 space-y-1 ${isLight ? "border-[#cfc7ff] bg-white/95 shadow-sm" : "border-zinc-800/60 bg-zinc-900/60"}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <p className={`text-sm leading-snug line-clamp-2 flex-1 ${isLight ? "text-zinc-900" : "text-zinc-200"}`}>
              {entry.params.prompt}
            </p>
            <button
              onClick={() => onReusePrompt(entry)}
              title="Reuse this prompt"
              className={`shrink-0 text-xs border rounded-lg px-3 py-1.5 transition-all cursor-pointer ${isLight ? "text-zinc-600 hover:text-[#2D3142] border-[#cfc7ff] hover:border-[#2D3142]" : "text-zinc-500 hover:text-violet-400 border-zinc-700/60 hover:border-violet-500/50"}`}
            >
              Reuse
            </button>
            <button
              onClick={() => setConfirmAction({ type: "remove", entryId: entry.id })}
              title="Remove this generation"
              className={`shrink-0 text-xs border rounded-lg px-3 py-1.5 transition-all cursor-pointer ${isLight ? "text-zinc-600 hover:text-rose-600 border-[#cfc7ff] hover:border-rose-400" : "text-zinc-500 hover:text-red-400 border-zinc-700/60 hover:border-red-500/50"}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Batch routed notice */}
          {entry.mode === "batch" && entry.batchId && (
            <div className={`flex items-center gap-3 rounded-xl p-3 mt-1 ${isLight ? "bg-[#f3f1ff] border border-[#cfc7ff]" : "bg-violet-500/10 border border-violet-500/20"}`}>
              <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${isLight ? "bg-[#2D3142]" : "bg-violet-600"}`}>
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isLight ? "text-[#2D3142]" : "text-violet-200"}`}>
                  Routed to Batch
                </p>
                <p className={`text-xs mt-0.5 ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                  {entry.params.numImages} images requested — transferred to <span className="font-medium">{entry.batchName || "batch"}</span>
                </p>
              </div>
              <button
                onClick={() => onViewBatch(entry.batchId!)}
                className={`shrink-0 text-xs font-medium border rounded-lg px-3 py-1.5 transition-all cursor-pointer ${isLight ? "text-white border-[#2D3142]" : "text-white border-violet-500 bg-violet-600 hover:bg-violet-500"}`}
                style={isLight ? { backgroundColor: "#2D3142" } : undefined}
              >
                View Batch
              </button>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs ${isLight ? "text-zinc-600" : "text-zinc-600"}`}>{timeAgo(entry.timestamp)}</span>
            <span className={isLight ? "text-zinc-400" : "text-zinc-700"}>·</span>
            <span className={`text-xs ${isLight ? "text-zinc-600" : "text-zinc-600"}`}>
              {entry.params.width}×{entry.params.height}
            </span>
            {entry.mode && (
              <>
                <span className={isLight ? "text-zinc-400" : "text-zinc-700"}>·</span>
                <span className={`text-xs ${isLight ? "text-zinc-600" : "text-zinc-600"}`}>{entry.mode}</span>
              </>
            )}
            {entry.params.seed !== null && (
              <>
                <span className={isLight ? "text-zinc-400" : "text-zinc-700"}>·</span>
                <span className={`text-xs ${isLight ? "text-zinc-600" : "text-zinc-600"}`}>seed {entry.params.seed}</span>
              </>
            )}
            {entry.isGenerating && (
              <>
                <span className={isLight ? "text-zinc-400" : "text-zinc-700"}>·</span>
                <span className="text-xs text-violet-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Generating
                </span>
              </>
            )}
            {entry.error && (
              <>
                <span className={isLight ? "text-zinc-400" : "text-zinc-700"}>·</span>
                <span className="text-xs text-red-400">{entry.error}</span>
              </>
            )}
          </div>

          {/* Images (skip for batch-routed entries) */}
          {entry.mode !== "batch" && (
            <ImageGrid
              entry={entry}
              onToggleSelect={onToggleSelect}
              onDownloadSelected={onDownloadSelected}
              onDownloadAll={onDownloadAll}
              theme={theme}
            />
          )}
        </div>
      ))}

      <ConfirmModal
        open={confirmAction !== null}
        title={confirmAction?.type === "clear" ? "Clear History" : "Remove Entry"}
        message={
          confirmAction?.type === "clear"
            ? "Clear all generation history? This cannot be undone."
            : "Remove this generation from history?"
        }
        confirmLabel={confirmAction?.type === "clear" ? "Clear all" : "Remove"}
        onConfirm={() => {
          if (confirmAction?.type === "clear") onClearHistory();
          else if (confirmAction?.type === "remove" && confirmAction.entryId) onRemoveEntry(confirmAction.entryId);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
        theme={theme}
        variant="danger"
      />
    </div>
  );
}
