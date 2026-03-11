import { useMemo, useState } from "react";
import { BatchEvent, TrackedBatch } from "../types";
import { cancelBatch, downloadBatchZip } from "../utils/api";
import { ConfirmModal } from "./ConfirmModal";

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

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
  const selectedBatch = useMemo(
    () => batches.find((b) => b.progress.batch_id === selectedBatchId) ?? batches[0] ?? null,
    [batches, selectedBatchId]
  );

  const [downloading, setDownloading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleDownload = async (batchId: string, batchName?: string | null) => {
    setDownloading(batchId);
    try {
      await downloadBatchZip(batchId, batchName ?? undefined);
    } catch {
      // Download failed — silently ignore (user sees no file).
    } finally {
      setDownloading(null);
    }
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

  const shell = theme === "light" ? "text-zinc-900" : "text-zinc-100";
  const card =
    theme === "light"
      ? "rounded-2xl border border-[#cfc7ff] bg-white/95 p-4 shadow-sm"
      : "theme-animate rounded-2xl border border-zinc-800/60 bg-zinc-900/55 p-4";

  return (
    <div className={`space-y-5 ${shell}`}>
      <section className={card}>
        <h2 className="text-base font-semibold mb-3">Queued Jobs</h2>
        {!selectedBatch ? (
          <p className="text-sm opacity-70">No batch selected yet.</p>
        ) : selectedBatch.queueJobs.length === 0 ? (
          <p className="text-sm opacity-70">No jobs are currently queued for this batch.</p>
        ) : (
          <div className={`overflow-auto max-h-72 border rounded-xl ${theme === "light" ? "border-[#cfc7ff]" : "border-zinc-700/40"}`}>
            <table className="w-full text-sm">
              <thead className={theme === "light" ? "bg-[#f3f1ff]" : "bg-zinc-800/70"}>
                <tr>
                  <th className="text-left p-2.5">Job ID</th>
                  <th className="text-left p-2.5">Status</th>
                  <th className="text-left p-2.5">Prompt</th>
                </tr>
              </thead>
              <tbody>
                {selectedBatch.queueJobs.map((job) => (
                  <tr key={job.id} className={theme === "light" ? "border-t border-[#ece8ff]" : "border-t border-zinc-800/50"}>
                    <td className="p-2.5 font-mono">{job.id.slice(0, 8)}</td>
                    <td className="p-2.5">{job.status}</td>
                    <td className="p-2.5">{job.prompt.slice(0, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold mb-3">Batch Status</h2>
        {batches.length === 0 ? (
          <p className="text-sm opacity-70">No batch jobs tracked yet.</p>
        ) : (
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
                {batches.map((batch) => {
                  const p = batch.progress;
                  return (
                    <tr
                      key={p.batch_id}
                      onClick={() => onSelectBatch(p.batch_id)}
                      className={`cursor-pointer ${theme === "light" ? "border-t border-[#ece8ff] hover:bg-[#f3f1ff]" : "border-t border-zinc-800/50 hover:bg-violet-500/10"}`}
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
        <h2 className="text-base font-semibold mb-3">Batch Events</h2>
        {!selectedBatch ? (
          <p className="text-sm opacity-70">Select a batch to inspect events.</p>
        ) : selectedBatch.events.length === 0 ? (
          <p className="text-sm opacity-70">No events recorded yet.</p>
        ) : (
          <ul className="space-y-1 text-sm max-h-60 overflow-auto">
            {selectedBatch.events.slice(0, 120).map((event, index) => (
              <li key={`${event.at}-${index}`} className="font-mono opacity-90">
                {renderEvent(event)}
              </li>
            ))}
          </ul>
        )}
      </section>

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
