# n8n-nodes-soniox-api

[![npm version](https://img.shields.io/npm/v/n8n-nodes-soniox-api.svg)](https://www.npmjs.com/package/n8n-nodes-soniox-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

An n8n community node for Soniox asynchronous Speech-to-Text REST API.

## Requirements

- n8n with community nodes enabled.
- Node.js 22.22.0 or newer for the current development and n8n toolchain.
- A Soniox API key from the [Soniox Console](https://console.soniox.com/).

The default API URL is `https://api.soniox.com/v1`.

## Installation

In n8n, open **Settings → Community Nodes**, choose **Install**, and enter:

```text
n8n-nodes-soniox-api
```

For a local n8n installation:

```bash
cd ~/.n8n
npm install n8n-nodes-soniox-api
```

Create a **Soniox API** credential with the API key and, if needed, a custom API URL.

## Operations

The recommended operation is **Transcription → Transcribe**. It performs binary upload or public URL submission, creates the transcription, polls until completion, retrieves the transcript, and returns `text` at the top level. It supports language hints, structured context, translation, speaker diarization, language identification, webhooks, token output, and cleanup.

File operations are **Upload**, **Get**, **List**, and **Delete**. Model operations list models available to the credential. Existing workflow values `create`, `createAndWait`, `getByFile`, and `getAll` remain supported as deprecated aliases.

The current default async model is `stt-async-v5`. Existing saved `stt-async-v3` and `stt-async-v4` values remain valid when Soniox still returns them. Realtime models are intentionally excluded from the selector.

## Limits and errors

Soniox's standard async limits include a fixed maximum file duration of 300 minutes, 10 GB storage, 1000 uploaded files, 100 pending transcriptions, and 2000 total transcriptions. Actual project or personal quotas can differ; the node does not hard-code one user's quota table.

Under **Options → Limits**, you can optionally set a local maximum file size and maximum duration. Size is checked before upload. Duration is checked only when the input contains duration metadata. These checks supplement, but do not replace, Soniox validation. API errors retain `error_type`, `error_message`, `request_id`, validation details, and documentation links where available.

## Realtime WebSocket

Realtime Soniox WebSocket support is not shipped in this release. n8n can run finite asynchronous actions, but a production streaming integration needs a separate trigger lifecycle, cancellation, reconnect handling, and partial/final result model. Use the [Soniox WebSocket API](https://soniox.com/docs/stt/api-reference/websocket-api) outside this node for realtime workloads.

## Compatibility and migration

The public credential name, operation values, input names, and output aliases (`text`, `fileId`, and `file_id`) are preserved from `0.7.1`. Reinstalling is not normally required for workflow compatibility. Reinstall the package or remove its old `dist` directory if n8n continues loading stale compiled files, or upgrade the n8n/Node.js runtime when it is below the supported baseline.

## Development

```bash
npm ci
npm test             # Unit tests, no live Soniox credentials
npm run lint         # n8n community-node lint rules
npm run build        # TypeScript and static assets to dist/
npm run check        # Lint, tests, build, and package dry-run
npm run dev          # n8n-node development mode
```

Manual testing can use `npm run build && npm link`, followed by `npm link n8n-nodes-soniox-api` in the n8n installation directory. Do not commit API keys or exported n8n credentials.

## Publishing

Publishing uses npm Trusted Publishers through GitHub Actions OIDC. Configure the npm package trusted publisher with owner `mazixs`, repository `n8n-nodes-soniox-api`, and workflow filename `publish.yml`. The workflow requires `id-token: write` and intentionally does not use `NPM_TOKEN` or `NODE_AUTH_TOKEN`.

See [CHANGELOG.md](CHANGELOG.md), [CONTRIBUTING.md](CONTRIBUTING.md), and the [project documentation](docs/) for additional details.

## License

[MIT](LICENSE.md)
