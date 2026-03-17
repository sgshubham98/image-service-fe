import { useEffect, useMemo, useState } from "react";
import { BatchEvent, TrackedBatch } from "../types";
import { cancelBatch, downloadBatchZip } from "../utils/api";
import { ConfirmModal } from "./ConfirmModal";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const PAGE_SIZE = 5;

interface Props {
  batches: TrackedBatch[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  onBatchCancelled: (batchId: string) => void;
  theme: "dark" | "light";
}

function badgeClass(status: string, theme: "dark" | "light") {
  const isLight = theme === "light";
  if (status === "completed") return isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-500/20 text-emerald-300";
  if (status === "failed") return isLight ? "bg-rose-100 text-rose-800" : "bg-rose-500/20 text-rose-300";
  if (status === "cancelled") return isLight ? "bg-amber-100 text-amber-800" : "bg-amber-500/20 text-amber-300";
  if (status === "processing") return isLight ? "bg-[#e1dcff] text-[#2D3142]" : "bg-violet-500/20 text-violet-300";
  return isLight ? "bg-zinc-200 text-zinc-800" : "bg-zinc-700/50 text-zinc-100";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function renderEvent(event: BatchEvent) {
  return `${new Date(event.at).toLocaleTimeString()} · ${event.message}`;
}

export function BatchJobsPage({ batches, selectedBatchId, onSelectBatch, onBatchCancelled, theme }: Props) {
  const activeBatches = useMemo(
    () => batches.filter((batch) => batch.progress.status === "processing" || batch.progress.status === "pending"),
    [batches]
  );
  const terminalBatches = useMemo(
    () => batches.filter((batch) => TERMINAL_STATUSES.has(batch.progress.status)),
    [batches]
  );

  const [downloading, setDownloading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatesBatchId, setUpdatesBatchId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(terminalBatches.length / PAGE_SIZE));
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return terminalBatches.slice(start, start + PAGE_SIZE);
  }, [currentPage, terminalBatches]);
  const updatesBatch = useMemo(
    () => (updatesBatchId ? batches.find((batch) => batch.progress.batch_id === updatesBatchId) ?? null : null),
    [batches, updatesBatchId]
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (updatesBatchId && !batches.some((batch) => batch.progress.batch_id === updatesBatchId)) {
      setUpdatesBatchId(null);
    }
  }, [batches, updatesBatchId]);

  const handleDownload = async (batchId: string, batchName?: string | null) => {
    setDownloading(batchId);
    try {
      await downloadBatchZip(batchId, batchName ?? undefined);
    } catch {
      // HEAD check failed — no completed images or batch not found.
    }
    // Clear immediately — the browser handles the actual download in the background.
    setDownloading(null);
  };

  const handleCancel = async (batchId: string) => {
    setCancelling(batchId);
    setConfirmCancelId(null);
    try {
      await cancelBatch(batchId);
      onBatchCancelled(batchId);
    } catch {
      // Cancel failed — silently ignore.
    } finally {
      setCancelling(null);
    }
  };

  const handleToggleUpdates = (batchId: string) => {
    setUpdatesBatchId((prev) => (prev === batchId ? null : batchId));
  };

  const shell = theme === "light" ? "text-zinc-900" : "text-zinc-100";
  const card =
    theme === "light"
      ? "rounded-2xl border border-[#cfc7ff] bg-white/95 p-4 shadow-sm"
      : "theme-animate rounded-2xl border border-zinc-800/60 bg-zinc-900/55 p-4";

  return (
    <div className={`space-y-5 ${shell}`}>
      <section className={card}>
        <h2 className="text-base font-semibold mb-3">Queued Jobs</h2>
        {activeBatches.length === 0 ? (
          <p className="text-sm opacity-70">No running or pending batch jobs right now.</p>
        ) : (
          <div className={`overflow-auto max-h-72 border rounded-xl ${theme === "light" ? "border-[#cfc7ff]" : "border-zinc-700/40"}`}>
            <table className="w-full text-sm">
              <thead className={theme === "light" ? "bg-[#f3f1ff]" : "bg-zinc-800/70"}>
                <tr>
                  <th className="text-left p-2.5">Batch</th>
                  <th className="text-left p-2.5">Status</th>
                  <th className="text-left p-2.5">Queue</th>
                  <th className="text-left p-2.5">Progress</th>
                  <th className="text-left p-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeBatches.map((batch) => {
                  const processingCount = batch.queueJobs.filter((job) => job.status === "processing").length;
                  const pendingCount = batch.queueJobs.filter((job) => job.status === "pending").length;
                  const canViewUpdates = batch.progress.status === "processing";
                  return (
                    <tr key={batch.progress.batch_id} className={theme === "light" ? "border-t border-[#ece8ff]" : "border-t border-zinc-800/50"}>
                      <td className="p-2.5">
                        <p className="font-medium">{batch.progress.name || batch.progress.batch_id.slice(0, 8)}</p>
                        <p className="opacity-60 font-mono text-xs">{batch.progress.batch_id.slice(0, 12)}</p>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${badgeClass(batch.progress.status, theme)}`}>
                          {batch.progress.status}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span>{processingCount} processing</span>
                          <span className="opacity-70">{pendingCount} pending</span>
                        </div>
                      </td>
                      <td className="p-2.5">{batch.progress.completed}/{batch.progress.total} complete</td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-2">
                          {canViewUpdates ? (
                            <button
                              onClick={() => handleToggleUpdates(batch.progress.batch_id)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                theme === "light"
                                  ? "bg-[#e1dcff] text-[#2D3142] hover:bg-[#d7d0ff]"
                                  : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                              }`}
                            >
                              {updatesBatchId === batch.progress.batch_id ? "Hide Updates" : "View Updates"}
                            </button>
                          ) : null}

                          <button
                            onClick={() => setConfirmCancelId(batch.progress.batch_id)}
                            disabled={cancelling === batch.progress.batch_id}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              theme === "light"
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                            } disabled:opacity-50`}
                          >
                            {cancelling === batch.progress.batch_id ? (
                              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold mb-3">Batch Status</h2>
        {terminalBatches.length === 0 ? (
          <p className="text-sm opacity-70">No completed, failed, or cancelled batches yet.</p>
        ) : (
          <div className="space-y-3">
            <div className={`overflow-auto border rounded-xl ${theme === "light" ? "border-[#cfc7ff]" : "border-zinc-700/40"}`}>
              <table className="w-full text-sm">
              <thead className={theme === "light" ? "bg-[#f3f1ff]" : "bg-zinc-800/70"}>
                <tr>
                  <th className="text-left p-2.5">Batch</th>
                  <th className="text-left p-2.5">Status</th>
                  <th className="text-left p-2.5">Progress</th>
                  <th className="text-left p-2.5">Created</th>
                  <th className="text-left p-2.5">Completed</th>
                  <th className="text-left p-2.5">Download</th>
                  <th className="text-left p-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBatches.map((batch) => {
                  const p = batch.progress;
                  const canViewUpdates = p.status !== "pending";
                  const isSelected = p.batch_id === selectedBatchId;
                  return (
                    <tr
                      key={p.batch_id}
                      onClick={() => onSelectBatch(p.batch_id)}
                      className={`cursor-pointer ${theme === "light" ? "border-t border-[#ece8ff] hover:bg-[#f3f1ff]" : "border-t border-zinc-800/50 hover:bg-violet-500/10"} ${isSelected ? (theme === "light" ? "bg-[#f7f5ff]" : "bg-violet-500/10" ) : ""}`}
                    >
                      <td className="p-2.5">
                        <p className="font-medium">{p.name || p.batch_id.slice(0, 8)}</p>
                        <p className="opacity-60 font-mono text-xs">{p.batch_id.slice(0, 12)}</p>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${badgeClass(p.status, theme)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2.5">{p.completed}/{p.total} complete</td>
                      <td className="p-2.5">{formatDate(p.created_at)}</td>
                      <td className="p-2.5">{formatDate(p.completed_at)}</td>
                      <td className="p-2.5">
                        {p.completed > 0 && !p.batch_id.startsWith("mock-") ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(p.batch_id, p.name);
                            }}
                            disabled={downloading === p.batch_id}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              theme === "light"
                                ? "bg-[#2D3142] text-white hover:bg-[#3d4155]"
                                : "bg-violet-600 text-white hover:bg-violet-500"
                            } disabled:opacity-50`}
                          >
                            {downloading === p.batch_id ? (
                              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                            ZIP
                          </button>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-2">
                          {canViewUpdates ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleUpdates(p.batch_id);
                              }}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                theme === "light"
                                  ? "bg-[#e1dcff] text-[#2D3142] hover:bg-[#d7d0ff]"
                                  : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                              }`}
                            >
                              {updatesBatchId === p.batch_id ? "Hide Updates" : "View Updates"}
                            </button>
                          ) : null}

                          {!TERMINAL_STATUSES.has(p.status) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmCancelId(p.batch_id);
                              }}
                              disabled={cancelling === p.batch_id}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                theme === "light"
                                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                  : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                              } disabled:opacity-50`}
                            >
                              {cancelling === p.batch_id ? (
                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                              ) : (
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="opacity-70">Page {currentPage} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${theme === "light" ? "border-[#cfc7ff] bg-white text-zinc-700 disabled:opacity-50" : "border-zinc-700/60 bg-zinc-800/50 text-zinc-200 disabled:opacity-50"}`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${theme === "light" ? "border-[#cfc7ff] bg-white text-zinc-700 disabled:opacity-50" : "border-zinc-700/60 bg-zinc-800/50 text-zinc-200 disabled:opacity-50"}`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {updatesBatchId && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" onClick={() => setUpdatesBatchId(null)}>
          <div className={`absolute inset-0 ${theme === "light" ? "bg-zinc-900/30" : "bg-black/45"}`} />

          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 top-0 h-full w-full max-w-xl transform transition-transform duration-200 ease-out translate-x-0 ${
              theme === "light" ? "bg-white border-l border-[#cfc7ff]" : "bg-zinc-950 border-l border-zinc-800"
            } shadow-2xl`}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${theme === "light" ? "border-[#e8e2ff]" : "border-zinc-800"}`}>
              <div>
                <h2 className="text-base font-semibold">Batch Events</h2>
                <p className="text-xs opacity-70 font-mono mt-0.5">{updatesBatch?.progress.batch_id.slice(0, 12) ?? ""}</p>
              </div>
              <button
                onClick={() => setUpdatesBatchId(null)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  theme === "light"
                    ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>

            <div className="p-5 h-[calc(100%-73px)] overflow-auto">
              {updatesBatch?.events.length ? (
                <ul className="space-y-1 text-sm">
                  {updatesBatch.events.slice(0, 200).map((event, index) => (
                    <li key={`${event.at}-${index}`} className="font-mono opacity-90">
                      {renderEvent(event)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm opacity-70">No events recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmCancelId !== null}
        title="Cancel Batch"
        message="Cancel this batch job? Pending jobs will be stopped."
        confirmLabel="Cancel batch"
        onConfirm={() => {
          if (confirmCancelId) handleCancel(confirmCancelId);
        }}
        onCancel={() => setConfirmCancelId(null)}
        theme={theme}
        variant="danger"
      />
    </div>
  );
}
