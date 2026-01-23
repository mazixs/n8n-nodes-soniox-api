# Soniox API Official Documentation

**Sources:** https://soniox.com/docs/stt/ , https://soniox.com/blog/2025-10-21-soniox-v3/  
**Retrieved:** 2026-01-23 via MCP Context7 & Exa

---

## Overview

Soniox Speech-to-Text API delivers highly accurate, scalable audio transcription through REST and WebSocket APIs.

**Base URL:** `https://api.soniox.com/v1`

---

## CI/CD Workflow Readiness Snapshot (2026-01-23)

| Workflow | Trigger | Coverage Highlights | Gaps / Actions |
|----------|---------|---------------------|----------------|
| `.github/workflows/ci.yml` | `push`, `pull_request` on `main` & `develop` | Node.js 22 matrix, caches npm, runs `npm ci`, `npm run lint`, `npm run build`, asserts `dist` presence | No automated tests; uses `actions/checkout@v6` / `setup-node@v6` (verify availability or pin to stable major); consider artifact upload for built dist |
| `.github/workflows/create-release.yml` | manual `workflow_dispatch` | Validates version format, ensures tag uniqueness, bumps package version, extracts changelog, pushes tag + GitHub release | `awk` changelog extraction fails if release at EOF with no next header; force pushes can race with manual releases; does not regenerate dist before tagging |
| `.github/workflows/publish.yml` | GitHub Release `published` or manual `workflow_dispatch` | Rebuilds package, syncs version from tag/input, runs lint/build before `npm publish`, supports manual publish for hotfix | Lacks provenance/signature, does not run tests, release branch creation duplicates if rerun; ensure `NODE_AUTH_TOKEN` scoped to publish only |

> Outcome: workflows are structurally ready but require (1) confirmation of action versions, (2) automated tests/artifact handling, (3) hardened changelog + publish safeguards before GA.

---

## Async Transcription Workflow

### Step 1: Upload File (Optional)

If using local files, upload via Files API:

```http
POST /v1/files
Content-Type: multipart/form-data
Authorization: Bearer <API_KEY>

file: <binary_data>
```

**Response:**
```json
{
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "audio.mp3",
  "size": 1024000,
  "created_at": "2024-11-26T00:00:00Z"
}
```

### Step 2: Create Transcription

**Endpoint:** `POST /v1/transcriptions`

**Headers:**
- `Authorization: Bearer <SONIOX_API_KEY>`
- `Content-Type: application/json`

**Request Body (key fields):**
```json
{
  "model": "stt-async-v3",                // Required (32-char max)
  "file_id": "uuid-from-upload",          // Option 1: Uploaded file (mutually exclusive with audio_url)
  "audio_url": "https://example.com/audio.mp3",  // Option 2: Public URL (https only)

  "language_hints": ["en", "ru"],         // Up to 16 entries; add language_hints_strict for hard filtering
  "translation": {                         // Optional translation block
    "type": "one_way",
    "target_language": "es"
  },
  "context": "Medical terminology...",    // Nested object accepted; 10k chars soft cap
  "enable_speaker_diarization": true,
  "enable_language_identification": true,
  "webhook_url": "https://...",
  "webhook_auth_header_name": "Authorization",
  "webhook_auth_header_value": "Bearer <secret>",
  "client_reference_id": "my-id-123"
}
```

**Response (201 Created):**
```json
{
  "id": "73d4357d-cad2-4338-a60d-ec6f2044f721",
  "status": "queued",                     // "queued" | "processing" | "completed" | "error"
  "created_at": "2024-11-26T00:00:00Z",
  "model": "stt-async-preview",
  "file_id": "123e4567...",
  "filename": "audio.mp3",
  "language_hints": ["en", "ru"],
  "enable_speaker_diarization": true,
  "enable_language_identification": false,
  "audio_duration_ms": null,              // Populated after processing starts
  "error_type": null,
  "error_message": null,
  "webhook_url": "https://...",
  "client_reference_id": "my-id-123"
}
```

### Step 3: Check Status (Polling)

**Endpoint:** `GET /v1/transcriptions/{transcription_id}`

**Response:**
```json
{
  "id": "73d4357d...",
  "status": "processing",                 // Current status
  "created_at": "2024-11-26T00:00:00Z",
  "model": "stt-async-preview",
  "audio_duration_ms": 16079,             // Now available
  ...
}
```

**Valid Statuses:**
- `"queued"` — Waiting to start
- `"processing"` — Currently transcribing
- `"completed"` — Finished successfully
- `"error"` — Failed (see error_type and error_message)

### Step 4: Get Transcript

**Endpoint:** `GET /v1/transcriptions/{transcription_id}/transcript`

**Only available when status = "completed"**

**Response (200 OK):**
```json
{
  "id": "73d4357d...",
  "text": "Complete transcribed text here",
  "tokens": [
    {
      "text": "Hello",
      "start_ms": 10,
      "end_ms": 90,
      "confidence": 0.95,
      "speaker": "1",                     // If diarization enabled
      "language": "en",                   // If language ID enabled
      "is_audio_event": false,
      "translation_status": null
    },
    ...
  ]
}
```

---

## Error Handling

### Error Response Format

```json
{
  "status_code": 400,
  "error_type": "invalid_request",
  "message": "Invalid request.",
  "validation_errors": [
    {
      "error_type": "value_error",
      "location": "body.payload.model",
      "message": "Invalid model"
    }
  ],
  "request_id": "3d37a3bd-5078-47ee-a369-b204e3bbedda"
}
```

### Common Error Types

| Status | Error Type | Description |
|--------|------------|-------------|
| 400 | `invalid_request` | Validation error |
| 400 | `transcription_not_found` | ID doesn't exist |
| 400 | `transcription_invalid_state` | Wrong status (e.g., getting transcript before completed) |
| 401 | `unauthenticated` | Invalid/missing API key |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_error` | Server error |

---

## Limits and Quotas

**From:** https://soniox.com/docs/stt/async/error-handling

### File Upload
- **Max duration:** 300 minutes (fixed)
- **Storage quota:** Account-specific
- **File count quota:** Account-specific

### Transcriptions
- **Max pending:** 100 concurrent transcriptions
- **Max total:** 2000 (pending + completed + failed)

**Recovery:**
- Delete old files/transcriptions to free quota
- Request higher limits in [Soniox Console](https://console.soniox.com/)

---

## Supported Audio Formats

**Automatic format detection** — no configuration needed!

**Supported:**
- aac, aiff, amr, asf, flac, mp3, ogg, wav, webm, m4a, mp4

**Sample rates:** 2000 Hz to 96000 Hz  
**Channels:** 1 to 8

---

## Available Models

Get list of models:

```http
GET /v1/models
Authorization: Bearer <API_KEY>
```

**Response:**
```json
{
  "models": [
    {
      "id": "stt-async-preview",
      "name": "Async Preview Model",
      "languages": ["en", "ru", "es", ...]
    },
    ...
  ]
}
```

----

## Critical Operating Limits (Async + Real-time)

| Area | Default Limit | Notes |
|------|---------------|-------|
| Uploaded files | 1,000 | Includes all non-deleted uploads |
| File storage | 10 GB total | Delete files after transcription; Soniox never auto-purges |
| Audio duration (async + RT) | 300 minutes | Hard ceiling per file/stream |
| Pending async jobs | 100 | Additional requests fail with `429` |
| Total async jobs | 2,000 (pending + completed + failed) | Clean up old jobs via `DELETE /v1/transcriptions/{id}` |
| Real-time requests per minute | 100 | Across WebSocket start requests |
| Concurrent WebSocket sessions | 10 | Includes idle connections; close aggressively |

Limit increases (except duration) require Soniox Console tickets.

---

## Webhook Delivery & Reliability

- Soniox POSTs `{ id, status }` to `webhook_url` when a job completes or errors.
- Set optional `webhook_auth_header_name/value` for HMAC-style gatekeeping.
- Retries happen automatically for transient failures; log transcription IDs locally for manual recovery via REST if webhook retries exhaust.
- Append query parameters to the `webhook_url` to embed metadata (e.g., `?tenant=acme&job=123`).

---

## Translation & Context Enhancements

| Feature | Parameter | Impact |
|---------|-----------|--------|
| One-way translation | `translation.type = "one_way"`, `target_language` | Adds translated transcript per token |
| Two-way translation | `translation.type = "two_way"`, `language_a`, `language_b` | Enables bilingual meetings |
| Domain context | `context` object | Accepts structured key/value for acronyms, product catalogues |
| Vocabulary hints | `context.terms` (array) | Boosts custom words without global language lock |
| Client refs | `client_reference_id` | Persist cross-system IDs; returned in webhook + status |

---

## Real-time (WebSocket) Cheat Sheet

- **Endpoint:** `wss://stt-rt.soniox.com/transcribe-websocket`
- **Handshake payload:** `{ "api_key": "...", "model": "stt-rt-v3", "audio_format": "auto", "language_hints": ["en"], ... }`
- Streams send binary audio frames; send empty frame to finalize. Server replies with incremental tokens containing `text`, `start_ms`, `end_ms`, `speaker`, `language`, `translation_status`.
- Error codes mirror HTTP (400 bad config, 401 auth, 402 billing, 408 timeout, 429 limits, 503 restart required). Close + reopen when receiving `finished: true` or unrecoverable errors.

---

## Best Practices (2026 Refresh)

1. **Polling discipline:** 5 s interval baseline; cap retries based on `audio_duration_ms`. Back off exponentially after 60 attempts.
2. **Timeout heuristic:** `job_timeout = max(5 min, audio_duration_ms * 3)` to absorb queueing.
3. **Webhooks first:** Use webhooks for anything longer than 2 minutes. Keep webhook handlers idempotent.
4. **Storage hygiene:** Immediately `DELETE /v1/files/{file_id}` and `/v1/transcriptions/{id}` after archiving output to stay under 10 GB / 1,000 file cap.
5. **Version pinning:** Default to `stt-async-v3` and `stt-rt-v3` for parity between async and streaming results; fall back to preview models only for experimentation.
6. **Rate-limit safety:** Implement 100 RPM cap client-side; queue or jitter requests to avoid 429 bursts.

---

## Complete Workflow Example

```javascript
// 1. Upload file
const uploadResponse = await fetch('https://api.soniox.com/v1/files', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: formData
});
const { file_id } = await uploadResponse.json();

// 2. Create transcription
const createResponse = await fetch('https://api.soniox.com/v1/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'stt-async-preview',
    file_id: file_id,
    enable_speaker_diarization: true
  })
});
const { id: transcription_id } = await createResponse.json();

// 3. Poll for completion
let status = 'queued';
while (status !== 'completed' && status !== 'error') {
  await sleep(5000);
  const statusResponse = await fetch(
    `https://api.soniox.com/v1/transcriptions/${transcription_id}`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const data = await statusResponse.json();
  status = data.status;
}

// 4. Get transcript
if (status === 'completed') {
  const transcriptResponse = await fetch(
    `https://api.soniox.com/v1/transcriptions/${transcription_id}/transcript`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const { text, tokens } = await transcriptResponse.json();
  console.log('Transcript:', text);
}
```

---

## References

- **Main Documentation:** https://soniox.com/docs/stt/
- **API Reference:** https://soniox.com/docs/stt/api-reference
- **Console:** https://console.soniox.com/
- **Support:** support@soniox.com

---

**Document Version:** 1.1  
**Last Updated:** 2026-01-23  
**Source:** Official Soniox Documentation via Context7 MCP & Exa
