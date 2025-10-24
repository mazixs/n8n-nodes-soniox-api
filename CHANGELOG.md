# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-10-25

### Added
- 🎉 **New "Transcribe" operation** - All-in-one audio transcription like Whisper node!
  - Upload audio → Create transcription → Wait → Get transcript in ONE node
  - Input: Binary audio data (no need for separate File Upload node)
  - Output: Complete transcript with text + tokens + metadata
  - Configurable: timeout, check interval, model, language, speaker diarization, translations
  - Follows Whisper node UX pattern for better user experience

### Changed
- **Simplified workflow:** 1 node instead of 2-3 nodes
- **Renamed "Get All" → "List"** for better clarity
- **Deprecated operations** (will be removed in v0.6.0):
  - "Create" → use "Transcribe" instead
  - "Create and Wait" → use "Transcribe" instead
  - "Get By File" → use "Get" instead
- All deprecated operations still work with backward compatibility

### Documentation
- Added `docs/SONIOX_API_OFFICIAL.md` - complete official API documentation
- Added `docs/TRANSCRIBE_IMPLEMENTATION.md` - implementation details
- Added `REFACTORING_PLAN.md` - refactoring roadmap

### Migration Guide

**Old workflow (2-3 nodes):**
```
Binary File → Soniox: File Upload → Soniox: Create and Wait
```

**New workflow (1 node):**
```
Binary File → Soniox: Transcribe
```

### Breaking Changes
None - all old operations continue to work.

## [0.4.4] - 2025-10-25

### Fixed
- **Status validation:** Use only official Soniox API statuses: `"queued"`, `"processing"`, `"completed"`, `"error"`
- **Removed invalid statuses:** Removed non-existent `"success"`, `"SUCCESS"`, `"failed"`, `"FAILED"` statuses
- **Error handling:** Now uses `message` field from API error responses (primary error field)
- **Request ID:** Include `request_id` in error messages for easier support debugging
- **Documentation:** Added inline comments with official API status values

### Technical Details
According to [Soniox API documentation](https://soniox.com/docs/stt/api-reference/transcriptions/get_transcription):
- Valid statuses: `"queued" | "processing" | "completed" | "error"`
- Error response includes: `message`, `error_type`, `error_message`, `request_id`
- Previous version used incorrect statuses that don't exist in the API

## [0.4.3] - 2025-10-25

### Fixed
- **Transcript retrieval:** Now fetches actual transcription text via `/transcriptions/{id}/transcript` endpoint
- **Result format:** Returns complete result with both metadata and transcript text
- Previously only returned metadata (status, model, etc.) without the actual transcribed text
- Now returns:
  - All metadata fields (status, created_at, model, file_id, etc.)
  - `transcript.text` — the actual transcribed text
  - `transcript.tokens` — detailed token information with timestamps and confidence

## [0.4.2] - 2025-10-25

### Fixed
- **API compatibility:** Support both `transcription_id` and `id` fields from API response
- **Status checking:** Added support for `success` and `SUCCESS` statuses
- **Error handling:** Show actual error message from API (`error_message`, `error_type`)
- **Better error messages:** Display full API response for debugging
- Fixed "Failed to create transcription" when API returns `id` instead of `transcription_id`

## [0.4.1] - 2025-10-25

### Fixed
- Improved error messages in Create and Wait operation (incomplete fix)

## [0.4.0] - 2025-10-25

### Added
- **Create and Wait operation** — ONE-NODE transcription! 🎉
  - Creates transcription AND waits for completion automatically
  - No need for separate Wait and Get nodes
  - Configurable timeout and check interval
  - Smart polling with status checking
  - Returns final transcription result directly
  - Default: 5 minute timeout, 5 second check interval

### Changed
- "Create and Wait" is now the default/first operation in the list
- Regular "Create" operation now clearly marked as "returns immediately"
- Simplified workflow for most use cases

## [0.3.0] - 2025-10-24

### Added
- **Context field** in Transcription Create for improved accuracy
  - Provide domain-specific terms, names, or context
  - Helps improve transcription quality
- **Translation Languages** field for multi-language translation
  - Comma-separated language codes (e.g., "ru,es,fr")
  - Get translations along with transcription
- **Get By File operation** for Transcription resource
  - Get transcription results directly by file_id
  - No need to track transcription_id separately
  - Validates UUID format with helpful error messages

### Changed
- File Upload now returns both `fileId` and `file_id` fields
- File Upload includes full API response in output
- Better compatibility with different naming conventions
- Enhanced language field description with more examples

### Fixed
- Simplified workflow: File Upload → Transcription Get By File
- Easier to use file_id from upload directly in transcription retrieval

## [0.2.2] - 2025-10-24

### Added
- **Input validation** for Transcription Create operation
  - File ID validation (must be valid UUID format)
  - Model field is now required
  - Clear error messages when validation fails

### Changed
- Model field marked as required in UI
- Improved model loading with better API response handling
- Better fallback models when API is unavailable

### Fixed
- Fixed "Invalid model" error by making model field required
- Fixed "Invalid UUID" error with proper file_id validation
- Better error messages help users identify issues faster

## [0.2.1] - 2025-10-24

### Added
- **Dynamic model loading** — Model selection now loads available models from Soniox API
  - Added `loadOptionsMethod` for model dropdown
  - Models are fetched dynamically instead of manual input
  - Fallback to default models if API request fails

### Changed
- Model field in Transcription Create operation changed from text input to dropdown
- Improved user experience with auto-populated model list

### Fixed
- Users no longer need to manually type model names
- Reduced errors from typos in model names

## [0.2.0] - 2025-10-24

### Added
- **Retry logic** with exponential backoff for API requests
  - Automatic retry for codes: 408, 429, 500, 502, 503, 504
  - Retry on network errors (ETIMEDOUT, ECONNRESET)
  - Smart rate limiting handling with `Retry-After` header
  - Configurable via constants (max 3 retries, 1s-10s backoff)
- **Request timeouts**
  - 30s timeout for regular API requests
  - 60s timeout for file uploads
- **Constants system** (`nodes/Soniox/constants.ts`)
  - `API_LIMITS` — request limits (100, 50)
  - `CONTENT_TYPES` — MIME types centralized
  - `RETRY_CONFIG` — retry behavior settings
  - `TIMEOUTS` — request timeout configuration
  - `RETRYABLE_STATUS_CODES` — HTTP codes for retry

### Changed
- **Authentication refactored**
  - Migrated from manual header setup to `requestWithAuthentication`
  - Removed duplicate Authorization header configuration
  - Better integration with n8n credentials system
- **All hardcoded values replaced with constants**
  - Pagination limits now use `API_LIMITS.PAGINATION_LIMIT`
  - MIME types now use `CONTENT_TYPES.*`
  - Improved code maintainability and configurability

### Fixed
- Fixed duplicate Authorization header (was set in 2 places)
- Removed all hardcoded magic numbers and strings
- Improved error handling for API requests

### Documentation
- Added `docs/REFACTORING-RESULTS.md` with complete refactoring report
- Documented remaining tasks (medium and low priority)
- Added migration guide for constants usage

## [0.1.1] - 2025-10-10

### Security
- **Critical:** Fixed form-data vulnerability (GHSA-fjxv-7rqg-78g4)
- **High:** Fixed braces vulnerability through gulp update
- Fixed 16 security vulnerabilities (7 moderate, 4 high, 5 critical)

### Changed
- **Major updates:**
  - Updated `eslint` from 8.57 to 9.37 (migrated to flat config)
  - Updated `@typescript-eslint/eslint-plugin` from 5.62 to 8.46
  - Updated `@typescript-eslint/parser` from 5.62 to 8.46
  - Updated `@types/node` from 18.x to 22.x
  - Updated `typescript` from 5.1.6 to 5.9.3
- **Other updates:**
  - Updated `gulp` from 4.0.2 to 5.0.1
  - Updated `n8n-workflow` from "latest" to ^1.112.0
  - Updated `n8n-core` from "latest" to ^1.113.0

### Added
- GitHub Actions workflows for CI/CD automation
- Automated release and npm publishing pipeline
- Documentation for CI/CD process
- Security update documentation
- `peerDependencies` for n8n-workflow
- `overrides` for form-data to enforce secure version
- New ESLint 9 flat config format (`eslint.config.mjs`)

### Removed
- Dependabot configuration (removed to reduce notification noise)
- Old `.eslintrc.js` (replaced with `eslint.config.mjs`)

### Fixed
- Replaced "latest" versions with pinned versions for better stability
- All gulp 5.x compatibility issues resolved
- ESLint 9 migration completed successfully

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
