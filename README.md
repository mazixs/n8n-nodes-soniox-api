# n8n-nodes-soniox-api

[![npm version](https://img.shields.io/npm/v/n8n-nodes-soniox-api.svg)](https://www.npmjs.com/package/n8n-nodes-soniox-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-blue)](https://docs.n8n.io/integrations/community-nodes/)

This is an n8n community node that integrates [Soniox Speech-to-Text API](https://soniox.com/) — a high-accuracy, multilingual speech recognition system.

**Features:**
- 🎯 **One-node transcription** (like Whisper node)
- 🌊 **Streaming Uploads** — Efficiently handle large files without memory issues
- 🧹 **Auto-Cleanup** — Options to automatically delete files and transcriptions from Soniox servers
- 🌍 **60+ languages supported**
- 🎭 **Speaker diarization**
- 🔄 **Translation** — One-way and two-way translation support
- ⚡ **Async processing with auto-polling**
- 🧠 **Structured context** — Domain, terms, background text for better accuracy

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation) ·
[Operations](#operations) ·
[Credentials](#credentials) ·
[Usage](#usage) ·
[Resources](#resources)

## Installation

### n8n Community Nodes

1. Go to **Settings → Community Nodes** in your n8n instance
2. Click **Install** and enter: `n8n-nodes-soniox-api`
3. Click **Install**
4. Restart n8n to load the node

### Manual Installation

To get started locally, install the node in your n8n root directory:

```bash
cd ~/.n8n
npm install n8n-nodes-soniox-api
```

For Docker-based n8n installations, add the package to your n8n installation:

```bash
docker exec -it n8n npm install n8n-nodes-soniox-api
```

### Development

For local development and testing:

```bash
git clone https://github.com/mazixs/n8n-nodes-soniox-api.git
cd n8n-nodes-soniox-api
npm install
npm run build
npm link

# Link to your n8n installation
cd ~/.n8n
npm link n8n-nodes-soniox-api
```

## Operations

### Transcription Operations (Recommended)
- **Transcribe** 🆕 — All-in-one audio transcription (like Whisper node)
  - Input: Binary audio data
  - Output: Complete transcript with text + tokens + metadata
  - Automatically handles: upload → create → wait → get transcript
  - Configurable: model, language, speaker diarization, translations, timeout
- **Get** — Retrieve existing transcription result by ID
- **List** — List all transcriptions (with pagination)

### File Operations (Advanced)
- **Upload** — Upload audio files (multipart/form-data support)
- **Get** — Retrieve file by ID
- **Get All** — List all files (with pagination)
- **Delete** — Delete a file

### Model Operations
- **Get All** — List available speech recognition models

### Deprecated Operations
The following operations still work but will be removed in v1.0.0:
- **Create** → use **Transcribe** instead
- **Create and Wait** → use **Transcribe** instead
- **Get By File** → use **Get** instead

## Credentials

### Setting up Credentials

1. In n8n, navigate to **Credentials → Add Credential → Soniox API**
2. Enter your credentials:
   - **API Key**: Get your API key from [console.soniox.com](https://console.soniox.com/)
   - **API URL**: `https://api.soniox.com/v1` (default)
3. Click **Save**

## Usage

### Quick Start (Recommended)

The simplest way to transcribe audio - just **one node**:

```
[Read Binary File] → [Soniox: Transcribe] → Done!
```

**Node Configuration:**

**Soniox: Transcribe**
- Resource: `Transcription`
- Operation: `Transcribe`
- Binary Property: `data`
- Model: `stt-async-v4` (or any model from dropdown)
- Additional Fields:
  - Language Hints: `en,ru` (optional, auto-detected if not specified)
  - Context: General (JSON), Text, Terms, Translation Terms (optional)
  - Translation Type: `one_way` or `two_way` (optional)
  - Enable Speaker Diarization: `true` (optional)
  - Enable Language Identification: `true` (optional)
- Options:
  - Delete Audio File: `true` (default) — Clean up file after transcription
  - Delete Transcription: `false` (default) — Delete transcription from server after retrieval
  - Include Tokens: `false` (default) — Include word-level timestamps and confidence

**Output:**
```json
{
  "text": "Full transcribed text here",
  "status": "completed",
  "model": "stt-async-v4",
  "audio_duration_ms": 16079
}
```

> **Note:** Token-level data (word timestamps, confidence, speaker) is available via the **Include Tokens** option.

### Advanced Workflow (Multiple Nodes)

For more control, use separate nodes:

```
[Read Binary File]
    ↓
[Soniox: File Upload]
    ↓
[Soniox: Create and Wait]
    ↓
[Process Result]
```

**Note:** The advanced workflow requires 2-3 nodes. We recommend using **Transcribe** for simplicity.

## Features

- ✅ **Retry Logic** — Automatic retry with exponential backoff for failed requests
- ✅ **Rate Limiting** — Smart handling of 429 responses with Retry-After headers
- ✅ **Timeout Control** — Configurable timeouts for API and file upload operations
- ✅ **Type Safety** — Full TypeScript implementation with n8n-workflow types
- ✅ **Error Handling** — Comprehensive error messages for debugging
- ✅ **Zero Added Latency** — Immediate first poll, fire-and-forget cleanup

## Real-time (WebSocket) Limitations

This node uses the **Soniox Async REST API** exclusively. Real-time transcription via WebSocket (`wss://stt-rt.soniox.com/transcribe-websocket`) is **not supported**.

**Why:**
- n8n nodes execute via a synchronous `execute()` method that processes input items and returns output items. This request–response model is incompatible with persistent WebSocket connections that stream audio chunks and receive incremental results.
- n8n has no built-in mechanism for maintaining long-lived WebSocket sessions across workflow executions.
- The Soniox real-time API requires continuous binary audio streaming with frame-level control — this cannot be mapped to n8n’s batch-oriented data flow.

**What you can do:**
- Use `stt-async-v4` model for high-quality async transcription (supports up to 5 hours of audio).
- For real-time use cases, integrate the [Soniox WebSocket API](https://soniox.com/docs/stt/api-reference/websocket-api) directly in your application code outside of n8n.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Soniox API Documentation](https://soniox.com/docs/stt/api-reference)
- [Soniox Console](https://console.soniox.com/)

## Development

### Build

```bash
npm install
npm run build
```

### Lint

```bash
npm run lint
npm run lintfix  # Auto-fix issues
```

### Testing

Link the node to your n8n installation:

```bash
npm run build && npm link
cd ~/.n8n && npm link n8n-nodes-soniox-api
n8n start
```

Then test the node in your n8n workflows.

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed release notes.

## License

[MIT](LICENSE.md)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Author

**mazix**
- GitHub: [@mazixs](https://github.com/mazixs)
- npm: [n8n-nodes-soniox-api](https://www.npmjs.com/package/n8n-nodes-soniox-api)

## Support

If you encounter issues or have questions:
1. Check the [documentation](./docs)
2. Search [existing issues](https://github.com/mazixs/n8n-nodes-soniox-api/issues)
3. Create a [new issue](https://github.com/mazixs/n8n-nodes-soniox-api/issues/new) if needed

---

**Made with ❤️ for the n8n community**
