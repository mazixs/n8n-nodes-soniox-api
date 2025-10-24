# Soniox API Official Documentation

**Source:** https://soniox.com/docs/stt/  
**Retrieved:** 2025-10-25 via MCP Context7

---

## Overview

Soniox Speech-to-Text API delivers highly accurate, scalable audio transcription through REST and WebSocket APIs.

**Base URL:** `https://api.soniox.com/v1`

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

**Request Body:**
```json
{
  "model": "stt-async-preview",           // Required
  "file_id": "uuid-from-upload",          // Option 1: Uploaded file
  // OR
  "audio_url": "https://example.com/audio.mp3",  // Option 2: Public URL
  
  // Optional parameters
  "language_hints": ["en", "ru"],         // Language detection hints
  "context": "Medical terminology...",    // Domain context
  "enable_speaker_diarization": true,     // Speaker identification
  "enable_language_identification": true, // Per-token language detection
  "webhook_url": "https://...",           // Completion webhook
  "client_reference_id": "my-id-123"      // Your tracking ID
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
- **Max duration:** 60 minutes (300 minutes coming soon)
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

---

## Best Practices

### 1. Polling Interval
- **Recommended:** 5 seconds
- **Minimum:** 1 second
- Respect rate limits

### 2. Timeout
- **Short files (<1 min):** 30-60 seconds
- **Long files (>10 min):** 5-10 minutes
- File length affects processing time

### 3. Webhooks (Alternative to Polling)
Set `webhook_url` when creating transcription to receive completion notification:

```json
{
  "webhook_url": "https://your-server.com/webhook",
  "webhook_auth_header_name": "Authorization",
  "webhook_auth_header_value": "Bearer your-secret"
}
```

**Webhook Payload:**
```json
{
  "transcription_id": "73d4357d...",
  "status": "completed",
  "event": "transcription.completed"
}
```

### 4. Cleanup
Delete completed transcriptions to free quota:

```http
DELETE /v1/transcriptions/{transcription_id}
Authorization: Bearer <API_KEY>
```

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

**Document Version:** 1.0  
**Last Updated:** 2025-10-25  
**Source:** Official Soniox Documentation via Context7 MCP
