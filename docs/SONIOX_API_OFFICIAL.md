# Soniox API reference used by this node

**Sources:** [Async Speech-to-Text](https://soniox.com/docs/stt/async/async-transcription), [limits and quotas](https://soniox.com/docs/stt/async/limits-and-quotas), [errors](https://soniox.com/docs/api-reference/errors), [models](https://soniox.com/docs/stt/models)
**Reviewed:** 2026-08-16

## Base API and async flow

The REST base URL is `https://api.soniox.com/v1`. The node authenticates with `Authorization: Bearer <API_KEY>` and uses this sequence for binary input:

```text
POST /files
POST /transcriptions   { model, file_id, ... }
GET  /transcriptions/{id}
GET  /transcriptions/{id}/transcript
```

Public URLs can be submitted with `audio_url` instead of `file_id`; the two fields are mutually exclusive. The create endpoint accepts the job and the final job result must be obtained through polling or a webhook.

Supported automatic-detection formats include `aac`, `aiff`, `amr`, `asf`, `flac`, `mp3`, `ogg`, `wav`, `webm`, `m4a`, and `mp4`.

## Models

The current documented active models are:

| Model | Mode | Node behavior |
|---|---|---|
| `stt-async-v5` | Async | Default and selectable |
| `stt-rt-v5` | Realtime WebSocket | Intentionally excluded |

Soniox states that async v4 and realtime v4 remain compatible with v5. Older saved async model IDs are not rewritten by the node, so existing workflows can continue using them when the API returns them.

## Status and errors

Async jobs normally progress through `queued`, `processing`, and `completed`. The current error reference documents terminal `failed` jobs with `error_type` and `error_message`; older documentation and webhook examples may use `error`. The node accepts both failure spellings.

REST error responses can include:

```json
{
  "status_code": 429,
  "error_type": "limit_exceeded",
  "message": "A project limit was exceeded",
  "validation_errors": [],
  "request_id": "request-id",
  "more_info": "https://soniox.com/docs/api-reference/errors"
}
```

The node branches on `error_type`, preserves the request ID, and does not repeatedly retry `limit_exceeded`. Transient HTTP/network failures use bounded backoff; `Retry-After` is respected for retryable rate-limit responses.

## Standard limits

Soniox documents these standard async values:

| Resource | Standard value |
|---|---:|
| Maximum file duration | 300 minutes, fixed |
| File storage | 10 GB |
| Uploaded files | 1000 |
| Pending transcriptions | 100 |
| Total transcriptions | 2000 |

The storage, file-count, and transcription quotas can be raised or customized in the Console. Request-rate and concurrency values are project/account-specific; the node does not hard-code the personal values supplied for one account.

## Webhooks and cleanup

`webhook_url`, `webhook_auth_header_name`, `webhook_auth_header_value`, and `client_reference_id` are forwarded when configured. Soniox webhook payloads contain the transcription ID and status; the node still uses polling for synchronous `execute()` results.

Temporary files and optional transcriptions are deleted in best-effort cleanup paths after success, failure, and timeout. A cleanup failure never replaces the original result or error.

## Realtime note

The realtime API uses a persistent WebSocket, binary audio frames, and partial token results. n8n does not provide a general WebSocket helper or a persistent action lifecycle. Realtime support is therefore documented as future work, not exposed as a misleading async operation.
