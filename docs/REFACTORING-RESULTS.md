# Refactoring & Audit Results (v0.6.0)

**Date:** 23 January 2026
**Version:** 0.6.0
**Status:** ✅ Deployed to production

---

## 🏗 Architectural changes

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

## ✅ Verification status
- **Build:** `npm run build` – ✅
- **Lint:** `npm run lint` – ✅ (0 errors)
- **Security:** `npm audit` – clean

The refactor enforces a “Zero Technical Debt” posture and readies the node for dependable production usage.
