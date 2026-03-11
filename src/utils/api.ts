import {
  BackendGenerateResponse,
  BatchProgress,
  JobDetail,
  JobListResponse,
} from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      const detail = errorBody?.detail;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join("; ");
      } else if (detail != null) {
        message = JSON.stringify(detail);
      }
    } catch {
      // Keep fallback message when body is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface GeneratePayload {
  prompt: string;
  width: number;
  height: number;
  num_images: number;
  seed?: number | null;
}

export interface GenerateStreamProgress {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  pending: number;
  jobs: JobDetail[];
}

export interface BatchRequestPrompt {
  prompt: string;
  width: number;
  height: number;
  num_images: number;
  seed?: number | null;
}

export function absoluteAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return buildUrl(path);
}

export function createGenerateJob(payload: GeneratePayload) {
  return fetchJson<BackendGenerateResponse>("/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function streamGenerateJobs(
  jobIds: string[],
  handlers: {
    onProgress: (progress: GenerateStreamProgress) => void;
    onDone: (progress: GenerateStreamProgress) => void;
    onError: (error: string) => void;
  }
): () => void {
  const params = new URLSearchParams();
  for (const id of jobIds) {
    params.append("job_id", id);
  }

  const streamUrl = buildUrl(`/generate/stream?${params.toString()}`);
  const source = new EventSource(streamUrl);

  source.addEventListener("progress", (event) => {
    const parsed = JSON.parse((event as MessageEvent).data) as GenerateStreamProgress;
    handlers.onProgress(parsed);
  });

  source.addEventListener("done", (event) => {
    const parsed = JSON.parse((event as MessageEvent).data) as GenerateStreamProgress;
    handlers.onDone(parsed);
    source.close();
  });

  source.addEventListener("error", () => {
    handlers.onError("Realtime stream disconnected.");
    source.close();
  });

  return () => source.close();
}

export function createBatchJob(name: string, prompts: BatchRequestPrompt[]) {
  return fetchJson<BatchProgress>("/batch", {
    method: "POST",
    body: JSON.stringify({ name, prompts }),
  });
}

export async function createBatchFromFile(file: File, name?: string) {
  const formData = new FormData();
  formData.append("file", file);

  const query = name ? `?name=${encodeURIComponent(name)}` : "";
  return fetchJson<BatchProgress>(`/batch/from-file${query}`, {
    method: "POST",
    body: formData,
  });
}

export function getBatchStatus(batchId: string) {
  return fetchJson<BatchProgress>(`/batch/${batchId}`);
}

export function streamBatchProgress(
  batchId: string,
  handlers: {
    onProgress: (progress: BatchProgress) => void;
    onDone: (progress: BatchProgress) => void;
    onError: (error: string) => void;
  }
): () => void {
  const source = new EventSource(buildUrl(`/batch/${batchId}/stream`));

  source.addEventListener("progress", (event) => {
    const parsed = JSON.parse((event as MessageEvent).data) as BatchProgress;
    handlers.onProgress(parsed);
  });

  source.addEventListener("done", (event) => {
    const parsed = JSON.parse((event as MessageEvent).data) as BatchProgress;
    handlers.onDone(parsed);
    source.close();
  });

  source.addEventListener("error", () => {
    handlers.onError(`Batch stream disconnected for ${batchId}.`);
    source.close();
  });

  return () => source.close();
}

export function listJobs(params: {
  status?: string;
  batch_id?: string;
  page?: number;
  page_size?: number;
}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.batch_id) query.set("batch_id", params.batch_id);
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.page_size ?? 100));

  return fetchJson<JobListResponse>(`/jobs?${query.toString()}`);
}

export function getJob(jobId: string) {
  return fetchJson<JobDetail>(`/jobs/${jobId}`);
}

export function cancelBatch(batchId: string) {
  return fetchJson<BatchProgress>(`/batch/${batchId}`, { method: "DELETE" });
}

export async function downloadBatchZip(batchId: string, _batchName?: string) {
  const url = buildUrl(`/batch/${batchId}/download`);

  // Quick HEAD check so we can surface errors (404, etc.) without
  // blocking the UI for the full download.
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) {
    let message = `Download failed (${head.status})`;
    try {
      // HEAD won't have a body, try GET for error detail
      const errRes = await fetch(url);
      const errBody = await errRes.json();
      if (typeof errBody?.detail === "string") message = errBody.detail;
    } catch { /* not JSON */ }
    throw new Error(message);
  }

  // Let the browser handle the streaming download natively —
  // the backend sets Content-Disposition with the filename.
  const a = document.createElement("a");
  a.href = url;
  a.click();
}
