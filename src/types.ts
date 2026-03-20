export interface GenerationParams {
  prompt: string;
  seed: number | null;
  width: number;
  height: number;
  numImages: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  selected: boolean;
}

export interface HistoryEntry {
  id: string;
  params: GenerationParams;
  images: GeneratedImage[];
  timestamp: Date;
  isGenerating?: boolean;
  error?: string | null;
  mode?: "realtime" | "batch";
  jobIds?: string[];
  batchId?: string | null;
  batchName?: string | null;
}

export interface BackendGenerateResponse {
  job_ids: string[];
  status: string;
  image_urls: Array<string | null>;
}

export interface JobDetail {
  id: string;
  prompt: string;
  negative_prompt: string | null;
  width: number;
  height: number;
  num_steps: number;
  guidance_scale: number;
  seed: number | null;
  status: string;
  priority: number;
  format: string;
  file_path: string | null;
  image_url: string | null;
  error_message: string | null;
  batch_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface JobListResponse {
  jobs: JobDetail[];
  total: number;
  page: number;
  page_size: number;
}

export interface BatchProgress {
  batch_id: string;
  name: string | null;
  total: number;
  completed: number;
  failed: number;
  unsafe: number;
  cancelled: number;
  pending: number;
  status: string;
  estimated_remaining_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface BatchEvent {
  at: string;
  type: "progress" | "done" | "error";
  message: string;
}

export interface TrackedBatch {
  progress: BatchProgress;
  queueJobs: JobDetail[];
  events: BatchEvent[];
}
