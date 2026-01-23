# Technical Specification (v2.0)
# n8n-nodes-soniox-api

**Version:** 2.0
**Date:** 2026-01-23
**Status:** Production (v0.6.0)

---

## 1. Architecture

### 1.1 Project structure
The project follows a modular architecture with clear separation of concerns:

```
n8n-nodes-soniox-api/
├── credentials/
│   └── SonioxApi.credentials.ts    # Authentication (Bearer token)
├── nodes/
│   └── Soniox/
│       ├── Soniox.node.ts          # Node dispatcher
│       ├── GenericFunctions.ts     # Base HTTP helpers & retry logic
│       ├── handlers/               # Business logic
│       │   ├── FileHandler.ts      # Upload/list/delete via streams
│       │   ├── TranscriptionHandler.ts # Transcription, polling, cleanup
│       │   └── ModelHandler.ts     # Model fetching
│       └── descriptions/           # UI field definitions
│           ├── FileDescription.ts
│           ├── TranscriptionDescription.ts
│           └── ModelDescription.ts
├── docs/                           # Документация
├── package.json
└── tsconfig.json                   # ES2022 target
```

### 1.2 Tech stack
- **Runtime:** Node.js 22+
- **Language:** TypeScript 5.x (strict mode)
- **Target:** ES2022
- **Core dependencies:** `n8n-workflow`, `n8n-core` (peer)
- **Utilities:** Native Node.js APIs (`stream`, `buffer`) – **zero external runtime deps**

---

## 2. Implemented functionality

### 2.1 File operations (`FileHandler.ts`)
- **Upload:**
  - `multipart/form-data` payloads.
  - **Streaming uploads** via `Readable` streams for inputs up to 1 GB (no OOM risk).
  - Automatic MIME detection.
- **List:** pagination & filtering of uploaded files.
- **Get/Delete:** manage files by ID.

### 2.2 Transcription operations (`TranscriptionHandler.ts`)
- **Transcribe (all-in-one):**
  - Supports `Binary Data` or `audio_url` sources.
  - Asynchronous polling of statuses (`queued` → `processing` → `completed`).
  - `maxWaitTime` configurable up to 300 minutes.
- **Cleanup strategies:**
  - `deleteAudioFile` removes the source file immediately after queueing.
  - `deleteTranscription` deletes the transcription once the result is retrieved.
- **Features:** speaker diarization, translations, custom context injection.

### 2.3 Reliability & security
- **Retry logic:** exponential backoff for network failures and 429 rate limits.
- **Security:**
  - Locked dependency versions via `overrides` to avoid vulnerable transitive packages.
  - Sensitive payloads scrubbed from logs.
  - Strict input validation everywhere.

---

## 3. API integration details

### 3.1 Authentication
Uses the standard n8n credential mechanism:
- **Header:** `Authorization: Bearer <API_KEY>`
- **Base URL:** `https://api.soniox.com`

### 3.2 Error handling
Centralized in `GenericFunctions.ts`:
- **Network errors:** automatic retries.
- **API errors:** propagate Soniox response fields (`error_message`, `error_type`).
- **Validation:** pre-flight checks for MIME types, required fields, etc.

---

## 4. Development & build

### 4.1 Scripts
- `npm run build` – TypeScript compilation + Gulp icon copy.
- `npm run lint` – ESLint (flat config).
- `npm audit` – vulnerability scan.

### 4.2 Guidelines
- Prefer native Node capabilities (avoid unnecessary npm deps).
- Enforce strict typing (no `any`).
- Keep logic modularized inside `handlers/`.

---

## 5. Roadmap
- [ ] Unit tests (Jest)
- [ ] Integration tests (live API)
- [ ] Webhook support (pending Soniox features)
