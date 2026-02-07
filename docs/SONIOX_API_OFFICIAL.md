# Soniox API Official Documentation

**Sources:** https://soniox.com/docs/stt/ , https://soniox.com/docs/stt/models  
**Retrieved:** 2026-02-07 via MCP Tavily & Exa

---

## Overview

Soniox Speech-to-Text API delivers highly accurate, scalable audio transcription through REST and WebSocket APIs.

**Base URL:** `https://api.soniox.com/v1`

---

## CI/CD Workflow Status (2026-02-07)

| Workflow | Trigger | Key Features |
|----------|---------|-------------|
| `ci.yml` | push/PR + `workflow_call` | Node.js matrix (18/20/22), concurrency control, security audit, package size check |
| `create-release.yml` | manual `workflow_dispatch` | CI gate (`needs: ci`), CHANGELOG validation, shell injection prevention, idempotent commits |
| `publish.yml` | Release `published` / manual | Unified version resolution, dry-run before publish, post-publish verification, `contents: read` only |

> All workflows hardened in v0.7.0: concurrency groups, env-var injection, CI gate before release.

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

**Response (201 Created):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "filename": "audio.mp3",
  "size": 1024000,
  "created_at": "2024-11-26T00:00:00Z"
}
```

> **Note:** The API returns `id`, not `file_id`. Use this value as `file_id` when creating transcriptions.

### Step 2: Create Transcription

**Endpoint:** `POST /v1/transcriptions`

**Headers:**
- `Authorization: Bearer <SONIOX_API_KEY>`
- `Content-Type: application/json`

**Request Body (key fields):**
```json
{
  "model": "stt-async-v4",                // Required (32-char max)
  "file_id": "uuid-from-upload",          // Option 1: Uploaded file (mutually exclusive with audio_url)
  "audio_url": "https://example.com/audio.mp3",  // Option 2: Public URL (https only)

  "language_hints": ["en", "ru"],         // Up to 16 entries; add language_hints_strict for hard filtering
  "translation": {                         // Optional translation block
    "type": "one_way",
    "target_language": "es"
  },
  "context": {                              // Structured JSON object (API v4)
    "general": [{"key": "domain", "value": "Healthcare"}],
    "text": "Background context text...",
    "terms": ["Celebrex", "Zyrtec"],
    "translation_terms": [{"source": "MRI", "target": "RM"}]
  },
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
- **Max duration:** 5 hours / 300 minutes (fixed)
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

### Current Models (February 2026)

| Model | Type | Status |
|-------|------|--------|
| `stt-rt-v4` | Real-time | Active — **not available in n8n node** (WebSocket required) |
| `stt-async-v4` | Async | **Active (recommended for n8n)** |
| `stt-rt-v3` | Real-time | Active — **not available in n8n node** (routes to v4 after 2026-02-28) |
| `stt-async-v3` | Async | Active (routes to `stt-async-v4` after 2026-02-28) |

### Aliases

| Alias | Points To |
|-------|----------|
| `stt-rt-preview` | `stt-rt-v4` |
| `stt-async-preview` | `stt-async-v4` |

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
      "id": "stt-rt-v4",
      "aliased_model_id": null,
      "name": "Speech-to-Text Real-time v4",
      "context_version": 2,
      "transcription_mode": "real_time",
      "languages": [{"code": "en", "name": "English"}, ...],
      "one_way_translation": "all_languages",
      "two_way_translation": "all_languages",
      "supports_language_hints_strict": true,
      "supports_max_endpoint_delay": true
    },
    ...
  ]
}
```

> **Note:** Each model object contains `id` (not `model_id`), `name`, `languages[]` (array of `{code, name}` objects), `transcription_mode` (`"real_time"` or `"async"`), and translation capabilities.

----

## Critical Operating Limits (Async + Real-time)

| Area | Default Limit | Notes |
|------|---------------|-------|
| Uploaded files | 1,000 | Includes all non-deleted uploads |
| File storage | 10 GB total | Delete files after transcription; Soniox never auto-purges |
| Audio duration (async + RT) | **5 hours (300 minutes)** | Per file/stream; extended from 60 min in v3 |
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
- **Handshake payload:** `{ "api_key": "...", "model": "stt-rt-v4", "audio_format": "auto", "language_hints": ["en"], ... }`
- Streams send binary audio frames; send empty frame to finalize. Server replies with incremental tokens containing `text`, `start_ms`, `end_ms`, `speaker`, `language`, `translation_status`.
- Error codes mirror HTTP (400 bad config, 401 auth, 402 billing, 408 timeout, 429 limits, 503 restart required). Close + reopen when receiving `finished: true` or unrecoverable errors.

---

## Best Practices (2026 Refresh)

1. **Polling discipline:** 5 s interval baseline; cap retries based on `audio_duration_ms`. Back off exponentially after 60 attempts.
2. **Timeout heuristic:** `job_timeout = max(5 min, audio_duration_ms * 3)` to absorb queueing.
3. **Webhooks first:** Use webhooks for anything longer than 2 minutes. Keep webhook handlers idempotent.
4. **Storage hygiene:** Immediately `DELETE /v1/files/{file_id}` and `/v1/transcriptions/{id}` after archiving output to stay under 10 GB / 1,000 file cap.
5. **Version pinning:** Default to `stt-async-v4` and `stt-rt-v4` for parity between async and streaming results; v3 models will auto-route to v4 after 2026-02-28.
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
const { id: file_id } = await uploadResponse.json();

// 2. Create transcription
const createResponse = await fetch('https://api.soniox.com/v1/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'stt-async-v4',
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

**Document Version:** 2.0  
**Last Updated:** 2026-02-07  
**Source:** Official Soniox Documentation via Tavily MCP & Exa
