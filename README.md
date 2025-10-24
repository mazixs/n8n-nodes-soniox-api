# n8n-nodes-soniox-api

[![npm version](https://img.shields.io/npm/v/n8n-nodes-soniox-api.svg)](https://www.npmjs.com/package/n8n-nodes-soniox-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-blue)](https://docs.n8n.io/integrations/community-nodes/)

This is an n8n community node that integrates [Soniox Speech-to-Text API](https://soniox.com/) — a high-accuracy speech recognition system.

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

This node supports the following operations:

### File Operations
- **Upload** — Upload audio files (multipart/form-data support)
- **Get** — Retrieve file by ID
- **Get All** — List all files (with pagination)
- **Delete** — Delete a file

### Transcription Operations
- **Create** — Create transcription with configurable parameters:
  - Model selection
  - Language hints
  - Speaker diarization
  - Non-final results
- **Get** — Retrieve transcription result by ID
- **Get All** — List all transcriptions (with pagination)

### Model Operations
- **Get All** — List available speech recognition models

## Credentials

### Setting up Credentials

1. In n8n, navigate to **Credentials → Add Credential → Soniox API**
2. Enter your credentials:
   - **API Key**: Get your API key from [console.soniox.com](https://console.soniox.com/)
   - **API URL**: `https://api.soniox.com/v1` (default)
3. Click **Save**

## Usage

### Basic Workflow Example

Here's a simple workflow to upload an audio file and transcribe it:

```
[Read Binary File] 
    ↓
[Soniox: File Upload]
    ↓
[Soniox: Transcription Create]
    ↓
[Soniox: Transcription Get]
```

### Node Configuration

**1. Read Binary File**
- Property Name: `data`
- File Path: `/path/to/audio.mp3`

**2. Soniox: File Upload**
- Resource: `File`
- Operation: `Upload`
- Binary Property: `data`

**3. Soniox: Transcription Create**
- Resource: `Transcription`
- Operation: `Create`
- File ID: `{{ $json.fileId }}`
- Model: `en_v2_lowlatency`

**4. Soniox: Transcription Get**
- Resource: `Transcription`
- Operation: `Get`
- Transcription ID: `{{ $json.transcriptionId }}`

## Features

- ✅ **Retry Logic** — Automatic retry with exponential backoff for failed requests
- ✅ **Rate Limiting** — Smart handling of 429 responses with Retry-After headers
- ✅ **Timeout Control** — Configurable timeouts for API and file upload operations
- ✅ **Type Safety** — Full TypeScript implementation with n8n-workflow types
- ✅ **Error Handling** — Comprehensive error messages for debugging

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
