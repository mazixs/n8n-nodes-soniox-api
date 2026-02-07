# Technical Specification (v3.0)
# n8n-nodes-soniox-api

**Version:** 3.0
**Date:** 2026-02-07
**Status:** Production (v0.7.0)

---

## 1. Architecture

### 1.1 Project structure

```
n8n-nodes-soniox-api/
├── credentials/
│   └── SonioxApi.credentials.ts    # Authentication (Bearer token)
├── nodes/
│   └── Soniox/
│       ├── Soniox.node.ts          # Node dispatcher + model loader (async-only filter)
│       ├── GenericFunctions.ts     # HTTP helpers, cursor-based pagination, retry logic
│       ├── constants.ts            # API limits, timeouts, retry config
│       ├── handlers/               # Business logic
│       │   ├── FileHandler.ts      # Upload/list/delete via streams
│       │   ├── TranscriptionHandler.ts # Transcription lifecycle, polling, cleanup
│       │   └── ModelHandler.ts     # Model fetching
│       └── descriptions/           # UI field definitions
│           ├── FileDescription.ts
│           ├── TranscriptionDescription.ts
│           └── ModelDescription.ts
├── docs/                           # Documentation
├── .github/workflows/              # CI, release, publish pipelines
├── package.json
└── tsconfig.json                   # ES2022 target, strict mode
```

### 1.2 Tech stack
- **Runtime:** Node.js 18+ (CI matrix: 18, 20, 22)
- **Language:** TypeScript 5.x (strict mode)
- **Target:** ES2022
- **Core dependencies:** `n8n-workflow@2.7.0`, `n8n-core@2.7.0` (dev/peer)
- **Utilities:** Native Node.js APIs (`stream`, `buffer`) — **zero external runtime deps**

### 1.3 Real-time limitation
This node uses the **Soniox Async REST API** exclusively. Real-time WebSocket transcription (`wss://stt-rt.soniox.com`) is **not supported** because n8n's `execute()` model is request–response and cannot maintain persistent WebSocket sessions. Real-time models (`stt-rt-*`) are filtered out of the model dropdown.

---

## 2. Implemented functionality

### 2.1 File operations (`FileHandler.ts`)
- **Upload:** `multipart/form-data` with streaming (`Readable`) for files up to 1 GB.
- **List:** cursor-based pagination via `sonioxApiRequestAllItems`.
- **Get/Delete:** manage files by UUID.

### 2.2 Transcription operations (`TranscriptionHandler.ts`)
- **Transcribe (all-in-one):**
  - Supports `Binary Data` or `audio_url` sources.
  - Async polling: `queued` → `processing` → `completed`.
  - **Immediate first poll** — no initial sleep delay (saves ~5s on short audio).
  - `maxWaitTime` configurable up to 300 minutes.
  - **Clean text output** by default; tokens opt-in via `Include Tokens`.
- **Cleanup strategies (fire-and-forget):**
  - `deleteAudioFile` — removes source file after result is returned (non-blocking).
  - `deleteTranscription` — deletes transcription after retrieval (non-blocking).
- **Context (JSON, Soniox API v4):**
  - `general` — structured key-value pairs `[{key, value}]`.
  - `text` — free-form background text.
  - `terms` — domain-specific words (comma-separated → array).
  - `translation_terms` — source-target pairs `[{source, target}]`.
- **Translation:** one-way (`target_language`) or two-way (`language_a` + `language_b`).
- **Other:** speaker diarization, language identification, webhook notifications, client reference ID.

### 2.3 Model loading (`Soniox.node.ts`)
- Dynamic loading from `GET /v1/models` with real-time model filtering.
- Fallback: `stt-async-v4`, `stt-async-v3` (async only).

### 2.4 Pagination (`GenericFunctions.ts`)
- Cursor-based pagination using `next_page_cursor` (not offset-based).
- Dynamic response key detection: `files`, `transcriptions`, or custom `itemsKey`.

### 2.5 Reliability & security
- **Retry:** exponential backoff (1s → 2s → 4s, max 10s) for 408/429/500/502/503/504 + ETIMEDOUT/ECONNRESET.
- **Rate limiting:** respects `Retry-After` header from 429 responses.
- **Timeouts:** 30s API requests, 60s file uploads.
- **Security:** locked transitive deps via `overrides` (0 vulnerabilities).

---

## 3. API integration details

### 3.1 Authentication
- **Mechanism:** n8n `requestWithAuthentication` → `Authorization: Bearer <API_KEY>`
- **Base URL:** `https://api.soniox.com/v1`
- **Test endpoint:** `GET /models`

### 3.2 Error handling
Centralized in `GenericFunctions.ts`:
- **Network errors:** automatic retries with backoff.
- **API errors:** propagate `message`, `error_type`, `error_message`, `request_id`.
- **Validation:** pre-flight MIME type check, UUID format validation, required field checks.

---

## 4. Development & build

### 4.1 Scripts
| Command | Purpose |
|---------|---------|
| `npm run build` | TypeScript compilation + Gulp icon copy |
| `npm run lint` | ESLint (flat config, strict) |
| `npm run lintfix` | Auto-fix lint issues |
| `npm audit` | Vulnerability scan |

### 4.2 CI/CD
- **CI:** Node.js matrix (18/20/22), lint, build, audit, package size check.
- **Release:** CI gate → CHANGELOG validation → version bump → tag → GitHub Release.
- **Publish:** dry-run → npm publish → verification.

### 4.3 Guidelines
- Native Node.js APIs over external deps.
- Strict typing (no `any`).
- Logic modularized in `handlers/`.
- Shell injection prevention in CI (env vars, not inline expressions).

---

## 5. Roadmap
- [ ] Unit tests (Jest/Vitest)
- [ ] Integration tests (live API, mocked n8n context)
- [x] ~~Webhook support~~ — implemented (webhook_url, auth headers)
- [ ] Batch transcription (multiple files in one execution)
- [ ] Progress reporting for long transcriptions
