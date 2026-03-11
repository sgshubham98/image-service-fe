import { useState } from "react";
import { BatchProgress } from "../types";
import { createBatchFromFile } from "../utils/api";

interface Props {
  onBatchCreated: (progress: BatchProgress) => void;
  onCreateManualBatch: (input: {
    name: string;
    prompt: string;
    count: number;
    width: number;
    height: number;
    seed: string;
  }) => Promise<void>;
  onCreateMockBatch: () => void;
  width: number;
  height: number;
  seed: string;
  theme: "dark" | "light";
}

export function BatchControlsPanel({
  onBatchCreated,
  onCreateManualBatch,
  onCreateMockBatch,
  width,
  height,
  seed,
  theme,
}: Props) {
  const lightButtonStyle = theme === "light" ? { backgroundColor: "#2D3142" } : undefined;
  const fileInputId = "batch-upload-file";
  const [batchName, setBatchName] = useState("");
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualCount, setManualCount] = useState(8);
  const [manualSeed, setManualSeed] = useState(seed);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input =
    theme === "light"
      ? "border-[#cfc7ff] bg-white text-zinc-900 placeholder-zinc-500"
      : "border-zinc-700/60 bg-zinc-800/50 text-zinc-100 placeholder-zinc-600";

  const card =
    theme === "light"
      ? "premium-surface-light rounded-2xl p-4"
      : "rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-4";

  const submitClass = "theme-animate mt-2 w-full rounded-xl text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50";

  const handleSubmitFile = async () => {
    if (!file || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const progress = await createBatchFromFile(file, batchName.trim() || undefined);
      onBatchCreated(progress);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit file batch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!manualPrompt.trim() || manualCount < 1 || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreateManualBatch({
        name: batchName.trim(),
        prompt: manualPrompt.trim(),
        count: manualCount,
        width,
        height,
        seed: manualSeed,
      });
      setManualPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit manual batch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-sm font-semibold uppercase tracking-widest opacity-70 mb-3">Batch Scheduler</h2>

        <label className="text-sm uppercase tracking-widest opacity-70">Batch Name</label>
        <input
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="e.g. Marketing set"
          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none ${input}`}
        />

        <p className="text-sm opacity-70 mt-3">Upload CSV or JSON</p>
        <input
          id={fileInputId}
          type="file"
          accept=".csv,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <label
          htmlFor={fileInputId}
          className={`mt-1 flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors ${
            theme === "light"
              ? "border-[#cfc7ff] bg-white text-zinc-700 hover:border-[#2D3142]"
              : "border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:border-violet-500/60"
          }`}
        >
          <span className="truncate pr-2">{file ? file.name : "Select file (.csv or .json)"}</span>
          <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${theme === "light" ? "bg-[#EAE8FF] text-zinc-700" : "bg-zinc-700/70 text-zinc-200"}`}>
            Browse
          </span>
        </label>
        <p className="mt-1 text-xs opacity-65">Supports: CSV with `prompt` column, or JSON array of prompt objects.</p>
        <div className="mt-2 flex items-center gap-2">
          <a
            href="/samples/batch-sample.csv"
            download="batch-sample.csv"
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              theme === "light"
                ? "border-[#cfc7ff] bg-white text-zinc-700 hover:border-[#2D3142]"
                : "border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:border-violet-500/60"
            }`}
          >
            Download Sample CSV
          </a>
          <a
            href="/samples/batch-sample.json"
            download="batch-sample.json"
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              theme === "light"
                ? "border-[#cfc7ff] bg-white text-zinc-700 hover:border-[#2D3142]"
                : "border-zinc-700/60 bg-zinc-800/50 text-zinc-300 hover:border-violet-500/60"
            }`}
          >
            Download Sample JSON
          </a>
        </div>
        <button
          onClick={handleSubmitFile}
          disabled={!file || isSubmitting}
          className={`${submitClass} ${theme === "light" ? "" : "bg-violet-600 hover:bg-violet-500"}`}
          style={lightButtonStyle}
        >
          {isSubmitting ? "Submitting..." : "Submit File Batch"}
        </button>

        <div className={`h-px my-4 ${theme === "light" ? "bg-[#dfd9ff]" : "bg-zinc-800/60"}`} />

        <p className="text-sm opacity-70">Create from prompt</p>
        <textarea
          rows={4}
          value={manualPrompt}
          onChange={(e) => setManualPrompt(e.target.value)}
          placeholder="Minimal product render on warm marble"
          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none ${input}`}
        />

        <div className="grid grid-cols-1 gap-2 mt-2">
          <input
            type="number"
            min={1}
            max={50000}
            value={manualCount}
            onChange={(e) => setManualCount(Number(e.target.value) || 1)}
            className={`rounded-xl border px-3 py-2 text-sm outline-none ${input}`}
            placeholder="Count"
          />
          <input
            value={manualSeed}
            onChange={(e) => setManualSeed(e.target.value)}
            placeholder="Seed (optional)"
            className={`rounded-xl border px-3 py-2 text-sm outline-none ${input}`}
          />
        </div>

        <button
          onClick={handleSubmitManual}
          disabled={!manualPrompt.trim() || isSubmitting}
          className={`${submitClass} ${theme === "light" ? "" : "bg-violet-600 hover:bg-violet-500"}`}
          style={lightButtonStyle}
        >
          {isSubmitting ? "Submitting..." : "Submit Prompt Batch"}
        </button>

        <button
          onClick={onCreateMockBatch}
          type="button"
          className="mt-2 w-full rounded-xl border border-dashed border-zinc-400/70 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          Add Temporary Mock Batch Jobs
        </button>

        {error && <p className="text-sm text-rose-500 mt-2">{error}</p>}
      </section>
    </div>
  );
}
