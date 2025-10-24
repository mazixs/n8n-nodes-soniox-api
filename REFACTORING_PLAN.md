# Refactoring Plan: Simplify to Whisper-like Interface

## Goal
Create a single "Transcribe" operation that handles everything: upload, create, wait, and return result.

## Current State (v0.4.4)

### Operations
- **Create and Wait** - creates transcription + polls + gets transcript (but requires pre-uploaded file)
- **Create** - only creates transcription (returns immediately)
- **Get** - gets transcription by ID
- **Get By File** - gets transcription by file_id (duplicate of Get)
- **Get All** - lists all transcriptions

### Problems
1. User needs 2 nodes minimum: File Upload → Create and Wait
2. Too many similar operations (Create, Create and Wait)
3. Not beginner-friendly (requires understanding of file_id flow)
4. Duplicate operations (Get vs Get By File)

## Proposed State (v0.5.0)

### Operations
1. **Transcribe** (NEW) - All-in-one like Whisper
   - Input: Binary Data (from previous node)
   - Process: Upload file → Create transcription → Wait for completion → Get transcript
   - Output: Full result with text + tokens + metadata
   - Options:
     - Model
     - Language hints
     - Context
     - Translation languages
     - Speaker diarization
     - Max wait time
     - Check interval

2. **Get** - Get existing transcription result
   - Input: Transcription ID
   - Output: Full result with text + tokens + metadata
   - Use case: Retrieve old/webhook results

3. **List** - List all transcriptions
   - Output: Array of transcriptions with metadata
   - Use case: Management, cleanup

### Removed Operations
- ❌ Create - redundant (use Transcribe instead)
- ❌ Create and Wait - redundant (use Transcribe instead)
- ❌ Get By File - duplicate of Get

## Implementation Steps

### Step 1: Add "Transcribe" Operation
```typescript
if (operation === 'transcribe') {
  // 1. Get binary data
  const binaryData = items[i].binary;
  const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
  
  // 2. Upload file
  const uploadResponse = await uploadFile(...);
  const fileId = uploadResponse.file_id;
  
  // 3. Create transcription
  const createResponse = await createTranscription(fileId, ...);
  const transcriptionId = createResponse.id;
  
  // 4. Poll for completion
  while (status !== 'completed') {
    await sleep(checkInterval);
    const statusResponse = await getStatus(transcriptionId);
    status = statusResponse.status;
  }
  
  // 5. Get transcript
  const transcript = await getTranscript(transcriptionId);
  
  // 6. Return combined result
  return {
    ...statusResponse,
    transcript: transcript
  };
}
```

### Step 2: Update Descriptions
- Add TranscriptionDescription with new "Transcribe" operation
- Mark old operations as deprecated (for backward compatibility)

### Step 3: Migration Guide
Create migration guide for users:

**Old workflow:**
```
Binary File → Soniox File Upload → Soniox Create and Wait
```

**New workflow:**
```
Binary File → Soniox Transcribe
```

### Step 4: Deprecation Strategy
- v0.5.0: Add new "Transcribe", keep old operations with deprecation warnings
- v0.6.0: Remove deprecated operations

## Benefits

1. **Simplicity**: 1 node instead of 2-3
2. **Whisper-compatible**: Same UX as Whisper node
3. **Beginner-friendly**: Just drag & drop
4. **Less maintenance**: Fewer operations to support
5. **Clear purpose**: Each operation has distinct use case

## Breaking Changes

- None in v0.5.0 (old operations still work)
- v0.6.0 will remove: Create, Create and Wait, Get By File

## Testing Checklist

- [ ] Transcribe operation works with all file types
- [ ] Transcribe handles errors correctly
- [ ] Transcribe respects timeout settings
- [ ] Get operation still works
- [ ] List operation still works
- [ ] Backward compatibility with old workflows
- [ ] Documentation updated
- [ ] Migration guide created

## Timeline

- **v0.5.0** (Next release): Add Transcribe, deprecate old ops
- **v0.6.0** (Future): Remove deprecated ops
