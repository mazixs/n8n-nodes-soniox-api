# Transcribe Operation Implementation Plan

## Status
✅ Phase 1: Descriptions updated  
⏳ Phase 2: Implementation in progress  
⏸️ Phase 3: Testing (pending)

## Changes Made

### TranscriptionDescription.ts
✅ Added "Transcribe" operation as default
✅ Renamed "Get All" → "List"  
✅ Marked as deprecated:
  - Create [Deprecated]
  - Create and Wait [Deprecated]
  - Get By File [Deprecated]

✅ Fields for "Transcribe":
  - Binary Property (required) - name of binary property with audio
  - Model (required) - loaded from API
  - Additional Fields:
    - Language
    - Context
    - Translation Languages
    - Enable Speaker Diarization
    - Include Non-Final
  - Options:
    - Max Wait Time (300s default)
    - Check Interval (5s default)

## Next Steps

### 1. Implement Transcribe Logic in Soniox.node.ts

```typescript
if (operation === 'transcribe') {
  const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
  const model = this.getNodeParameter('model', i, '') as string;
  const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
  const options = this.getNodeParameter('options', i, {}) as IDataObject;
  
  // Get binary data
  const binaryData = items[i].binary;
  if (!binaryData || !binaryData[binaryPropertyName]) {
    throw new NodeOperationError(
      this.getNode(),
      `No binary data found in property "${binaryPropertyName}"`,
      { itemIndex: i }
    );
  }
  
  // Step 1: Upload file
  const uploadFileName = binary Data[binaryPropertyName].fileName || `audio_${Date.now()}.${binaryData[binaryPropertyName].fileExtension || 'mp3'}`;
  const formData = {
    file: {
      value: await this.helpers.getBinaryDataBuffer(i, binaryPropertyName),
      options: {
        filename: uploadFileName,
        contentType: binaryData[binaryPropertyName].mimeType,
      },
    },
  };
  
  const uploadResponse = await sonioxApiRequest.call(
    this,
    'POST',
    '/files',
    {},
    {},
    undefined,
    { formData },
  );
  const fileId = uploadResponse.file_id;
  
  // Step 2: Create transcription
  const body: IDataObject = {
    file_id: fileId,
    model: model,
  };
  
  // Add optional fields
  if (additionalFields.language) body.language = additionalFields.language;
  if (additionalFields.context) body.context = additionalFields.context;
  if (additionalFields.translationLanguages) {
    const languages = (additionalFields.translationLanguages as string)
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (languages.length > 0) body.translation_languages = languages;
  }
  if (additionalFields.enableSpeakerDiarization) {
    body.enable_speaker_diarization = additionalFields.enableSpeakerDiarization;
  }
  if (additionalFields.includeNonFinal) {
    body.include_nonfinal = additionalFields.includeNonFinal;
  }
  
  const createResponse = await sonioxApiRequest.call(this, 'POST', '/transcriptions', body);
  const transcriptionId = createResponse.transcription_id || createResponse.id;
  
  if (!transcriptionId) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to create transcription: ${JSON.stringify(createResponse)}`,
      { itemIndex: i }
    );
  }
  
  // Step 3: Poll for completion
  const maxWaitTime = (options.maxWaitTime as number) || 300;
  const checkInterval = (options.checkInterval as number) || 5;
  const startTime = Date.now();
  const maxWaitMs = maxWaitTime * 1000;
  const checkIntervalMs = checkInterval * 1000;
  
  let transcriptionResult: IDataObject | null = null;
  let lastStatus = '';
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    const statusResponse = await sonioxApiRequest.call(this, 'GET', `/transcriptions/${transcriptionId}`);
    lastStatus = (statusResponse.status as string) || '';
    
    // Soniox API statuses: "queued" | "processing" | "completed" | "error"
    if (lastStatus === 'completed') {
      // Step 4: Get transcript
      const transcriptResponse = await sonioxApiRequest.call(
        this,
        'GET',
        `/transcriptions/${transcriptionId}/transcript`
      );
      
      transcriptionResult = {
        ...statusResponse,
        transcript: transcriptResponse,
      };
      break;
    }
    
    if (lastStatus === 'error') {
      const errorMsg = statusResponse.message || statusResponse.error_message || statusResponse.error_type;
      const requestId = statusResponse.request_id ? ` (Request ID: ${statusResponse.request_id})` : '';
      throw new NodeOperationError(
        this.getNode(),
        `Transcription failed: ${errorMsg}${requestId}`,
        { itemIndex: i }
      );
    }
  }
  
  if (!transcriptionResult) {
    throw new NodeOperationError(
      this.getNode(),
      `Timeout after ${maxWaitTime}s. Status: ${lastStatus}. ID: ${transcriptionId}`,
      { itemIndex: i }
    );
  }
  
  returnData.push({ json: transcriptionResult });
}
```

### 2. Update List Operation

Rename `getAll` → `list` in Soniox.node.ts

### 3. Update Version

- package.json: `0.4.4` → `0.5.0`
- CHANGELOG.md: Add v0.5.0 entry

### 4. Testing

- [ ] Test Transcribe with MP3
- [ ] Test Transcribe with OGG
- [ ] Test with speaker diarization
- [ ] Test with translations
- [ ] Test timeout handling
- [ ] Test error handling
- [ ] Verify backward compatibility with deprecated operations

### 5. Documentation

- [ ] Update README.md with new workflow
- [ ] Add migration guide
- [ ] Update examples

## Migration Guide (for users)

### Old Workflow (2 nodes)
```
Binary File
  ↓
Soniox: File Upload
  → output: fileId
  ↓
Soniox: Create and Wait
  → input: {{ $json.fileId }}
  → output: transcript
```

### New Workflow (1 node)
```
Binary File
  ↓
Soniox: Transcribe
  → output: transcript
```

## Breaking Changes

None in v0.5.0 - all old operations still work with deprecation warnings.

v0.6.0 will remove:
- Create
- Create and Wait
- Get By File

Users should migrate to:
- Transcribe (replaces Create and Create and Wait)
- Get (replaces Get By File)

## Implementation Status

- [x] Descriptions updated
- [x] Official API documentation saved
- [ ] Transcribe operation implemented
- [ ] List operation renamed
- [ ] Tests passed
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Published

## Current Session Progress

**Date:** 2025-10-25  
**Version:** 0.4.4 → 0.5.0 (in progress)

**Completed:**
1. ✅ Retrieved official Soniox API docs via MCP Context7
2. ✅ Created SONIOX_API_OFFICIAL.md
3. ✅ Updated TranscriptionDescription.ts
   - Added Transcribe operation
   - Renamed Get All → List
   - Marked old operations as deprecated
4. ✅ Build successful

**Next:**
1. Implement Transcribe in Soniox.node.ts
2. Rename getAll → list in implementation
3. Test
4. Update version and changelog
5. Publish v0.5.0
