# Minimal Image Generation Frontend

React + Vite frontend for the Flux Image Service backend.

## Features

- Realtime generation (`/generate`) with SSE progress updates.
- Batch submission and tracking (`/batch`) with live status stream.
- Batch ZIP download for completed outputs.
- History panel with prompt reuse and selective downloads.
- Batch moderation visibility:
  - Prompt-level unsafe count (`unsafe`).
  - Output-image unsafe count (`output_unsafe`).
- Failed-job diagnostics in Batch Events drawer:
  - backend error reason
  - regeneration attempts used (`regen_attempts_used`)

## Prerequisites

- Node.js 18+
- npm 9+
- Running backend API (default: `http://localhost:8000`)

## Setup

```bash
cd minimal-image-generation-frontend
npm install
```

## Run

```bash
npm run dev
```

Open `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Configuration

Set API endpoint via environment variable:

- `VITE_API_BASE_URL` (default: `http://localhost:8000`)

Example `.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Backend Contract Notes

The frontend expects these backend fields in job/batch responses:

- `JobDetail`
  - `image_moderation_flagged`
  - `image_moderation_reason`
  - `image_moderation_score`
  - `regen_attempts_used`
- `BatchProgress`
  - `unsafe` (prompt moderation failures)
  - `output_unsafe` (output moderation failures)

If backend is older and does not provide these fields, update backend first.

## Key UI Areas

- `src/components/BatchJobsPage.tsx`
  - Batch status tables
  - moderation summary panel
  - failed jobs + retry metadata drawer
- `src/components/HistoryPanel.tsx`
  - Realtime/history cards
- `src/utils/api.ts`
  - API clients and stream handlers
- `src/types.ts`
  - shared response interfaces

## Troubleshooting

- Batch stream disconnects:
  - verify backend is running and reachable at `VITE_API_BASE_URL`
- ZIP download fails:
  - ensure batch has at least one completed image
- Missing moderation counters in UI:
  - verify backend returns `output_unsafe` in batch progress payload
