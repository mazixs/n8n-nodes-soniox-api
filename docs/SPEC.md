# Technical Specification

**Version:** 4.0
**Release line:** 0.8.x
**Updated:** 2026-08-16
**Status:** Implementation baseline

## Architecture

The package is a strict TypeScript n8n community node. `Soniox.node.ts` dispatches resources and operations; `handlers/` contains file, model, and transcription behavior; `GenericFunctions.ts` owns authenticated HTTP calls, retry, errors, and pagination; `api/`, `limits.ts`, `modelUtils.ts`, and `transcriptionUtils.ts` contain testable pure helpers.

The build uses `@n8n/node-cli` and emits generated JavaScript and icons into `dist/`. The package keeps `n8nNodesApiVersion: 1` and `strict: true`. There is no confirmed community-node “v6” API.

## Soniox integration

- Base URL: `https://api.soniox.com/v1`.
- Authentication: n8n credential `sonioxApi` adds a Bearer API key.
- Primary helper: `httpRequestWithAuthentication` with `url`; a dynamic fallback supports older n8n installations where the modern helper is absent.
- Async flow: optional `POST /files`, `POST /transcriptions`, immediate status poll, interval polling, then `GET /transcriptions/{id}/transcript`.
- Current default: `stt-async-v5`. Saved async v3/v4 values and deprecated operation values remain accepted.
- Terminal states: `completed`, `failed`, and legacy `error`.
- Structured errors retain Soniox `error_type`, `error_message`, `request_id`, `validation_errors`, and `more_info`.

## Limits

Soniox documents a fixed 300-minute file-duration limit and standard async defaults of 10 GB storage, 1000 files, 100 pending transcriptions, and 2000 total transcriptions. Project and personal quotas can differ. The node therefore exposes optional local file-size and duration guards but does not encode a user's account quota as a universal value.

## Compatibility

The credential name, resource names, operation values, input names, and output aliases (`text`, `fileId`, `file_id`) are preserved. The supported runtime baseline is Node.js 22.22.0 or newer. Reinstallation is only a migration remedy for stale `dist` output or an unsupported n8n/Node.js runtime.

## Testing

Unit tests run without Soniox credentials and cover request construction, modern helper use, pagination, retries, model filtering, local limits, structured errors, and asynchronous failure states. Manual n8n validation remains required for binary uploads, credentials, Continue On Fail, and multiple input items.

## Deferred realtime

Soniox realtime WebSocket is intentionally not implemented. A future version needs a separate trigger or stream design with cancellation, reconnect handling, partial/final result semantics, and lifecycle cleanup. Realtime models remain hidden from the async selector.
