# Soniox n8n node modernization design

## Goal

Modernize the Soniox community node for current n8n and Soniox APIs without breaking existing workflows. The release keeps the current asynchronous REST workflow and explicitly defers realtime WebSocket support.

## Compatibility contract

- Keep the package name, credential type `sonioxApi`, node name, resource names, and existing operation values, including deprecated aliases such as `create`, `createAndWait`, and `getByFile`.
- Preserve established input names and output aliases where practical, including `text`, `fileId`, and `file_id`.
- Keep current safe defaults unless they contradict the current API. Existing saved models remain selectable; new model discovery prefers `stt-async-v5` and retains older async models returned by the API.
- A migration note will explain the new Node.js/n8n support floor and when reinstalling the package is required to clear stale compiled files. The release must not require reinstalling merely because an operation was renamed.

## Runtime architecture

The node will use a small typed REST adapter around n8n's current `httpRequestWithAuthentication` helper and `url` request option. The adapter will centralize authentication, request construction, retry behavior, pagination, and Soniox error normalization. A narrow compatibility fallback may call the legacy helper when it is present, allowing older installed n8n versions to continue using the node where the type/runtime contract permits it.

The implementation will not add `@soniox/node` as a runtime dependency in this release. n8n already owns credential handling and request execution, and the REST adapter keeps the package smaller and easier to verify.

## Soniox API behavior

- Use `stt-async-v5` as the new default while accepting saved `stt-async-v3` and `stt-async-v4` values.
- Treat `completed`, `failed`, and the legacy `error` status as terminal polling states.
- Convert REST and asynchronous job errors into actionable n8n errors while retaining `error_type`, `error_message`, `request_id`, `validation_errors`, and `more_info` when supplied.
- Respect `Retry-After` for rate limiting and retry only transient failures. Quota failures must not be hidden behind repeated retries.
- Run temporary file/transcription cleanup in bounded best-effort paths, including failure and timeout paths, without replacing the original error.
- Keep polling and webhook configuration compatible. Webhook support remains an optional Soniox feature; the node continues to return results synchronously when polling is selected.

## Optional client-side limits

The node will expose empty-by-default local guards rather than hard-code one user's account quotas. The first guard set covers maximum binary size and, when duration metadata exists on the incoming item, maximum duration. Optional account thresholds for pending/total transcriptions and files will be documented as advisory preflight settings; Soniox remains authoritative for usage and quota decisions.

Documentation will distinguish standard Soniox limits from project-specific limits: the standard async defaults include 300 minutes per file, 10 GB storage, 1000 files, 100 pending transcriptions, and 2000 total transcriptions. The per-file byte limit and personal request rates are not assumed because they vary by account or are not exposed as one universal value.

## n8n packaging and toolchain

Adopt the current `@n8n/node-cli` build, development, and lint commands; keep TypeScript strict mode and generated `dist/` output. The package manifest will include the current community package keyword, `n8nNodesApiVersion: 1`, `strict: true`, and valid node/credential paths. The node metadata will be aligned with the official community-node format; there is no confirmed community “Node API v6”.

The supported runtime baseline will be documented as Node.js 22.22.0 or newer to match current n8n guidance. CI will cover the supported Node.js versions selected during implementation and will run build, lint, unit tests, package checks, and an audit report.

## Testing

Add isolated TypeScript unit tests with no live Soniox credentials. Tests will cover request construction, authentication-helper compatibility, model filtering, pagination, retries, structured errors, terminal statuses, local limit validation, cleanup behavior, speaker-segment output, and legacy operation aliases. A separate opt-in integration command may be added later; it must never run with ordinary CI credentials.

## CI/CD and publishing

Replace npm token publishing with npm Trusted Publishers through GitHub Actions OIDC. The publish workflow will grant `id-token: write`, keep `contents: read`, use a current supported Node.js/npm toolchain, disable automatic npm caching where required by npm guidance, and remove `NODE_AUTH_TOKEN` and `NPM_TOKEN` references. The npm package settings must be configured out of band for repository `mazixs/n8n-nodes-soniox-api` and workflow filename `publish.yml`.

## Explicitly deferred: realtime WebSocket

Realtime is not part of this release. n8n can technically hold a finite WebSocket session inside `execute`, but a production streaming node needs trigger lifecycle handling, cancellation, reconnect policy, partial/final event semantics, and a separate test strategy. README and architecture notes will state this limitation and reserve a future trigger/action design rather than exposing a misleading realtime model option.
