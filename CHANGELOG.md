# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-08

### Added
- Initial release
- **File Operations**:
  - Upload audio files (multipart/form-data support)
  - Get file by ID
  - List all files (with pagination)
  - Delete file
- **Transcription Operations**:
  - Create transcription with configurable parameters
  - Get transcription by ID
  - List all transcriptions (with pagination)
  - Support for language hints, speaker diarization, non-final results
- **Model Operations**:
  - List available models
- **Credentials**:
  - Soniox API authentication via Bearer token
  - Configurable API URL
- **Documentation**:
  - Installation guide
  - Usage examples
  - API reference

### Technical
- TypeScript implementation
- ESLint configuration
- Gulp-based icon building
- Full type safety with n8n-workflow types

[0.1.0]: https://github.com/mazixs/n8n-nodes-soniox-api/releases/tag/v0.1.0
