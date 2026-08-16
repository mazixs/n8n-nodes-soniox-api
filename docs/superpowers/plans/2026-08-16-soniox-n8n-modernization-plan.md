# Soniox n8n node modernization implementation plan

This plan follows the approved design in `docs/superpowers/specs/2026-08-16-soniox-n8n-modernization-design.md`. Each behavior change starts with a failing unit test, then the smallest implementation needed to pass it.

## 1. Establish the modern toolchain and test harness

Files: `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `tests/setup.ts`.

- Add `@n8n/node-cli` and the selected test runner as development dependencies.
- Replace custom build/lint entry points with `n8n-node build`, `n8n-node dev`, and `n8n-node lint` while retaining a safe asset-copy step if the CLI does not include it.
- Add `test`, `test:watch`, and `check` scripts. `check` runs lint, tests, build, and package verification.
- Upgrade n8n development packages to the current compatible `n8n-workflow`; remove unused `n8n-core` if compilation confirms it is unnecessary. Keep `n8n-workflow` as a peer dependency.
- Keep strict TypeScript settings and configure Vitest to run TypeScript tests without live credentials.

Verification: the new test command runs a placeholder test, and the new build/lint commands work before application refactoring begins.

## 2. Add pure, testable Soniox API utilities

Files: `nodes/Soniox/GenericFunctions.ts`, `nodes/Soniox/constants.ts`, new `nodes/Soniox/api/` utilities and corresponding `tests/unit/` files.

- Write failing tests for request option construction, modern/legacy helper selection, retry classification, `Retry-After`, cursor pagination, and structured Soniox errors.
- Extract pure functions for request options, status-code/error extraction, quota-error detection, retry delay, and model normalization.
- Switch the primary request path to `httpRequestWithAuthentication` with `url`; keep a runtime fallback for `requestWithAuthentication` when present.
- Normalize REST and async job errors without losing `error_type`, `error_message`, `request_id`, `validation_errors`, or `more_info`.
- Do not automatically retry a Soniox `limit_exceeded` response. Retry transient 408/5xx/network failures and retry other 429 responses only according to `Retry-After` and bounded backoff.
- Ensure pagination does not mutate caller-owned query objects and preserves filters on every cursor request.

Verification: all utility tests pass and existing request call sites still compile.

## 3. Modernize model discovery and transcription behavior

Files: `nodes/Soniox/Soniox.node.ts`, `nodes/Soniox/handlers/TranscriptionHandler.ts`, `nodes/Soniox/descriptions/ModelDescription.ts`, `nodes/Soniox/descriptions/TranscriptionDescription.ts`, tests.

- Add failing tests for `stt-async-v5` defaults, preservation of older saved async models, realtime-model filtering, `failed` status handling, structured async failures, and legacy aliases.
- Change the fallback/default model to `stt-async-v5`; retain old user-selected values and filter realtime models from async selection.
- Treat `completed`, `failed`, and legacy `error` as terminal states. Fetch the transcript only for `completed`.
- Make cleanup run in bounded `finally` paths after success, failure, and timeout; cleanup errors must never replace the original failure.
- Preserve existing output aliases and speaker segmentation. Keep token output opt-in.
- Reuse shared request-building and polling helpers between `transcribe` and legacy `createAndWait` so fixes cannot diverge.

Verification: unit tests cover success, asynchronous failure, timeout, cleanup failure, and Continue On Fail behavior.

## 4. Add optional local input limits and clear errors

Files: new `nodes/Soniox/limits.ts`, `TranscriptionDescription.ts`, `TranscriptionHandler.ts`, tests, README.

- Write failing tests for absent limits, binary size over the configured limit, supported duration metadata, unavailable duration metadata, and the hard Soniox 300-minute ceiling.
- Add an empty-by-default `limits` collection under transcription options with maximum file size and maximum duration fields.
- Validate binary size before upload using n8n metadata, loading the buffer only when an opted-in size check needs a reliable byte count.
- Validate duration only when standard metadata is present; never pretend to know duration when it is unavailable.
- Keep server-side quota errors authoritative and display actionable guidance rather than embedding one user's personal quotas in code.

Verification: local checks fail before any upload request, while default settings preserve current behavior.

## 5. Align package metadata and community-node manifest

Files: `package.json`, `nodes/Soniox/Soniox.node.json`, `credentials/SonioxApi.credentials.ts`, `.npmignore`, build configuration.

- Add `strict: true`, verify the community package keyword, and ensure only generated `dist` files and the package entrypoint are published.
- Align `node.json` with the official community-node metadata format, correcting the package identifier and retaining `codexVersion: "1.0"` where required.
- Keep node `version: 1`; do not invent a nonexistent “v6” API version.
- Verify credentials with current n8n types and current authentication helper conventions.
- Document the Node.js 22.22.0+ baseline and the conditions that require reinstalling the package after upgrading from `0.7.1`.

Verification: `npm pack --dry-run` contains the expected files and the n8n package scan reports no metadata errors.

## 6. Update documentation and migration guidance

Files: `README.md`, `CHANGELOG.md`, selected `docs/` notes.

- Document supported async models, operation compatibility, source modes, polling/webhooks, cleanup, optional local limits, and structured errors.
- Explain standard Soniox limits versus project-specific quotas and the user's quota table as an example rather than a universal hard-coded contract.
- State clearly that realtime WebSocket is intentionally deferred and would require a separate trigger/stream design.
- Add migration instructions from `0.7.1`, including package reinstall guidance only when stale `dist` or an unsupported Node.js/n8n runtime is involved.
- Include local development and verification commands.

Verification: README commands match `package.json`, and no documentation promises realtime functionality that is not shipped.

## 7. Replace token publishing with npm OIDC

Files: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `.github/workflows/create-release.yml`.

- Update CI to supported Node.js versions, install with the lockfile, and run lint, tests, build, package checks, and an audit report.
- Give the publish job `id-token: write` and `contents: read`; use a current Node/npm toolchain and disable npm package-manager caching as required by Trusted Publishers.
- Remove `NPM_TOKEN`/`NODE_AUTH_TOKEN` from dry-run and publish steps. Publish directly through npm's OIDC flow.
- Keep release version resolution and registry verification, but make failures visible rather than silently accepting a mismatched version.
- Record the required out-of-band npm Trusted Publisher settings for `mazixs/n8n-nodes-soniox-api` and `publish.yml` in the README.

Verification: workflow YAML parses, no token secret is referenced, and `npm publish --dry-run` succeeds locally.

## 8. Full verification and handoff

- Install from the lockfile and run the complete `npm run check` pipeline.
- Run the n8n community package scanner if available.
- Inspect the packed tarball and generated `dist` output.
- Review the diff for accidental changes to existing operation names, credential names, and output fields.
- Report remaining limitations, especially deferred realtime support and the need to configure npm Trusted Publishers outside the repository.
