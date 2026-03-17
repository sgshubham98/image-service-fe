import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BatchControlsPanel } from "./components/BatchControlsPanel";
import { BatchJobsPage } from "./components/BatchJobsPage";
import { ConfirmModal } from "./components/ConfirmModal";
import { ContactPage } from "./components/ContactPage";
import { HistoryPanel } from "./components/HistoryPanel";
import { InfoIcon } from "./components/InfoIcon";
import { ParameterPanel } from "./components/ParameterPanel";
import { PromptInput } from "./components/PromptInput";
import { ToastContainer, ToastData } from "./components/Toast";
import { BatchProgress, GenerationParams, HistoryEntry, TrackedBatch } from "./types";
import {
  absoluteAssetUrl,
  cancelJob,
  createBatchJob,
  createGenerateJob,
  getBatchStatus,
  listJobs,
  streamBatchProgress,
  streamGenerateJobs,
} from "./utils/api";

const DIMENSION_STEP = 64;
const MIN_DIMENSION = 256;
const MAX_DIMENSION = 2048;
const THEME_KEY = "imagify-theme";
const HISTORY_KEY = "imagify-history";
const BATCHES_KEY = "imagify-batches";
const LIGHT_BG = "#EAE8FF";
const LIGHT_BTN = "#2D3142";
const MAX_CUSTOM_IMAGES = 10000;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return parsed.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));
  } catch {
    return [];
  }
}

function loadBatches(): TrackedBatch[] {
  try {
    const raw = window.localStorage.getItem(BATCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrackedBatch[];
  } catch {
    return [];
  }
}

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

async function downloadImageFile(url: string, filename: string) {
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

function appendEvent(existing: TrackedBatch[], batchId: string, message: string, type: "progress" | "done" | "error" = "progress") {
  return existing.map((batch) => {
    if (batch.progress.batch_id !== batchId) return batch;
    return {
      ...batch,
      events: [{ at: new Date().toISOString(), type, message }, ...batch.events].slice(0, 120),
    };
  });
}

function sortBatches(batches: TrackedBatch[]) {
  return [...batches].sort((a, b) => +new Date(b.progress.created_at) - +new Date(a.progress.created_at));
}

export function App() {
  const [prompt, setPrompt] = useState("");
  const [seed, setSeed] = useState("");
  const [width, setWidth] = useState(() => getScreenResolution().width);
  const [height, setHeight] = useState(() => getScreenResolution().height);
  const [numImages, setNumImages] = useState(2);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"gallery" | "batch">("gallery");
  const [showContact, setShowContact] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(420);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" ? "light" : "dark";
  });

  const [trackedBatches, setTrackedBatches] = useState<TrackedBatch[]>(() => loadBatches());
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [pendingBatchConfirm, setPendingBatchConfirm] = useState<GenerationParams | null>(null);

  const addToast = useCallback((toast: Omit<ToastData, "id">) => {
    setToasts((prev) => [...prev, { ...toast, id: `toast-${Date.now()}` }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const batchStreamStops = useRef<Map<string, () => void>>(new Map());
  const realtimeStreamStops = useRef<Map<string, () => void>>(new Map());

  const shellClass = theme === "light" ? "h-screen text-zinc-900" : "h-screen bg-zinc-950 text-zinc-100";
  const headerClass = theme === "light" ? "border-[#cfc7ff] bg-white/85" : "border-zinc-800/60 bg-zinc-950/95";
  const dividerClass = theme === "light" ? "border-[#d7d0ff]" : "border-zinc-800/60";
  const asideClass = theme === "light" ? "border-[#cfc7ff] bg-white/70" : "border-zinc-800/60";

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Persist history to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Storage full or unavailable — silently ignore.
    }
  }, [history]);

  // Persist tracked batches to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(BATCHES_KEY, JSON.stringify(trackedBatches));
    } catch {
      // Storage full or unavailable — silently ignore.
    }
  }, [trackedBatches]);

  const attachBatchStream = useCallback((batchId: string) => {
    if (batchStreamStops.current.has(batchId)) return;

    const stop = streamBatchProgress(batchId, {
      onProgress: (progress) => {
        setTrackedBatches((prev) => {
          const base = prev.some((b) => b.progress.batch_id === batchId)
            ? prev.map((batch) =>
                batch.progress.batch_id === batchId ? { ...batch, progress } : batch
              )
            : [{ progress, queueJobs: [], events: [] }, ...prev];
          return appendEvent(base, batchId, `Progress ${progress.completed}/${progress.total}`);
        });
      },
      onDone: (progress) => {
        setTrackedBatches((prev) => {
          const updated = prev.map((batch) =>
            batch.progress.batch_id === batchId ? { ...batch, progress } : batch
          );
          return appendEvent(updated, batchId, `Batch finished: ${progress.status}`, "done");
        });
        batchStreamStops.current.delete(batchId);
      },
      onError: (error) => {
        setTrackedBatches((prev) => appendEvent(prev, batchId, error, "error"));
        batchStreamStops.current.delete(batchId);
      },
    });

    batchStreamStops.current.set(batchId, stop);
  }, []);

  const refreshBatchQueueJobs = useCallback(async (batchId: string) => {
    try {
      const [queueRes, procRes] = await Promise.all([
        listJobs({ batch_id: batchId, status: "pending", page_size: 50 }),
        listJobs({ batch_id: batchId, status: "processing", page_size: 50 }),
      ]);

      setTrackedBatches((prev) =>
        prev.map((batch) =>
          batch.progress.batch_id === batchId
            ? { ...batch, queueJobs: [...procRes.jobs, ...queueRes.jobs] }
            : batch
        )
      );
    } catch {
      // Silent refresh failure. Periodic polling and SSE still update the batch.
    }
  }, []);

  useEffect(() => {
    return () => {
      for (const stop of batchStreamStops.current.values()) {
        stop();
      }
      batchStreamStops.current.clear();
      for (const stop of realtimeStreamStops.current.values()) {
        stop();
      }
      realtimeStreamStops.current.clear();
    };
  }, []);

  // On mount, re-attach SSE streams for any in-progress batches restored from storage
  useEffect(() => {
    const activeBatches = trackedBatches.filter(
      (b) => b.progress.status === "processing" || b.progress.status === "pending"
    );
    for (const batch of activeBatches) {
      attachBatchStream(batch.progress.batch_id);
      void refreshBatchQueueJobs(batch.progress.batch_id);
    }
    // Also refresh status for all restored batches from the server
    for (const batch of trackedBatches) {
      if (batch.progress.batch_id.startsWith("mock-")) continue;
      getBatchStatus(batch.progress.batch_id)
        .then((latest) => {
          setTrackedBatches((prev) =>
            prev.map((b) =>
              b.progress.batch_id === latest.batch_id ? { ...b, progress: latest } : b
            )
          );
        })
        .catch(() => {
          // Batch may no longer exist on the server — leave stale data visible.
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return;
    void refreshBatchQueueJobs(selectedBatchId);
  }, [selectedBatchId, refreshBatchQueueJobs]);

  useEffect(() => {
    const TERMINAL = new Set(["completed", "failed", "cancelled"]);
    const interval = window.setInterval(async () => {
      const active = trackedBatches.filter((b) => !TERMINAL.has(b.progress.status));
      if (active.length === 0) return;

      for (const { progress: { batch_id: batchId } } of active) {
        void refreshBatchQueueJobs(batchId);
      }
    }, 6000);

    return () => window.clearInterval(interval);
  }, [refreshBatchQueueJobs, trackedBatches]);

  const registerBatch = useCallback(
    (progress: BatchProgress, initialMessage: string) => {
      setTrackedBatches((prev) => {
        const exists = prev.find((batch) => batch.progress.batch_id === progress.batch_id);
        const event = { at: new Date().toISOString(), type: "progress" as const, message: initialMessage };
        if (exists) {
          return sortBatches(
            prev.map((batch) =>
              batch.progress.batch_id === progress.batch_id
                ? { ...batch, progress, events: [event, ...batch.events] }
                : batch
            )
          );
        }
        return sortBatches([{ progress, queueJobs: [], events: [event] }, ...prev]);
      });
      setSelectedBatchId(progress.batch_id);
      attachBatchStream(progress.batch_id);
      void refreshBatchQueueJobs(progress.batch_id);
    },
    [attachBatchStream, refreshBatchQueueJobs]
  );

  const submitAutoBatch = useCallback(
    async (params: GenerationParams) => {
      const prompts = Array.from({ length: params.numImages }).map((_, index) => ({
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        num_images: 1,
        seed: params.seed !== null ? params.seed + index : null,
      }));

      const batchName = `Auto batch · ${params.prompt.slice(0, 26)}`;
      const progress = await createBatchJob(batchName, prompts);
      registerBatch(progress, `Auto-routed from generate (${params.numImages} images)`);

      const batchEntry: HistoryEntry = {
        id: `${Date.now()}`,
        params,
        images: [],
        timestamp: new Date(),
        isGenerating: false,
        error: null,
        mode: "batch",
        batchId: progress.batch_id,
        batchName,
      };
      setHistory((prev) => [batchEntry, ...prev]);
      setActiveTab("gallery");

      addToast({
        message: "Request transferred to Batch",
        detail: `${params.numImages} images will be processed as "${batchName}". Track progress in the Batch tab.`,
        variant: "info",
        duration: 6000,
        action: {
          label: "View Batch",
          onClick: () => {
            setSelectedBatchId(progress.batch_id);
            setActiveTab("batch");
          },
        },
      });
    },
    [addToast, registerBatch]
  );

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setGlobalError(null);
    if (width % 8 !== 0 || height % 8 !== 0) {
      const message = "Width and height must be divisible by 8.";
      setGlobalError(message);
      addToast({
        message: "Invalid dimensions",
        detail: message,
        variant: "warning",
      });
      return;
    }

    if (numImages > MAX_CUSTOM_IMAGES) {
      const message = `Image count cannot exceed ${MAX_CUSTOM_IMAGES}.`;
      setGlobalError(message);
      addToast({
        message: "Image count too high",
        detail: message,
        variant: "warning",
      });
      return;
    }

    const parsedSeedRaw = seed.trim() !== "" ? parseInt(seed, 10) : null;
    const parsedSeed = Number.isNaN(parsedSeedRaw) ? null : parsedSeedRaw;
    const params: GenerationParams = {
      prompt: prompt.trim(),
      seed: parsedSeed,
      width,
      height,
      numImages,
    };

    if (numImages > 4) {
      setPendingBatchConfirm(params);
      return;
    }

    const entryId = `${Date.now()}`;
    const newEntry: HistoryEntry = {
      id: entryId,
      params,
      images: [],
      timestamp: new Date(),
      isGenerating: true,
      error: null,
      mode: "realtime",
    };

    setHistory((prev) => [newEntry, ...prev]);
    setIsGenerating(true);
    setActiveTab("gallery");

    try {
      const response = await createGenerateJob({
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        num_images: params.numImages,
        seed: params.seed,
      });

      const order = response.job_ids;
      setHistory((prev) =>
        prev.map((entry) => (entry.id === entryId ? { ...entry, jobIds: order } : entry))
      );
      setPrompt("");

      // Re-enable the generate button now that the job is submitted.
      setIsGenerating(false);

      // Stream progress in the background — no await so user can queue another generation.
      const stop = streamGenerateJobs(order, {
        onProgress: (payload) => {
          const completed = payload.jobs
            .filter((job) => job.status === "completed")
            .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
            .map((job, index) => ({
              id: `${entryId}-${job.id}`,
              url: absoluteAssetUrl(job.image_url) ?? "",
              selected: false,
              _index: index,
            }))
            .filter((item) => item.url);

          setHistory((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    images: completed.map(({ _index, ...rest }) => rest),
                    isGenerating: true,
                  }
                : entry
            )
          );
        },
        onDone: (payload) => {
          const failed = payload.jobs.filter((job) => job.status === "failed").length;
          const cancelled = payload.jobs.filter((job) => job.status === "cancelled").length;
          const issue = failed > 0 || cancelled > 0 ? `${failed} failed, ${cancelled} cancelled` : null;

          setHistory((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    isGenerating: false,
                    error: issue,
                  }
                : entry
            )
          );
          realtimeStreamStops.current.delete(entryId);
          stop();
        },
        onError: (error) => {
          setHistory((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    isGenerating: false,
                    error: error,
                  }
                : entry
            )
          );
          realtimeStreamStops.current.delete(entryId);
          stop();
        },
      });
      realtimeStreamStops.current.set(entryId, stop);
    } catch (error) {
      setHistory((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                isGenerating: false,
                error: error instanceof Error ? error.message : "Generation failed",
              }
            : entry
        )
      );
      setGlobalError(error instanceof Error ? error.message : "Generation failed");
      setIsGenerating(false);
    }
  }, [prompt, seed, width, height, numImages, isGenerating, addToast]);

  const handleToggleSelect = useCallback((entryId: string, imageId: string) => {
    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              images: entry.images.map((img) =>
                img.id === imageId ? { ...img, selected: !img.selected } : img
              ),
            }
          : entry
      )
    );
  }, []);

  const handleDownloadSelected = useCallback(
    async (entryId: string) => {
      const entry = history.find((item) => item.id === entryId);
      if (!entry) return;
      const selected = entry.images.filter((i) => i.selected);
      for (let i = 0; i < selected.length; i++) {
        await downloadImageFile(selected[i].url, `imagify-${entryId}-${i + 1}.jpg`);
      }
    },
    [history]
  );

  const handleDownloadAll = useCallback(
    async (entryId: string) => {
      const entry = history.find((item) => item.id === entryId);
      if (!entry) return;
      for (let i = 0; i < entry.images.length; i++) {
        await downloadImageFile(entry.images[i].url, `imagify-${entryId}-${i + 1}.jpg`);
      }
    },
    [history]
  );

  const handleReusePrompt = useCallback((entry: HistoryEntry) => {
    setPrompt(entry.params.prompt);
    setSeed(entry.params.seed !== null ? String(entry.params.seed) : "");
    setWidth(entry.params.width);
    setHeight(entry.params.height);
    setNumImages(entry.params.numImages);
  }, []);

  const handleClearHistory = useCallback(() => {
    for (const stop of realtimeStreamStops.current.values()) {
      stop();
    }
    realtimeStreamStops.current.clear();
    setHistory([]);
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    const stop = realtimeStreamStops.current.get(entryId);
    if (stop) {
      stop();
      realtimeStreamStops.current.delete(entryId);
    }
    setHistory((prev) => prev.filter((entry) => entry.id !== entryId));
  }, []);

  const handleCancelGeneration = useCallback(async (entryId: string) => {
    const entry = history.find((item) => item.id === entryId);
    if (!entry || !entry.jobIds || entry.jobIds.length === 0) return;

    const stop = realtimeStreamStops.current.get(entryId);
    if (stop) {
      stop();
      realtimeStreamStops.current.delete(entryId);
    }

    await Promise.allSettled(entry.jobIds.map((jobId) => cancelJob(jobId)));

    setHistory((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? { ...item, isGenerating: false, error: "Cancelled by user" }
          : item
      )
    );
  }, [history]);

  const handleConfirmBatchRouting = useCallback(async () => {
    if (!pendingBatchConfirm) return;
    try {
      await submitAutoBatch(pendingBatchConfirm);
      setPrompt("");
      setPendingBatchConfirm(null);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Failed to submit batch request.");
      setPendingBatchConfirm(null);
    }
  }, [pendingBatchConfirm, submitAutoBatch]);

  const handleBatchCancelled = useCallback((batchId: string) => {
    // Stop the SSE stream for this batch
    const stop = batchStreamStops.current.get(batchId);
    if (stop) {
      stop();
      batchStreamStops.current.delete(batchId);
    }
    // Update the local status to cancelled
    setTrackedBatches((prev) => {
      const updated = prev.map((b) =>
        b.progress.batch_id === batchId
          ? { ...b, progress: { ...b.progress, status: "cancelled" } }
          : b
      );
      return appendEvent(updated, batchId, "Batch cancelled by user", "done");
    });
  }, []);

  const handleUseScreenResolution = useCallback(() => {
    const resolution = getScreenResolution();
    setWidth(resolution.width);
    setHeight(resolution.height);
  }, []);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = leftPanelWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const maxWidth = Math.min(containerWidth * 0.35, 600);
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(300, Math.min(maxWidth, startWidthRef.current + deltaX));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [leftPanelWidth]);

  const totalImages = useMemo(() => history.reduce((acc, entry) => acc + entry.images.length, 0), [history]);
  const selectedImages = useMemo(
    () => history.reduce((acc, entry) => acc + entry.images.filter((img) => img.selected).length, 0),
    [history]
  );

  return (
    <div ref={containerRef} className={`${shellClass} theme-transition flex flex-col overflow-hidden`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className={`theme-animate absolute inset-0 ${theme === "light" ? "opacity-100" : "opacity-0"}`}
          style={{
            backgroundColor: LIGHT_BG,
            backgroundImage:
              "radial-gradient(1200px 520px at -10% -5%, rgba(255,255,255,0.75), transparent 60%), radial-gradient(900px 460px at 110% 0%, rgba(206,197,255,0.55), transparent 58%)",
          }}
        />
        <div className={`theme-animate absolute inset-0 bg-zinc-950 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />

        <div className={`theme-animate absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl ${theme === "light" ? "bg-[#d4ceff]/55" : "bg-violet-900/20"}`} />
        <div className={`theme-animate absolute top-1/2 -right-32 h-80 w-80 rounded-full blur-3xl ${theme === "light" ? "bg-white/45" : "bg-indigo-900/15"}`} />
      </div>

      <header className={`theme-animate fixed top-0 left-0 right-0 z-50 h-[73px] flex items-center justify-between px-6 py-4 border-b backdrop-blur ${headerClass}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Imagify</h1>
            <p className="text-xs opacity-60">Craft stunning visuals with AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`theme-animate flex items-center gap-1 rounded-xl p-1 ${theme === "light" ? "premium-surface-light" : "bg-zinc-800/60"}`}>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === "gallery" ? (theme === "light" ? "text-white" : "bg-zinc-700 text-zinc-100") : "opacity-60"}`}
              style={activeTab === "gallery" && theme === "light" ? { backgroundColor: LIGHT_BTN } : undefined}
            >
              Gallery
            </button>
            <button
              onClick={() => setActiveTab("batch")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === "batch" ? (theme === "light" ? "text-white" : "bg-zinc-700 text-zinc-100") : "opacity-60"}`}
              style={activeTab === "batch" && theme === "light" ? { backgroundColor: LIGHT_BTN } : undefined}
            >
              Batch
            </button>
          </div>

          <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${theme === "light" ? "focus-visible:ring-[#2D3142]" : "bg-zinc-700 border-zinc-600 focus-visible:ring-zinc-300"}`}
            title="Toggle theme"
            aria-label="Toggle theme"
            aria-pressed={theme === "light"}
            role="switch"
            style={theme === "light" ? { backgroundColor: LIGHT_BTN, borderColor: LIGHT_BTN } : undefined}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-out ${theme === "light" ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
          <span className="text-xs font-medium opacity-80">{theme === "light" ? "Light" : "Dark"}</span>
          </div>

          <button
            onClick={() => setShowContact(true)}
            title="contact & support"
            className="p-2 rounded-lg transition-all"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
        <aside
          className={`theme-animate hidden sm:flex flex-col gap-6 border-r p-5 pt-20 pb-16 overflow-y-auto scrollbar-thin scrollbar-track-transparent ${asideClass}`}
          style={{ width: `${leftPanelWidth}px` }}
        >
          <div className={`space-y-3 rounded-2xl p-3 ${activeTab === "batch" ? (theme === "light" ? "border border-[#d7d0ff] bg-[#f7f5ff]" : "border border-zinc-800/70 bg-zinc-900/50") : ""}`}>
            <label className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-widest mb-2 opacity-70">
              {activeTab === "batch" ? "Batch Setup" : "Prompt"}
              <InfoIcon
                tooltip={activeTab === "batch" ? "Upload a file or schedule a prompt batch." : "Describe the image you want to generate."}
                theme={theme}
              />
            </label>
            {activeTab === "batch" ? (
              <BatchControlsPanel
                onBatchCreated={(progress) => {
                  registerBatch(progress, "File batch submitted");
                  setActiveTab("batch");
                }}
                theme={theme}
              />
            ) : (
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                theme={theme}
              />
            )}
          </div>

          {activeTab !== "batch" && <div className={`h-px ${dividerClass}`} />}

          {activeTab !== "batch" && (
            <ParameterPanel
              seed={seed}
              width={width}
              height={height}
              numImages={numImages}
              theme={theme}
              onSeedChange={setSeed}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onNumImagesChange={(value) => setNumImages(Math.max(1, Math.min(MAX_CUSTOM_IMAGES, value)))}
              onUseScreenResolution={handleUseScreenResolution}
            />
          )}

          {globalError && <p className="text-sm text-rose-500">{globalError}</p>}

          <div className={`mt-auto pt-4 border-t ${dividerClass}`}>
            <div className="flex items-center gap-1.5 mb-3">
              <h3 className="text-sm font-medium uppercase tracking-widest opacity-70">Stats</h3>
              <InfoIcon tooltip="Track image and batch activity." theme={theme} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={theme === "light" ? "rounded-xl bg-white p-2 border border-[#cfc7ff]" : "rounded-xl bg-zinc-800/40 p-2"}>
                <p className="text-lg font-semibold">{history.length}</p>
                <p className="text-xs opacity-60">Runs</p>
              </div>
              <div className={theme === "light" ? "rounded-xl bg-white p-2 border border-[#cfc7ff]" : "rounded-xl bg-zinc-800/40 p-2"}>
                <p className="text-lg font-semibold">{totalImages}</p>
                <p className="text-xs opacity-60">Images</p>
              </div>
              <div className={theme === "light" ? "rounded-xl bg-white p-2 border border-[#cfc7ff]" : "rounded-xl bg-zinc-800/40 p-2"}>
                <p className="text-lg font-semibold">{selectedImages}</p>
                <p className="text-xs opacity-60">Selected</p>
              </div>
            </div>
          </div>
        </aside>

        <div
          onMouseDown={handleMouseDownResize}
          className={theme === "light" ? "hidden sm:block w-2 bg-zinc-300/70 hover:bg-[#2D3142]/60 cursor-col-resize transition-colors" : "hidden sm:block w-2 bg-zinc-800/40 hover:bg-violet-500/60 cursor-col-resize transition-colors"}
        />

        <main className="flex flex-1 flex-col overflow-y-auto scrollbar-thin scrollbar-track-transparent p-5 pt-20 pb-16">
          {activeTab === "gallery" && (
            <HistoryPanel
              history={history}
              onToggleSelect={handleToggleSelect}
              onDownloadSelected={handleDownloadSelected}
              onDownloadAll={handleDownloadAll}
              onReusePrompt={handleReusePrompt}
              onCancelGeneration={handleCancelGeneration}
              onRemoveEntry={handleRemoveEntry}
              onClearHistory={handleClearHistory}
              onViewBatch={(batchId) => {
                setSelectedBatchId(batchId);
                setActiveTab("batch");
              }}
              theme={theme}
            />
          )}

          {activeTab === "batch" && (
            <>
              <div className="sm:hidden mb-4">
                <BatchControlsPanel
                  onBatchCreated={(progress) => {
                    registerBatch(progress, "File batch submitted");
                    setActiveTab("batch");
                  }}
                  theme={theme}
                />
              </div>
              <BatchJobsPage
                batches={trackedBatches}
                selectedBatchId={selectedBatchId}
                onSelectBatch={setSelectedBatchId}
                onBatchCancelled={handleBatchCancelled}
                theme={theme}
              />
            </>
          )}
        </main>
      </div>

      <footer className={`theme-animate fixed bottom-0 left-0 right-0 z-40 px-6 py-2 border-t backdrop-blur ${headerClass}`}>
        <p className="text-xs text-center opacity-60">Made with care</p>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} theme={theme} />

      <ConfirmModal
        open={pendingBatchConfirm !== null}
        title="Move Request To Batch"
        message={`You requested ${pendingBatchConfirm?.numImages ?? 0} images. This can take longer, so it will run in Batch mode. Continue?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={handleConfirmBatchRouting}
        onCancel={() => setPendingBatchConfirm(null)}
        theme={theme}
      />

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur">
          <div className={theme === "light" ? "w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent" : "w-full max-w-xl bg-zinc-900/95 border border-zinc-800/60 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent"}>
            <div className="p-6">
              <ContactPage onClose={() => setShowContact(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
