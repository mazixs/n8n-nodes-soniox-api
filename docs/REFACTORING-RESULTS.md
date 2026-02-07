# Refactoring & Audit Results

---

## v0.6.0 — Architecture Refactor (2026-01-23)

**Status:** ✅ Production

### 1. Modularity (Separation of Concerns)
The monolithic `execute` method in `Soniox.node.ts` was split into dedicated handlers:
- **`handlers/FileHandler.ts`** – uploads, lists, and deletes files using streaming.
- **`handlers/TranscriptionHandler.ts`** – drives the transcription lifecycle (create, poll, fetch result, cleanup).
- **`handlers/ModelHandler.ts`** – fetches available models.

### 2. Streaming uploads
**Issue:** files were read fully into memory buffers, triggering OOM for large inputs (>200 MB).
**Fix:** leverage `Readable` streams via `helpers.getBinaryStream(binaryData.id)` to pipe binary data into `form-data` without loading everything into RAM.
**Result:** stable uploads up to the Soniox API limit (1 GB).

### 3. Native support & modernization
- **ES2022** target unlocks modern Node.js features.
- **Strict TypeScript**: enabled strict mode, removed `any`, and typed every parameter.
- **Cleanup**: deprecated files (`TODO.md`, legacy plans) removed.

---

## 🛡 Security & dependencies

### 1. Vulnerability mitigation
Dependency audit revealed critical issues in transitive packages (`qs`, `lodash`, `jws`, `@langchain/core`).
**Fix:** added an `overrides` block in `package.json`:
```json
"overrides": {
  "form-data": "^4.0.4",
  "qs": "^6.14.1",
  "lodash": "^4.17.21",
  "jws": "^3.2.3",
  "@langchain/core": "^0.3.80"
}
```
**Outcome:** `npm audit` now reports zero vulnerabilities.

### 2. Project hygiene
- `.npmignore` updated to exclude lint configs, docs, and GitHub metadata.
- `.gitignore` trimmed from stale patterns.

---

## ⚙️ New features

### 1. Auto-cleanup strategies
New switches remove Soniox-side data automatically:
- **Delete Audio File** – removes the source file right after the transcription job is created (storage hygiene).
- **Delete Transcription** – wipes the transcription object after results are retrieved (privacy).

### 2. Audio URL support
`Transcribe` now accepts both binary attachments and public URLs via `audio_url`.

### 3. Extended limits
- `maxWaitTime` bumped to **300 minutes** (from 60) to match Soniox limits for long recordings.

---

## v0.7.0 — API Audit & Latency Optimization (2026-02-07)

**Status:** ✅ Production

### Critical bug fixes

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | Pagination returned incomplete results | `sonioxApiRequestAllItems` used offset-based pagination | Rewritten to cursor-based (`next_page_cursor`) |
| 2 | File upload silently failed | API returns `id`, code expected `file_id` | `uploadResponse.id || uploadResponse.file_id` |
| 3 | File list returned empty | `responseData.items` used | Changed to `responseData.files` |
| 4 | Transcription list broken with `returnAll` | No `Array.isArray` check for flat vs object response | Added type guard |
| 5 | Wrong API parameters sent | `language` (string), `translationLanguages` (string) | `language_hints[]`, `translation` object |
| 6 | `includeNonFinal` sent to async API | WebSocket-only parameter | Removed from async operations |
| 7 | `context` sent as string | API v4 requires JSON object | 4 structured UI fields → `buildContextObject()` |
| 8 | `getByFile` response parsing | `response.items` | Changed to `response.transcriptions` |

### Latency optimizations

- **Immediate first poll:** removed initial `sleep(5000)` before first status check. Saves ~5s on short audio.
- **Fire-and-forget cleanup:** `DELETE` requests for files/transcriptions no longer block result delivery. Result is returned first, cleanup runs in background.

### New features

- **Structured context (JSON):** 4 fields (general, text, terms, translation_terms) matching Soniox API v4.
- **Include Tokens option:** token-level data is opt-in (default: clean text only).
- **Language Hints Strict, Language Identification, Webhook support, Client Reference ID.**
- **Real-time model filtering:** `stt-rt-*` models excluded from dropdown (WebSocket not supported in n8n).

### Dependencies

- `n8n-core`: 2.4.3 → 2.7.0
- `n8n-workflow`: 2.4.3 → 2.7.0
- `fast-xml-parser` override: `^5.3.4` (fixed 19 high severity vulnerabilities → 0)

### CI/CD improvements

- Node.js matrix: 18, 20, 22
- CI gate before release
- CHANGELOG validation
- Shell injection prevention (env vars)
- Dry-run + verification for npm publish
- Concurrency control on all workflows

---

## Verification (both versions)
- **Build:** `npm run build` — ✅
- **Lint:** `npm run lint` — ✅ (0 errors)
- **Security:** `npm audit` — 0 vulnerabilities
